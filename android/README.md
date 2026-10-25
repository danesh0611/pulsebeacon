# PulseBeacon - Native Android BLE Attendance App

This directory contains the production-ready native Android project for **PulseBeacon**, implemented in modern **Kotlin** and **Jetpack Compose**.

## Why the Native Android App?
Web browsers (W3C Web Bluetooth) enforce strict sandboxing:
- Browsers cannot advertise (phones cannot act as BLE beacons to broadcast rolling attendance tags).
- Browsers cannot prompt for Bluetooth permission on page load (requires manual button click every time).
- iOS Safari completely blocks Web Bluetooth.

The native Android app gives you **100% full hardware BLE capabilities**:
- **Automatic System Permission Dialog**: On app launch, Android prompts the user: *"Allow PulseBeacon to find, connect to, and determine the relative position of nearby devices?"*
- **BLE Advertiser (Faculty Mode)**: Broadcasts rolling 20-byte HMAC-SHA256 packets under Service UUID `0xFD2A` with 30-second epoch rotations.
- **BLE Scanner (Student Mode)**: Scans low-latency channels with hardware UUID filters and computes proximity distance using the log-distance path loss formula: `d = 10^((TxPower - RSSI) / (10 * n))`.

---

## Project Structure

```
android/
├── app/
│   ├── build.gradle.kts           # Dependencies: Compose, Coroutines, Retrofit, Security-Crypto
│   └── src/main/
│       ├── AndroidManifest.xml    # Permissions: BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, CONNECT
│       └── java/com/pulsebeacon/attendance/
│           ├── MainActivity.kt    # Permission engine (ActivityResultContracts) & AppNavHost
│           ├── PulseBeaconApp.kt  # Application entry & dependency injection
│           ├── ble/
│           │   ├── BleAdvertiser.kt         # Faculty beacon broadcasting (HMAC-SHA256)
│           │   ├── BleScanner.kt            # Student low-latency scanner & distance calculation
│           │   └── BleProtocolConstants.kt  # UUID 0xFD2A, 30s window, TxPower & n factor
│           ├── data/
│           │   ├── api/                     # Retrofit API interface & client
│           │   └── repository/              # AttendanceRepository & EncryptedSharedPreferences
│           └── ui/
│               ├── navigation/              # Jetpack Compose AppNavHost
│               ├── screens/                 # Faculty & Student Compose screens & radar
│               └── theme/                   # Material3 Dark Theme
├── build.gradle.kts
└── settings.gradle.kts
```

---

## Prerequisites
- **Android Studio Ladybug (2024.2+)** or newer.
- **JDK 17** (configured in Android Studio under Settings > Build, Execution, Deployment > Build Tools > Gradle).
- Android device or emulator running **Android 8.0+ (API 26)**. *Physical device recommended for real BLE hardware broadcasting.*

---

## How to Build & Run

### Method 1: Using Android Studio (Recommended)
1. Open **Android Studio**.
2. Click **Open** and select the `/android` folder in this repository.
3. Wait for Gradle Sync to complete.
4. Connect your Android phone via USB (with **USB Debugging** enabled in Developer Options).
5. Click the green **Run (▶)** button.
6. The app will launch on your phone and immediately prompt for Bluetooth permissions!

### Method 2: Command Line (CLI)
From the root of this project:

```bash
cd android

# Build the Debug APK
./gradlew assembleDebug

# The APK will be generated at:
# app/build/outputs/apk/debug/app-debug.apk

# Install directly to a connected USB device:
./gradlew installDebug
```

---

## Bluetooth Permissions Handled
In `AndroidManifest.xml` and `MainActivity.kt`:
- `android.permission.BLUETOOTH_SCAN` (with `neverForLocation` flag for Android 12+)
- `android.permission.BLUETOOTH_ADVERTISE` (for Faculty beacon broadcasting)
- `android.permission.BLUETOOTH_CONNECT` (for querying Bluetooth adapter state)
- `android.permission.ACCESS_FINE_LOCATION` (fallback for Android 11 and older)
