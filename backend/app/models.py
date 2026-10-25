import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, 
    Enum, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"

class SessionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CLOSED = "CLOSED"

class AttendanceStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    registration_number = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    semester = Column(Integer, default=1)
    device_identifier = Column(String(255), nullable=True)

    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("ClassEnrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student")

class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), default="Assistant Professor")

    user = relationship("User", back_populates="faculty_profile")
    sessions = relationship("AttendanceSession", back_populates="faculty")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    department = Column(String(100), nullable=False)
    credits = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship("ClassEnrollment", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="course", cascade="all, delete-orphan")

class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="enrollments")
    student = relationship("StudentProfile", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(64), unique=True, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty_profiles.id", ondelete="CASCADE"), nullable=False)
    room_number = Column(String(50), default="Lecture Hall 101")
    duration_minutes = Column(Integer, default=15)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)

    # BLE Parameters
    ble_service_uuid = Column(String(64), default="0000FD2A-0000-1000-8000-00805F9B34FB")
    ble_session_secret = Column(String(128), nullable=False)  # Shared secret for rotating payload HMAC
    ble_salt = Column(String(32), nullable=False)            # 4-byte hex salt for advertising payload
    rssi_threshold = Column(Float, default=-78.0)            # Cutoff threshold (approx 7-8m)

    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="sessions")
    faculty = relationship("FacultyProfile", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    nonces = relationship("BleNonceChallenge", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.VERIFIED, nullable=False)
    verification_method = Column(String(50), default="BLE_PROXIMITY_HMAC")
    
    # Proximity telemetry (for audit and anti-spoofing analysis)
    observed_rssi = Column(Float, nullable=True)
    estimated_distance_m = Column(Float, nullable=True)
    verification_nonce = Column(String(64), nullable=True)
    client_ip = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)

    # Manual override tracking
    override_reason = Column(Text, nullable=True)
    override_by_faculty_id = Column(Integer, ForeignKey("faculty_profiles.id"), nullable=True)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("StudentProfile", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
        Index("idx_session_student", "session_id", "student_id"),
    )

class BleNonceChallenge(Base):
    __tablename__ = "ble_nonce_challenges"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    nonce_hex = Column(String(64), index=True, nullable=False)
    window_timestamp = Column(Integer, nullable=False)  # Epoch timestamp / 30s
    expires_at = Column(DateTime, nullable=False)
    is_redeemed = Column(Boolean, default=False)
    redeemed_by_student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AttendanceSession", back_populates="nonces")

    __table_args__ = (
        UniqueConstraint("session_id", "nonce_hex", name="uq_session_nonce"),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    performed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_entity = Column(String(50), nullable=False)
    target_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
