# PulseBeacon BLE Protocol Specification

## 1. Overview
PulseBeacon implements an enterprise-grade proximity verification protocol designed for college lecture environments. It requires zero custom hardware (no ESP32, Arduino, or NFC tags), utilizing standard faculty and student Android smartphones and laptops.

- **Primary Transport**: Bluetooth Low Energy (BLE) Legacy Advertising PDU (Bluetooth 4.0/4.2/5.0+ compatible).
- **Service UUID**: `0xFD2A` (16-bit) / `0000FD2A-0000-1000-8000-00805F9B34FB` (128-bit).
- **Advertisement Type**: `ADV_NONCONN_IND` (Non-connectable undirected advertising).
- **Maximum Payload Budget**: 31 Bytes (248 bits).

---

## 2. 31-Byte Frame Breakdown

Legacy BLE advertising frames must fit into a strict 31-byte limit:

```
+-------------------------------------------------------------------------+
|                        BLE Advertising Frame (31B)                      |
+-------------------+-----------------------------------------------------+
|   Flags AD (3B)   |             Service Data 16-bit AD (24B)            |
+---+---+-----------+---+----+--------+-----------+--------+------+-------+
|Len|Typ|Value      |Len|Typ |UUID    |SessionTag |Window  |Salt  |HMAC   |
|0x02 01 0x06       |0x17 16 |0x2A 0xFD|4 Bytes    |4 Bytes |4 Bytes 8 Bytes|
+---+---+-----------+---+----+--------+-----------+--------+------+-------+
|   Offset 0..2     | 3   4  | 5    6 | 7..10     | 11..14 | 15..18| 19..26|
+-------------------+--------+--------+-----------+--------+------+-------+
```

### Detailed Field Descriptions:
1. **Flags AD Type (`0x01`, Length 2)**:
   - Value `0x06` indicates `LE General Discoverable Mode` and `BR/EDR Not Supported`.
2. **Service Data 16-bit AD Structure (`0x16`, Length 23)**:
   - **Service UUID (2 Bytes)**: `0xFD2A` encoded little-endian as `[0x2A, 0xFD]`.
   - **Session Tag (4 Bytes)**: `SHA-256(session_code)[0..3]`. Used by scanning student devices as a high-speed pre-filter to distinguish the target classroom session from neighboring classrooms.
   - **Epoch Window Index (4 Bytes, Big-Endian uint32)**: `floor(unix_epoch_seconds / 30)`. Identifies the discrete 30-second time slot.
   - **Session Salt (4 Bytes)**: Session-specific pseudo-random salt generated during session initialization.
   - **HMAC-SHA256 Truncated Signature (8 Bytes / 64 bits)**:
     $$\text{HMAC} = \text{HMAC-SHA256}(\text{session\_secret}, \text{SessionTag} \mathbin{\Vert} \text{Window} \mathbin{\Vert} \text{Salt})[0..7]$$

Total advertisement frame size is **27 bytes**, fitting well within the 31-byte limit without requiring extended advertising.

---

## 3. Log-Distance Path-Loss Propagation Model

To classify whether a student is physically inside the lecture hall or outside in the hallway, the system models radio frequency attenuation:

$$\text{RSSI} = A - 10 \cdot n \cdot \log_{10}(d)$$

$$\text{Estimated Distance } d = 10^{\frac{A - \text{RSSI}}{10 \cdot n}}$$

Where:
- $d$: Distance between instructor phone and student phone in meters.
- $A$: Reference RSSI measured at 1 meter. Calibrated to **$-59.0 \text{ dBm}$** for modern smartphone BLE chipsets.
- $n$: Path loss exponent. Default **$n = 2.4$** for indoor classrooms with desks, whiteboard reflections, and human body attenuation.
- **Classroom Cutoff Threshold**: Configured to **$-78.0 \text{ dBm}$** ($\sim 7.5\text{m}$ to $8.0\text{m}$ radius), matching typical university lecture halls.

---

## 4. Anti-Replay Mechanism & Window Drift Tolerance

1. The faculty phone recalculates and updates the advertising packet every 30 seconds.
2. When the student app detects the beacon, it forwards the 20-byte payload to `/api/student/verify-ble-checkin`.
3. The server computes acceptable window slots: $W_{\text{current}} - 1 \le W_{\text{received}} \le W_{\text{current}} + 1$.
   - This accounts for clock skew between faculty and student mobile devices ($\pm 30\text{s}$ to $45\text{s}$).
4. If $W_{\text{received}}$ is outside this boundary, the server rejects the request with HTTP 400 (`Token expired`).
5. A nonce challenge cannot be submitted twice due to the database unique constraint on `(session_id, student_id)`.
