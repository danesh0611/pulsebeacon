# PulseBeacon: Bluetooth Low Energy (BLE) Smart Attendance System

PulseBeacon is a production-quality, hardware-free smart attendance verification system engineered for university lecture halls and laboratories. It leverages standard faculty and student smartphones and laptops with zero custom external modules (no Arduino, ESP32, RFID, or NFC tags required).

---

## 🏛️ System Architecture

```
                                 [FASTAPI BACKEND]
                        PostgreSQL / SQLAlchemy 2.0 / JWT
                                        ▲
                       HTTPS API        │        HTTPS API
                   + WebSocket Sync     │     + WebSocket Sync
                          │             │             │
                          ▼             ▼             ▼
             [FACULTY ANDROID / WEB]            [STUDENT ANDROID]
             * Creates session                  * Discovers 0xFD2A
             * BLE Advertiser: 0xFD2A           * Scans RSSI distance
             * Transmits 20B Rolling HMAC       * Submits challenge
                     │                                ▲
                     └─────── BLE Radio Waves ────────┘
                          (30s Rolling Epoch Window)
```

1. **Faculty Phone / Laptop**: Creates an attendance session via the backend. The faculty device broadcasts a non-connectable BLE advertisement frame with 16-bit Service UUID `0xFD2A` containing a 20-byte rolling payload (Session Tag, Epoch Window, Salt, HMAC slice).
2. **Student Phone**: The student taps "Mark Attendance". The app scans for the instructor's beacon, parses the 20-byte service data, measures RSSI signal strength, and forwards the challenge to the backend.
3. **Backend Validation**: The server validates the session status, time-window drift ($\le 45$s), duplicate submission checks, and RSSI boundary before recording attendance in the database.
4. **Immediate Sync**: Live attendance immediately registers on the instructor's dashboard.

---

## 📁 Repository Structure

```
pulsebeacon/
├── android/                   # Android Studio Project (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Android 12+ BLE & Location permissions
│   │   │   └── java/com/pulsebeacon/attendance/
│   │   │       ├── ble/              # BleAdvertiser.kt, BleScanner.kt, BleProtocolConstants.kt
│   │   │       ├── data/             # Retrofit API, EncryptedSharedPreferences
│   │   │       ├── ui/               # Jetpack Compose Screens (Radar, Broadcast, Dashboard)
│   │   │       └── MainActivity.kt
│   │   └── build.gradle.kts
│   └── settings.gradle.kts
│
├── backend/                   # Python 3.12+ FastAPI Microservice
│   ├── app/
│   │   ├── main.py            # FastAPI app, WebSocket manager, seed initial data
│   │   ├── config.py          # Pydantic Settings
│   │   ├── database.py        # SQLAlchemy engine & session factory
│   │   ├── models.py          # User, Student, Faculty, Session, AttendanceRecord, AuditLog
│   │   ├── schemas.py         # Pydantic v2 schemas
│   │   ├── ble_crypto.py      # 20-byte AD frame encoding/decoding, HMAC-SHA256, path-loss
│   │   ├── security.py        # bcrypt hashing, JWT tokens, RBAC dependencies
│   │   └── routers/           # auth.py, faculty.py, student.py, admin.py
│   ├── alembic/               # Database migrations
│   ├── tests/                 # pytest test suite (auth, attendance flow, BLE security)
│   ├── Dockerfile
│   └── requirements.txt
│
├── docs/                      # Technical Documentation
│   ├── BLE_PROTOCOL_SPEC.md   # 31-byte frame layout, byte masks, path-loss math
│   ├── SECURITY_AND_THREAT_MODEL.md # Relay attack analysis, limitations, defenses
│   ├── MANUAL_TESTING_GUIDE.md # 2-phone physical test walkthrough
│   └── API_DOCUMENTATION.md   # OpenAPI endpoints and payload examples
│
├── src/                       # React 19 + TypeScript + Vite + Tailwind CSS Web Dashboard
│   ├── components/            # FacultyView, StudentView, AdminView, BleProtocolLab, Header
│   ├── services/              # store.ts (reactive state + persistence), crypto.ts (Web Crypto)
│   ├── types.ts
│   └── App.tsx
│
├── docker-compose.yml         # Multi-container Postgres, FastAPI, and Web orchestration
├── .env.example
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### Option 1: Docker Compose (All-in-One)
```bash
docker-compose up --build
```
- Web Dashboard: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/api/docs`

### Option 2: Running Backend Locally
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Option 3: Running Automated Backend Tests
```bash
pytest backend/tests -v
```

### Option 4: Building the Android App
Open the `/android` directory in Android Studio. Ensure Bluetooth and Location permissions are enabled on your test device.

---

## 🛡️ Cybersecurity Guarantees & Limitations
- **Rolling HMAC Nonce**: Tokens rotate every 30 seconds; replay attacks outside this window are mathematically rejected.
- **Strict Database Uniqueness**: One student can hold at most one verified record per session (`UNIQUE(session_id, student_id)`).
- **Proximity vs Presence**: BLE proves that an authorized device was within RF range ($\sim 7.5\text{m}$). Instructors retain audited manual override capabilities for edge cases.

---

## 📜 License
Apache-2.0
