"""
Utility script to initialize and test the Supabase PostgreSQL database tables.
Usage:
    python backend/init_supabase.py
"""
import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, StudentProfile, FacultyProfile, Course,
    AttendanceSession, AttendanceRecord, AuditLog, UserRole, SessionStatus
)
from backend.app.security import get_password_hash
from datetime import datetime, timedelta
import secrets

def init_supabase():
    db_target = settings.POSTGRES_DATABASE_URL or settings.DATABASE_URL
    print(f"[PulseBeacon] Connecting to database...")
    print(f"[PulseBeacon] Target Host: {db_target.split('@')[-1] if '@' in db_target else db_target}")

    try:
        # Create all tables according to SQLAlchemy models
        print("[PulseBeacon] Creating tables in Supabase (users, profiles, courses, sessions, records, audit_logs)...")
        Base.metadata.create_all(bind=engine)
        print("[PulseBeacon] Tables created successfully!")

        db = SessionLocal()
        try:
            # Check if admin user exists
            admin = db.query(User).filter(User.email == "admin@university.edu").first()
            if not admin:
                print("[PulseBeacon] Seeding default university accounts into Supabase...")

                # Admin
                admin_user = User(
                    email="admin@university.edu",
                    hashed_password=get_password_hash("Admin@1234"),
                    full_name="Dr. Sarah Jenkins (Registrar)",
                    role=UserRole.ADMIN
                )
                db.add(admin_user)

                # Faculty
                faculty_user = User(
                    email="faculty@university.edu",
                    hashed_password=get_password_hash("Faculty@1234"),
                    full_name="Prof. Alan Turing",
                    role=UserRole.FACULTY
                )
                db.add(faculty_user)
                db.flush()

                fac_profile = FacultyProfile(
                    user_id=faculty_user.id,
                    employee_code="EMP-CS-0042",
                    department="Computer Science & Engineering",
                    designation="Associate Professor"
                )
                db.add(fac_profile)

                # Students
                sample_students = [
                    ("student1@university.edu", "Student@1234", "Alex Rivera", "CS2026-001", "Computer Science", 6),
                    ("student2@university.edu", "Student@1234", "Elena Rostova", "CS2026-002", "Computer Science", 6),
                    ("student3@university.edu", "Student@1234", "Marcus Vance", "CS2026-003", "Computer Science", 6),
                    ("student4@university.edu", "Student@1234", "Priya Sharma", "CS2026-004", "Computer Science", 6),
                    ("student5@university.edu", "Student@1234", "Liam O'Connor", "CS2026-005", "Computer Science", 6),
                ]
                for email, pwd, name, reg_no, dept, sem in sample_students:
                    s_user = User(
                        email=email,
                        hashed_password=get_password_hash(pwd),
                        full_name=name,
                        role=UserRole.STUDENT
                    )
                    db.add(s_user)
                    db.flush()
                    s_prof = StudentProfile(
                        user_id=s_user.id,
                        registration_number=reg_no,
                        department=dept,
                        semester=sem
                    )
                    db.add(s_prof)

                # Sample Courses
                c1 = Course(code="CS-401", title="Distributed Systems & Mobile BLE", department="Computer Science", credits=4)
                c2 = Course(code="CS-302", title="Operating Systems & Concurrency", department="Computer Science", credits=3)
                c3 = Course(code="CS-480", title="Network Security & Applied Cryptography", department="Computer Science", credits=3)
                db.add_all([c1, c2, c3])
                db.flush()

                # Initial Active Session
                now = datetime.utcnow()
                init_session = AttendanceSession(
                    session_code="SESS-" + secrets.token_hex(6).upper(),
                    course_id=c1.id,
                    faculty_id=fac_profile.id,
                    room_number="Lab 304 (Wireless IoT Lab)",
                    duration_minutes=60,
                    start_time=now,
                    end_time=now + timedelta(minutes=60),
                    status=SessionStatus.ACTIVE,
                    ble_service_uuid="0000FD2A-0000-1000-8000-00805F9B34FB",
                    ble_session_secret=secrets.token_hex(32),
                    ble_salt=secrets.token_hex(4),
                    rssi_threshold=-78.0
                )
                db.add(init_session)

                # Initial Audit Log
                audit = AuditLog(
                    action="DATABASE_INITIALIZED",
                    performed_by_user_id=admin_user.id,
                    target_entity="SUPABASE_POSTGRES",
                    target_id="INITIAL_BOOTSTRAP",
                    details="Supabase PostgreSQL database schemas and seed accounts initialized successfully."
                )
                db.add(audit)
                db.commit()
                print("[PulseBeacon] Database initialized and seeded with default courses, faculty, and students successfully!")
            else:
                print("[PulseBeacon] Database already contains initialized tables and records.")
        finally:
            db.close()

    except Exception as e:
        print(f"[PulseBeacon Error] Failed to connect to Supabase: {e}")
        print("\nTroubleshooting Tips:")
        print("1. If using a connection pooler on port 6543 (IPv4), use the pooler URI from Supabase settings.")
        print("2. Check that the database password has any special characters URL-encoded (e.g. * -> %2A).")
        print("3. Ensure your network allows outbound traffic to Supabase on port 5432 or 6543.")

if __name__ == "__main__":
    init_supabase()
