import hashlib
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from backend.app.database import get_db
from backend.app.models import (
    User, UserRole, StudentProfile, AttendanceSession, AttendanceRecord,
    SessionStatus, AttendanceStatus, AuditLog, Course
)
from backend.app.schemas import (
    ActiveSessionForStudent, BleCheckInRequest, BleCheckInResponse, AttendanceRecordOut
)
from backend.app.security import get_current_user, require_roles
from backend.app.ble_crypto import BleCryptoService

router = APIRouter(prefix="/student", tags=["Student"])

@router.get("/active-sessions", response_model=List[ActiveSessionForStudent])
def get_active_sessions(
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")

    now = datetime.utcnow()
    # Find all sessions that are currently marked ACTIVE and before end_time
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.end_time > now
    ).all()

    results = []
    for s in sessions:
        # Check if student already checked in
        checked_in = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.student_id == student_profile.id,
            AttendanceRecord.status.in_([AttendanceStatus.VERIFIED, AttendanceStatus.MANUAL_OVERRIDE])
        ).first() is not None

        # Calculate 4-byte session tag hex for discovery filtering
        tag_hex = hashlib.sha256(s.session_code.encode("utf-8")).digest()[:4].hex().upper()

        faculty_name = s.faculty.user.full_name if s.faculty and s.faculty.user else "Faculty"

        results.append(ActiveSessionForStudent(
            id=s.id,
            session_code=s.session_code,
            course_code=s.course.code if s.course else "COURSE",
            course_title=s.course.title if s.course else "Subject",
            faculty_name=faculty_name,
            room_number=s.room_number,
            start_time=s.start_time,
            end_time=s.end_time,
            ble_service_uuid=s.ble_service_uuid,
            ble_session_tag_hex=tag_hex,
            rssi_threshold=s.rssi_threshold,
            already_checked_in=checked_in
        ))

    return results

@router.post("/verify-ble-checkin", response_model=BleCheckInResponse)
def verify_ble_checkin(
    req: BleCheckInRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")

    session = db.query(AttendanceSession).filter(AttendanceSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    # 1. Session status and lifetime check
    now = datetime.utcnow()
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Session is {session.status.value.lower()}")
    if now > session.end_time:
        session.status = SessionStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="Attendance session has expired")

    # 2. Check for duplicate attendance submission
    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == student_profile.id
    ).first()

    if existing_record:
        if existing_record.status in [AttendanceStatus.VERIFIED, AttendanceStatus.MANUAL_OVERRIDE]:
            raise HTTPException(
                status_code=409, 
                detail="Duplicate attendance: You have already checked in for this session"
            )

    # 3. Cryptographic BLE advertisement payload verification
    is_valid, reason, window_idx = BleCryptoService.verify_advertising_payload(
        payload_hex=req.ble_payload_hex,
        session_code=session.session_code,
        session_secret=session.ble_session_secret,
        salt_hex=session.ble_salt,
        tolerance_windows=1  # allow +/- 30-45 seconds clock drift
    )

    if not is_valid:
        # Log failed check-in attempt for audit
        audit = AuditLog(
            action="CHECKIN_SECURITY_FAILURE",
            performed_by_user_id=current_user.id,
            target_entity="ATTENDANCE_SESSION",
            target_id=str(session.id),
            details=f"Verification failed: {reason}. Payload: {req.ble_payload_hex}",
            ip_address=request.client.host if request.client else None
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=400, detail=f"BLE verification failed: {reason}")

    # 4. Proximity & RSSI validation
    estimated_distance = BleCryptoService.estimate_distance(
        rssi=req.observed_rssi,
        tx_power_1m=-59.0,
        path_loss_exponent=2.4
    )

    if req.observed_rssi < session.rssi_threshold:
        # Distance too far / signal too weak for the lecture hall boundary
        raise HTTPException(
            status_code=400,
            detail=f"Signal strength too weak ({req.observed_rssi} dBm, estimated ~{estimated_distance}m). Please move closer inside the classroom."
        )

    # 5. Insert Attendance Record
    record = AttendanceRecord(
        session_id=session.id,
        student_id=student_profile.id,
        check_in_time=now,
        status=AttendanceStatus.VERIFIED,
        verification_method="BLE_PROXIMITY_HMAC_WINDOW",
        observed_rssi=req.observed_rssi,
        estimated_distance_m=estimated_distance,
        verification_nonce=req.ble_payload_hex[-16:],
        client_ip=request.client.host if request.client else None,
        user_agent=req.device_model or request.headers.get("user-agent", "Android-PulseBeacon")
    )

    try:
        db.add(record)
        audit = AuditLog(
            action="STUDENT_CHECKIN_VERIFIED",
            performed_by_user_id=current_user.id,
            target_entity="ATTENDANCE_RECORD",
            target_id=f"Session {session.id}",
            details=f"Verified {student_profile.registration_number} (RSSI: {req.observed_rssi} dBm, Est: {estimated_distance}m)"
        )
        db.add(audit)
        db.commit()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Duplicate check-in detected by database uniqueness constraint"
        )

    return BleCheckInResponse(
        success=True,
        status=record.status,
        message="Attendance recorded and verified successfully via BLE beacon challenge",
        check_in_time=record.check_in_time,
        student_name=current_user.full_name,
        registration_number=student_profile.registration_number,
        course_title=session.course.title if session.course else "Class",
        estimated_distance_m=estimated_distance,
        observed_rssi=req.observed_rssi
    )

@router.get("/attendance-history")
def get_student_history(
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_profile.id
    ).order_by(AttendanceRecord.check_in_time.desc()).all()

    # Calculate statistics
    total_attended = len([r for r in records if r.status in [AttendanceStatus.VERIFIED, AttendanceStatus.MANUAL_OVERRIDE]])
    total_conducted = db.query(AttendanceSession).count()
    attendance_rate = round((total_attended / max(1, total_conducted)) * 100, 1)

    history = []
    for r in records:
        history.append({
            "id": r.id,
            "session_id": r.session_id,
            "course_code": r.session.course.code if r.session and r.session.course else "N/A",
            "course_title": r.session.course.title if r.session and r.session.course else "N/A",
            "room_number": r.session.room_number if r.session else "N/A",
            "check_in_time": r.check_in_time,
            "status": r.status,
            "observed_rssi": r.observed_rssi,
            "estimated_distance_m": r.estimated_distance_m,
            "verification_method": r.verification_method,
            "override_reason": r.override_reason
        })

    return {
        "student_name": current_user.full_name,
        "registration_number": student_profile.registration_number,
        "department": student_profile.department,
        "semester": student_profile.semester,
        "total_attended": total_attended,
        "total_conducted": total_conducted,
        "overall_percentage": attendance_rate,
        "records": history
    }
