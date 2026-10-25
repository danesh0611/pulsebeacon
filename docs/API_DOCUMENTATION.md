# PulseBeacon API Documentation

## Base URL
- Production: `https://api.pulsebeacon.university.edu/api`
- Local Development: `http://localhost:8000/api`
- Interactive OpenAPI Docs: `http://localhost:8000/api/docs`

---

## Authentication Endpoints

### 1. User Registration
`POST /api/auth/register`

**Request Body:**
```json
{
  "email": "student1@university.edu",
  "password": "SecurePassword123!",
  "full_name": "Alex Rivera",
  "role": "STUDENT",
  "registration_number": "CS2026-001",
  "department": "Computer Science & Engineering",
  "semester": 6
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "role": "STUDENT",
  "user_id": 2,
  "full_name": "Alex Rivera",
  "email": "student1@university.edu",
  "registration_or_emp_id": "CS2026-001"
}
```

---

### 2. User Login
`POST /api/auth/login`

**Request Body:**
```json
{
  "email": "faculty@university.edu",
  "password": "FacultyPassword123!"
}
```

---

## Faculty Endpoints

### 3. Create Attendance Session
`POST /api/faculty/sessions`  
*Requires `Authorization: Bearer <FACULTY_TOKEN>`*

**Request Body:**
```json
{
  "course_id": 1,
  "room_number": "Lab 304 - Wireless IoT Lab",
  "duration_minutes": 45,
  "rssi_threshold": -78.0
}
```

**Response (200 OK):**
```json
{
  "id": 101,
  "session_code": "SESS-CS401-A1B2C3",
  "course_id": 1,
  "faculty_id": 1,
  "room_number": "Lab 304 - Wireless IoT Lab",
  "duration_minutes": 45,
  "start_time": "2026-10-22T10:00:00Z",
  "end_time": "2026-10-22T10:45:00Z",
  "status": "ACTIVE",
  "ble_service_uuid": "0000FD2A-0000-1000-8000-00805F9B34FB",
  "ble_session_secret": "9a8b7c6d5e...",
  "ble_salt": "9F28D1B4",
  "rssi_threshold": -78.0,
  "course_code": "CS-401",
  "course_title": "Distributed Systems & Mobile BLE",
  "total_present": 0
}
```

---

### 4. Fetch Broadcast Token (for Faculty Phone BLE Transmitter)
`GET /api/faculty/sessions/{session_id}/broadcast-token`

**Response (200 OK):**
```json
{
  "session_id": 101,
  "session_code": "SESS-CS401-A1B2C3",
  "service_uuid": "0000FD2A-0000-1000-8000-00805F9B34FB",
  "payload_hex": "4FA12E8B0008F4219F28D1B4A9C4E201B78D65F3",
  "salt_hex": "9F28D1B4",
  "rssi_threshold": -78.0,
  "remaining_seconds": 2520,
  "refresh_interval_seconds": 30
}
```

---

### 5. Manual Attendance Override
`POST /api/faculty/records/manual-override`

**Request Body:**
```json
{
  "session_id": 101,
  "student_id": 3,
  "reason": "Hardware failure: student phone Bluetooth controller crashed; visual verification conducted."
}
```

---

## Student Endpoints

### 6. Get Active Sessions
`GET /api/student/active-sessions`  
*Requires `Authorization: Bearer <STUDENT_TOKEN>`*

---

### 7. Verify BLE Check-In
`POST /api/student/verify-ble-checkin`  
*Requires `Authorization: Bearer <STUDENT_TOKEN>`*

**Request Body:**
```json
{
  "session_id": 101,
  "ble_payload_hex": "4FA12E8B0008F4219F28D1B4A9C4E201B78D65F3",
  "observed_rssi": -65.4,
  "device_model": "Pixel 8 Pro"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "VERIFIED",
  "message": "Attendance recorded and verified successfully via BLE beacon challenge",
  "check_in_time": "2026-10-22T10:04:12Z",
  "student_name": "Alex Rivera",
  "registration_number": "CS2026-001",
  "course_title": "Distributed Systems & Mobile BLE",
  "estimated_distance_m": 1.65,
  "observed_rssi": -65.4
}
```

---

## Administrator Endpoints

### 8. Create Faculty or Student Account
`POST /api/admin/users`  
*Requires `Authorization: Bearer <ADMIN_TOKEN>`*

**Request Body (Student Example):**
```json
{
  "email": "maya.lin@university.edu",
  "password": "InitialPassword123!",
  "full_name": "Maya Lin",
  "role": "STUDENT",
  "registration_number": "CS2026-006",
  "department": "Computer Science & Engineering",
  "semester": 6
}
```

**Request Body (Faculty Example):**
```json
{
  "email": "robert.vance@university.edu",
  "password": "InitialPassword123!",
  "full_name": "Dr. Robert Vance",
  "role": "FACULTY",
  "employee_code": "EMP-CS-0088",
  "department": "Computer Science & Engineering",
  "designation": "Associate Professor"
}
```

---

### 9. List All Accounts
`GET /api/admin/users?role=STUDENT`  
*Requires `Authorization: Bearer <ADMIN_TOKEN>`*

---

### 10. Delete / Deactivate Account
`DELETE /api/admin/users/{user_id}`  
*Requires `Authorization: Bearer <ADMIN_TOKEN>`*

**Error Responses:**
- `400 Bad Request`: `BLE payload expired or timestamp desynchronized`
- `400 Bad Request`: `Signal strength too weak (-84.2 dBm). Move closer inside classroom.`
- `409 Conflict`: `Duplicate attendance: You have already checked in for this session`
