import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ble_crypto import BleCryptoService

client = TestClient(app)

def get_auth_token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_health_check():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ONLINE"

def test_auth_login():
    res = client.post("/api/auth/login", json={
        "email": "faculty@university.edu",
        "password": "Faculty@1234"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "FACULTY"

def test_full_attendance_end_to_end_flow():
    # 1. Faculty logs in
    fac_token = get_auth_token("faculty@university.edu", "Faculty@1234")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    # 2. Faculty creates a new session
    create_res = client.post(
        "/api/faculty/sessions",
        headers=fac_headers,
        json={"course_id": 1, "room_number": "Test Hall 101", "duration_minutes": 20, "rssi_threshold": -80.0}
    )
    assert create_res.status_code == 200
    session_data = create_res.json()
    session_id = session_data["id"]

    # 3. Faculty phone gets the active BLE broadcast token
    broadcast_res = client.get(f"/api/faculty/sessions/{session_id}/broadcast-token", headers=fac_headers)
    assert broadcast_res.status_code == 200
    broadcast_data = broadcast_res.json()
    advertised_payload = broadcast_data["payload_hex"]
    assert len(advertised_payload) == 40

    # 4. Student logs in
    stu_token = get_auth_token("student3@university.edu", "Student@1234")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 5. Student fetches active sessions
    active_sessions_res = client.get("/api/student/active-sessions", headers=stu_headers)
    assert active_sessions_res.status_code == 200
    active_list = active_sessions_res.json()
    assert any(s["id"] == session_id for s in active_list)

    # 6. Student sends verified check-in with the received BLE advertisement payload
    checkin_res = client.post(
        "/api/student/verify-ble-checkin",
        headers=stu_headers,
        json={
            "session_id": session_id,
            "ble_payload_hex": advertised_payload,
            "observed_rssi": -65.0,
            "device_model": "Pixel 8 Pro"
        }
    )
    assert checkin_res.status_code == 200
    checkin_data = checkin_res.json()
    assert checkin_data["success"] is True
    assert checkin_data["status"] == "VERIFIED"
    assert checkin_data["registration_number"] == "CS2026-003"

    # 7. Duplicate Check-in Prevention: Submitting again MUST be rejected with HTTP 409
    dup_res = client.post(
        "/api/student/verify-ble-checkin",
        headers=stu_headers,
        json={
            "session_id": session_id,
            "ble_payload_hex": advertised_payload,
            "observed_rssi": -64.0
        }
    )
    assert dup_res.status_code == 409
    assert "duplicate" in dup_res.json()["detail"].lower()

    # 8. Faculty views live records - student appears immediately
    records_res = client.get(f"/api/faculty/sessions/{session_id}/records", headers=fac_headers)
    assert records_res.status_code == 200
    records = records_res.json()
    assert any(r["registration_number"] == "CS2026-003" for r in records)

    # 9. CSV Export test
    csv_res = client.get(f"/api/faculty/sessions/{session_id}/export-csv", headers=fac_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "CS2026-003" in csv_res.text
