# PulseBeacon Security & Threat Model

## 1. Core Principle: Proximity vs. Presence
In any wireless proximity attendance architecture:
> **Bluetooth Low Energy signals provide evidence of radio proximity, not conclusive, unassailable proof of human physical presence.**

RF signals can be reflected, boosted with high-gain antennas, or forwarded across networks. PulseBeacon acknowledges these physical realities and implements defense-in-depth mitigations rather than making false claims of cryptographic presence proofs.

---

## 2. Threat Analysis & Mitigations

### 2.1 Replay Attack
- **Threat**: An attacker records the BLE advertisement packet emitted by the instructor's device and broadcasts or submits it later after class.
- **PulseBeacon Defense**:
  - The payload incorporates a 30-second rolling window index $W = \lfloor t / 30 \rfloor$.
  - The server strictly enforces a tolerance window of $\pm 1$ slot ($\le 45$ seconds).
  - Packets sniffed earlier immediately fail the HMAC and window verification check.
- **Residual Risk**: Negligible.

### 2.2 Relaying & Wormhole Attacks
- **Threat**: A colluding student physically present in class captures the active BLE advertisement and streams it via cellular data (e.g. WebSocket or instant messaging) to an absent student at home, who immediately submits it to the API within the 30-second window.
- **PulseBeacon Defense**:
  - **Single Device & Account Binding**: Student accounts are securely bound to verified college registration numbers.
  - **Subnet & Geolocation Verification**: Client IP addresses are logged in the immutable audit ledger. Campus Wi-Fi IP subnets can be enforced on the backend.
  - **Audited Manual Overrides**: Instructors retain visual attendance capability. Any discrepancies flagged by students trigger automated audit reviews.
- **Residual Risk**: Low to Medium (requires pre-arranged collusion with an actively cooperating student in the same room).

### 2.3 Sybil & Duplicate Submission
- **Threat**: A single student attempts to mark attendance on behalf of multiple absent peers using their registration codes.
- **PulseBeacon Defense**:
  - Uniqueness constraints are enforced at the database level:
    ```sql
    UNIQUE (session_id, student_id)
    ```
  - Registration numbers are strictly unique and tied to authenticated JWT user tokens. A student cannot specify another student's identifier in the check-in payload.
- **Residual Risk**: Zero.

### 2.4 Hallway / Exterior Loitering
- **Threat**: Students loiter outside the classroom door or in the adjacent hallway to mark attendance without attending the lecture.
- **PulseBeacon Defense**:
  - Configurable RSSI threshold (default $-78.0\text{ dBm}$).
  - Log-distance path loss calculation rejects any beacons received weaker than the classroom perimeter cutoff.
- **Residual Risk**: Low.

---

## 3. Cryptographic Primitives
- **Password Storage**: Passwords hashed with `bcrypt` (12 rounds) with unique salt per user.
- **API Token Security**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`) and short expirations.
- **Beacon Integrity**: 64-bit truncated HMAC-SHA256 evaluated over discrete epoch windows, preventing packet forgery without knowing the server's per-session secret.
- **No PII over BLE**: No student names, registration numbers, or long-lived tokens are ever transmitted over the unencrypted BLE broadcast medium.
