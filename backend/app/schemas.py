from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from backend.app.models import UserRole, SessionStatus, AttendanceStatus

# --- Authentication Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    full_name: str
    email: str
    registration_or_emp_id: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[UserRole] = None
    exp: Optional[int] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: UserRole
    # Profile specific
    registration_number: Optional[str] = None  # for student
    employee_code: Optional[str] = None        # for faculty
    department: str = "Computer Science and Engineering"
    semester: Optional[int] = 1

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: UserRole
    registration_number: Optional[str] = None  # required if STUDENT
    employee_code: Optional[str] = None        # required if FACULTY
    department: str = "Computer Science and Engineering"
    semester: Optional[int] = 1
    designation: Optional[str] = "Assistant Professor"

class AdminUserListItem(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    identifier_code: str
    department: str
    semester: Optional[int] = None
    designation: Optional[str] = None
    is_active: bool
    created_at: datetime

# --- Course Schemas ---
class CourseCreate(BaseModel):
    code: str
    title: str
    department: str
    credits: int = 3

class CourseOut(BaseModel):
    id: int
    code: str
    title: str
    department: str
    credits: int

    class Config:
        from_attributes = True

# --- Attendance Session Schemas ---
class SessionCreate(BaseModel):
    course_id: int
    room_number: str = "Lecture Hall 101"
    duration_minutes: int = Field(15, ge=2, le=180)
    rssi_threshold: float = Field(-78.0, description="RSSI cutoff in dBm")

class SessionOut(BaseModel):
    id: int
    session_code: str
    course_id: int
    faculty_id: int
    room_number: str
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    status: SessionStatus
    ble_service_uuid: str
    ble_session_secret: str
    ble_salt: str
    rssi_threshold: float
    created_at: datetime
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    total_present: Optional[int] = 0

    class Config:
        from_attributes = True

class ActiveSessionForStudent(BaseModel):
    id: int
    session_code: str
    course_code: str
    course_title: str
    faculty_name: str
    room_number: str
    start_time: datetime
    end_time: datetime
    ble_service_uuid: str
    ble_session_tag_hex: str
    rssi_threshold: float
    already_checked_in: bool

# --- Attendance Check-in Schemas ---
class BleCheckInRequest(BaseModel):
    session_id: int
    ble_payload_hex: str = Field(..., description="20-byte hex payload received from faculty BLE advertisement")
    observed_rssi: float = Field(..., description="Received Signal Strength Indication (RSSI) in dBm")
    device_model: Optional[str] = None

class BleCheckInResponse(BaseModel):
    success: bool
    status: AttendanceStatus
    message: str
    check_in_time: datetime
    student_name: str
    registration_number: str
    course_title: str
    estimated_distance_m: float
    observed_rssi: float

class ManualOverrideRequest(BaseModel):
    session_id: int
    student_id: int
    reason: str = Field(..., min_length=5, description="Audited explanation for physical manual check-in")

# --- Attendance Record Schemas ---
class AttendanceRecordOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: str
    registration_number: str
    check_in_time: datetime
    status: AttendanceStatus
    verification_method: str
    observed_rssi: Optional[float]
    estimated_distance_m: Optional[float]
    override_reason: Optional[str] = None

    class Config:
        from_attributes = True

# --- Dashboard & Audit ---
class AuditLogOut(BaseModel):
    id: int
    action: str
    performed_by_name: Optional[str]
    target_entity: str
    target_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class DashboardStatsOut(BaseModel):
    total_students: int
    total_faculty: int
    total_courses: int
    total_sessions: int
    total_checkins: int
    overall_attendance_rate: float
