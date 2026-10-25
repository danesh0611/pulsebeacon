# Manual BLE Integration Testing Guide

This guide provides step-by-step instructions for verifying real Bluetooth Low Energy proximity attendance using **two physical Android smartphones** (or one phone and a laptop running the Web Dashboard).

---

## 1. Prerequisites
- **Phone A (Faculty Broadcaster)**: Android 12+ (API 31+) smartphone with Bluetooth LE peripheral advertising support (supported on Google Pixel, Samsung Galaxy S-series, OnePlus, etc.).
- **Phone B (Student Scanner)**: Android 8.0+ smartphone with BLE scanning capabilities.
- **Backend Server**: FastAPI running locally or deployed on a reachable LAN IP address (e.g. `http://192.168.1.100:8000`).

---

## 2. Configuration & Build
1. Open the `/android` directory in **Android Studio Hedgehog / Iguana / Koala**.
2. In `AttendanceRepository.kt`, update `BASE_URL`:
   ```kotlin
   const val BASE_URL = "http://192.168.1.100:8000/" // Set your LAN IP
   ```
3. Build and install the APK on both devices:
   ```bash
   ./gradlew assembleDebug
   adb -s <DEVICE_A_SERIAL> install app/build/outputs/apk/debug/app-debug.apk
   adb -s <DEVICE_B_SERIAL> install app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 3. Step-by-Step Test Execution

### Step 1: Start Faculty Session (Phone A)
1. Launch PulseBeacon on **Phone A**.
2. Tap **Faculty Mode** in the top-right corner.
3. Tap **Start BLE Attendance Beacon**.
4. When prompted by Android, grant **Nearby devices / Bluetooth Advertise** permissions.
5. Verify the screen displays:
   - Green pulsing status: `BROADCASTING ACTIVE`
   - Countdown timer running (e.g. 30:00)
   - Live 20-byte Service Data payload updating every 30 seconds.

### Step 2: Student Proximity Check-In (Phone B)
1. Launch PulseBeacon on **Phone B** (Student mode).
2. Tap **Grant Permissions** to approve **Bluetooth Scan** and **Location** (required on Android for BLE discovery).
3. Under **Active Classroom Sessions**, observe the active lecture broadcast appears.
4. Tap **Mark Attendance via BLE**.
5. Observe the radar scanning wave:
   - Within 2 to 5 seconds, Phone B detects Phone A's beacon with Service UUID `0xFD2A`.
   - The detected beacon card displays Phone A's RSSI (e.g. `-62 dBm`) and distance estimate (e.g. `~1.4m`).
6. Tap **Confirm Proximity & Mark Attendance**.
7. Observe the success screen:
   - Green checkmark: "Attendance Verified!"
   - Registration number and timestamp confirmation.

### Step 3: Verify Live Faculty Update (Phone A)
1. Look at Phone A's screen.
2. In the **Live Attendees** list, Phone B's student name and registration number appear automatically within 3 seconds.
3. The observed RSSI and distance estimate are recorded.

### Step 4: Verify Anti-Abuse Protections
- **Duplicate Prevention Test**: On Phone B, attempt to tap "Mark Attendance" again for the same session. Verify the app displays an HTTP 409 rejection: `Duplicate attendance already recorded`.
- **Distance Cutoff Test**: Walk Phone B 15 meters away down a hallway until RSSI drops below `-78 dBm`. Attempt check-in on a new test session. Verify the app rejects the check-in with `Signal too weak: move closer inside the classroom`.
- **Session Expiry Test**: Close the session on Phone A. Attempt check-in on Phone B. Verify rejection with `Session has expired or closed`.

---

## 4. Troubleshooting
| Issue | Cause | Solution |
|---|---|---|
| "Device does not support BLE advertising" | Phone A's hardware does not support peripheral mode | Test using a newer Android device or use the Web Dashboard simulation |
| Scan times out after 15s | Bluetooth disabled or location service turned off | Enable Bluetooth & Precise Location in Android Settings |
| "Connection Refused" | Phone cannot reach backend server IP | Ensure both phones and the backend host are connected to the same Wi-Fi network |
