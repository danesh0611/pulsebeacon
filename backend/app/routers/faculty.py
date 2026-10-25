import csv
import io
import secrets
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import (
    User, UserRole, FacultyProfile, StudentProfile, Course, 
    AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus, AuditLog
)
from backend.app.schemas import (
    CourseOut, SessionCreate, SessionOut, AttendanceRecordOut, ManualOverrideRequest
)
from backend.app.security import get_current_user, require_roles
from backend.app.ble_crypto import BleCryptoService

router = APIRouter(prefix="/faculty", tags=["Faculty"])

@router.get("/courses", response_model=List[CourseOut])
def get_faculty_courses(
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    courses = db.query(Course).all()
    return courses

@router.post("/sessions", response_model=SessionOut)
def create_session(
    req: SessionCreate,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    faculty_profile = current_user.faculty_profile
    if not faculty_profile:
        raise HTTPException(status_code=400, detail="Faculty profile not found for user")

    course = db.query(Course).filter(Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Generate unique session identifier, cryptographic secret, and salt
    session_code = secrets.token_hex(16)
    ble_secret = secrets.token_hex(32)
    ble_salt = secrets.token_hex(4)  # 4 bytes hex = 8 chars

    start_time = datetime.utcnow()
    end_time = start_time + timedelta(minutes=req.duration_minutes)

    session = AttendanceSession(
        session_code=session_code,
        course_id=course.id,
        faculty_id=faculty_profile.id,
        room_number=req.room_number,
        duration_minutes=req.duration_minutes,
        start_time=start_time,
        end_time=end_time,
        status=SessionStatus.ACTIVE,
        ble_service_uuid="0000FD2A-0000-1000-8000-00805F9B34FB",
        ble_session_secret=ble_secret,
        ble_salt=ble_salt,
        rssi_threshold=req.rssi_threshold
    )
    db.add(session)
    db.flush()

    audit = AuditLog(
        action="SESSION_CREATE",
        performed_by_user_id=current_user.id,
        target_entity="ATTENDANCE_SESSION",
        target_id=str(session.id),
        details=f"Created session for {course.code} in {req.room_number} (Duration: {req.duration_minutes}m)"
    )
    db.add(audit)
    db.commit()
    db.refresh(session)

    return SessionOut(
        id=session.id,
        session_code=session.session_code,
        course_id=session.course_id,
        faculty_id=session.faculty_id,
        room_number=session.room_number,
        duration_minutes=session.duration_minutes,
        start_time=session.start_time,
        end_time=session.end_time,
        status=session.status,
        ble_service_uuid=session.ble_service_uuid,
        ble_session_secret=session.ble_session_secret,
        ble_salt=session.ble_salt,
        rssi_threshold=session.rssi_threshold,
        created_at=session.created_at,
        course_code=course.code,
        course_title=course.title,
        total_present=0
    )

@router.get("/sessions", response_model=List[SessionOut])
def list_faculty_sessions(
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    faculty_profile = current_user.faculty_profile
    query = db.query(AttendanceSession)
    if current_user.role == UserRole.FACULTY and faculty_profile:
        query = query.filter(AttendanceSession.faculty_id == faculty_profile.id)
    
    sessions = query.order_by(AttendanceSession.created_at.desc()).all()
    results = []
    now = datetime.utcnow()
    for s in sessions:
        # Check automatic expiry
        if s.status == SessionStatus.ACTIVE and now > s.end_time:
            s.status = SessionStatus.EXPIRED
            db.add(s)

        total_present = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status.in_([AttendanceStatus.VERIFIED, AttendanceStatus.MANUAL_OVERRIDE])
        ).count()

        results.append(SessionOut(
            id=s.id,
            session_code=s.session_code,
            course_id=s.course_id,
            faculty_id=s.faculty_id,
            room_number=s.room_number,
            duration_minutes=s.duration_minutes,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status,
            ble_service_uuid=s.ble_service_uuid,
            ble_session_secret=s.ble_session_secret,
            ble_salt=s.ble_salt,
            rssi_threshold=s.rssi_threshold,
            created_at=s.created_at,
            course_code=s.course.code if s.course else None,
            course_title=s.course.title if s.course else None,
            total_present=total_present
        ))
    db.commit()
    return results

@router.get("/sessions/{session_id}/broadcast-token")
def get_session_broadcast_token(
    session_id: int,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.utcnow()
    if session.status != SessionStatus.ACTIVE or now > session.end_time:
        raise HTTPException(status_code=400, detail="Session is not currently active")

    # Generate current 20-byte rolling payload for the faculty phone to advertise
    current_payload_hex = BleCryptoService.generate_advertising_payload_hex(
        session_code=session.session_code,
        session_secret=session.ble_session_secret,
        salt_hex=session.ble_salt
    )

    remaining_seconds = max(0, int((session.end_time - now).total_seconds()))

    return {
        "session_id": session.id,
        "session_code": session.session_code,
        "service_uuid": session.ble_service_uuid,
        "payload_hex": current_payload_hex,
        "salt_hex": session.ble_salt,
        "rssi_threshold": session.rssi_threshold,
        "remaining_seconds": remaining_seconds,
        "refresh_interval_seconds": 30
    }

@router.post("/sessions/{session_id}/close", response_model=SessionOut)
def close_session(
    session_id: int,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.CLOSED
    session.end_time = datetime.utcnow()
    
    audit = AuditLog(
        action="SESSION_CLOSE",
        performed_by_user_id=current_user.id,
        target_entity="ATTENDANCE_SESSION",
        target_id=str(session.id),
        details=f"Faculty closed session {session.id} ({session.course.code})"
    )
    db.add(audit)
    db.commit()
    db.refresh(session)

    total_present = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status.in_([AttendanceStatus.VERIFIED, AttendanceStatus.MANUAL_OVERRIDE])
    ).count()

    return SessionOut(
        id=session.id,
        session_code=session.session_code,
        course_id=session.course_id,
        faculty_id=session.faculty_id,
        room_number=session.room_number,
        duration_minutes=session.duration_minutes,
        start_time=session.start_time,
        end_time=session.end_time,
        status=session.status,
        ble_service_uuid=session.ble_service_uuid,
        ble_session_secret=session.ble_session_secret,
        ble_salt=session.ble_salt,
        rssi_threshold=session.rssi_threshold,
        created_at=session.created_at,
        course_code=session.course.code,
        course_title=session.course.title,
        total_present=total_present
    )

@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def get_session_attendance_records(
    session_id: int,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).order_by(AttendanceRecord.check_in_time.desc()).all()
    results = []
    for r in records:
        student_user = r.student.user if r.student else None
        results.append(AttendanceRecordOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=student_user.full_name if student_user else "Unknown",
            registration_number=r.student.registration_number if r.student else "N/A",
            check_in_time=r.check_in_time,
            status=r.status,
            verification_method=r.verification_method,
            observed_rssi=r.observed_rssi,
            estimated_distance_m=r.estimated_distance_m,
            override_reason=r.override_reason
        ))
    return results

@router.post("/records/manual-override", response_model=AttendanceRecordOut)
def manual_attendance_override(
    req: ManualOverrideRequest,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if record already exists
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == req.session_id,
        AttendanceRecord.student_id == req.student_id
    ).first()

    faculty_id = current_user.faculty_profile.id if current_user.faculty_profile else None

    if record:
        record.status = AttendanceStatus.MANUAL_OVERRIDE
        record.override_reason = req.reason
        record.override_by_faculty_id = faculty_id
    else:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=student.id,
            check_in_time=datetime.utcnow(),
            status=AttendanceStatus.MANUAL_OVERRIDE,
            verification_method="MANUAL_FACULTY_OVERRIDE",
            override_reason=req.reason,
            override_by_faculty_id=faculty_id
        )
        db.add(record)

    audit = AuditLog(
        action="MANUAL_ATTENDANCE_OVERRIDE",
        performed_by_user_id=current_user.id,
        target_entity="ATTENDANCE_RECORD",
        target_id=f"Session {session.id} - Student {student.registration_number}",
        details=f"Manual attendance override by {current_user.full_name}. Reason: {req.reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return AttendanceRecordOut(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        student_name=student.user.full_name if student.user else "Unknown",
        registration_number=student.registration_number,
        check_in_time=record.check_in_time,
        status=record.status,
        verification_method=record.verification_method,
        observed_rssi=record.observed_rssi,
        estimated_distance_m=record.estimated_distance_m,
        override_reason=record.override_reason
    )

@router.get("/sessions/{session_id}/export-csv")
def export_session_csv(
    session_id: int,
    current_user: User = Depends(require_roles(UserRole.FACULTY, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Registration Number", "Student Name", "Course Code",
        "Course Title", "Room", "Check-in Timestamp (UTC)", "Status",
        "Verification Method", "Observed RSSI (dBm)", "Estimated Distance (m)", "Audit Reason"
    ])

    for r in records:
        student_name = r.student.user.full_name if r.student and r.student.user else "N/A"
        reg_no = r.student.registration_number if r.student else "N/A"
        writer.writerow([
            r.id,
            reg_no,
            student_name,
            session.course.code,
            session.course.title,
            session.room_number,
            r.check_in_time.isoformat(),
            r.status.value,
            r.verification_method,
            r.observed_rssi if r.observed_rssi is not None else "",
            r.estimated_distance_m if r.estimated_distance_m is not None else "",
            r.override_reason or ""
        ])

    csv_data = output.getvalue()
    filename = f"Attendance_{session.course.code}_{session.start_time.strftime('%Y%m%d_%H%M')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
