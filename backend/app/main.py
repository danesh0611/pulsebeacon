import secrets
from datetime import datetime, timedelta
from typing import List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, StudentProfile, FacultyProfile, Course, 
    AttendanceSession, AttendanceRecord, UserRole, SessionStatus, AttendanceStatus
)
from backend.app.security import get_password_hash
from backend.app.routers import auth, faculty, student, admin

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## PulseBeacon: BLE-Based Proximity Smart Attendance System API
    
    Enterprise-grade proximity verification system using Bluetooth Low Energy (BLE)
    advertisement frames with rotating cryptographic HMAC challenges for physical presence
    verification in college classrooms.

    ### Features:
    * **BLE Proximity Verification**: Validates 20-byte Service Data AD frame against rolling window HMAC.
    * **Anti-Replay & Path Loss**: Log-distance path loss estimation + rolling time window tolerance.
    * **Role-Based Access Control**: Student, Faculty, and Admin interfaces.
    * **Live WebSocket Broadcast**: Instant push of student check-ins to faculty dashboard.
    * **Audited Manual Overrides**: Traceable attendance corrections.
    """,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty.router, prefix=settings.API_V1_PREFIX)
app.include_router(student.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

# WebSocket Connection Manager for Live Dashboard Sync
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_session(self, session_id: int, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

@app.websocket("/ws/session/{session_id}")
async def websocket_session_attendance(websocket: WebSocket, session_id: int):
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            # Keep-alive ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": f"{settings.API_V1_PREFIX}/docs",
        "ble_service_uuid": "0000FD2A-0000-1000-8000-00805F9B34FB",
        "verification_mode": "ROTATING_HMAC_PROXIMITY"
    }

# Seed default database data on startup if empty
def seed_initial_data():
    db = SessionLocal()
    try:
        # Check if users exist
        if db.query(User).count() == 0:
            print("[PulseBeacon] Seeding initial database with sample faculty, students, and courses...")
            
            # 1. Admin
            admin_user = User(
                email="admin@university.edu",
                hashed_password=get_password_hash("Admin@1234"),
                full_name="Dr. Sarah Jenkins (Registrar)",
                role=UserRole.ADMIN
            )
            db.add(admin_user)

            # 2. Faculty
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

            # 3. Students
            students_data = [
                ("student1@university.edu", "Student@1234", "Alex Rivera", "CS2026-001", "Computer Science", 6),
                ("student2@university.edu", "Student@1234", "Elena Rostova", "CS2026-002", "Computer Science", 6),
                ("student3@university.edu", "Student@1234", "Marcus Vance", "CS2026-003", "Computer Science", 6),
                ("student4@university.edu", "Student@1234", "Priya Sharma", "CS2026-004", "Computer Science", 6),
                ("student5@university.edu", "Student@1234", "Liam O'Connor", "CS2026-005", "Computer Science", 6),
            ]
            student_profiles = []
            for email, pwd, name, reg_no, dept, sem in students_data:
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
                student_profiles.append(s_prof)

            # 4. Courses
            courses = [
                Course(code="CS-401", title="Distributed Computing & BLE Systems", department="Computer Science", credits=4),
                Course(code="CS-302", title="Operating Systems & Concurrency", department="Computer Science", credits=3),
                Course(code="CS-480", title="Network Security & Cryptography", department="Computer Science", credits=3)
            ]
            for c in courses:
                db.add(c)
            db.flush()

            # 5. Create an initial active session for immediate testing
            now = datetime.utcnow()
            session = AttendanceSession(
                session_code="SESS-" + secrets.token_hex(8).upper(),
                course_id=courses[0].id,
                faculty_id=fac_profile.id,
                room_number="Lab 304 - Wireless Systems",
                duration_minutes=45,
                start_time=now,
                end_time=now + timedelta(minutes=45),
                status=SessionStatus.ACTIVE,
                ble_service_uuid="0000FD2A-0000-1000-8000-00805F9B34FB",
                ble_session_secret=secrets.token_hex(32),
                ble_salt=secrets.token_hex(4),
                rssi_threshold=-78.0
            )
            db.add(session)
            db.flush()

            # Add two initial check-ins
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=student_profiles[0].id,
                check_in_time=now - timedelta(minutes=10),
                status=AttendanceStatus.VERIFIED,
                verification_method="BLE_PROXIMITY_HMAC_WINDOW",
                observed_rssi=-62.5,
                estimated_distance_m=1.35
            ))
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=student_profiles[1].id,
                check_in_time=now - timedelta(minutes=8),
                status=AttendanceStatus.VERIFIED,
                verification_method="BLE_PROXIMITY_HMAC_WINDOW",
                observed_rssi=-69.0,
                estimated_distance_m=2.45
            ))

            db.commit()
            print("[PulseBeacon] Initial seed data created successfully.")
    finally:
        db.close()

seed_initial_data()
