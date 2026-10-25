import hmac
import hashlib
import time
import struct
import math
from typing import Tuple, Optional
from backend.app.config import settings

SERVICE_UUID_16 = 0xFD2A
SERVICE_UUID_128 = "0000fd2a-0000-1000-8000-00805f9b34fb"

class BleCryptoService:
    """
    Handles cryptographic rolling nonce generation, BLE advertisement payload 
    encoding/decoding, distance estimation from RSSI, and replay-protection checks.
    """

    @staticmethod
    def get_epoch_window(timestamp: Optional[float] = None, window_seconds: int = 30) -> int:
        """Returns the discrete time-window slot index."""
        ts = timestamp if timestamp is not None else time.time()
        return int(ts // window_seconds)

    @classmethod
    def generate_advertising_payload(
        cls, 
        session_code: str, 
        session_secret: str, 
        salt_hex: str, 
        timestamp: Optional[float] = None
    ) -> bytes:
        """
        Builds the 20-byte Service Data payload for BLE Legacy Advertising.
        Byte layout:
        [0..3]   : Session Hash Tag (uint32)
        [4..7]   : Window Index (uint32 big-endian)
        [8..11]  : Salt (4 bytes)
        [12..19] : HMAC-SHA256 truncated signature (8 bytes)
        Total = 20 bytes.
        """
        window_idx = cls.get_epoch_window(timestamp, settings.BLE_NONCE_VALIDITY_WINDOW_SECONDS)
        
        # 4-byte session tag
        session_tag = hashlib.sha256(session_code.encode("utf-8")).digest()[:4]
        
        # 4-byte window
        window_bytes = struct.pack(">I", window_idx)
        
        # 4-byte salt
        salt_bytes = bytes.fromhex(salt_hex[:8]) if len(salt_hex) >= 8 else salt_hex.encode("utf-8").ljust(4, b"\x00")[:4]
        
        # 8-byte HMAC
        msg_to_sign = session_tag + window_bytes + salt_bytes
        hmac_digest = hmac.new(
            session_secret.encode("utf-8"),
            msg_to_sign,
            hashlib.sha256
        ).digest()[:8]
        
        return session_tag + window_bytes + salt_bytes + hmac_digest

    @classmethod
    def generate_advertising_payload_hex(
        cls, 
        session_code: str, 
        session_secret: str, 
        salt_hex: str, 
        timestamp: Optional[float] = None
    ) -> str:
        """Returns the hex string representation of the 20-byte advertising payload."""
        payload_bytes = cls.generate_advertising_payload(session_code, session_secret, salt_hex, timestamp)
        return payload_bytes.hex().upper()

    @classmethod
    def verify_advertising_payload(
        cls,
        payload_hex: str,
        session_code: str,
        session_secret: str,
        salt_hex: str,
        tolerance_windows: int = 1
    ) -> Tuple[bool, str, int]:
        """
        Validates whether the payload_hex matches the session secret and is within the 
        acceptable time-window tolerance (default +/- 1 window = +/- 30-45 seconds).
        Returns (is_valid, reason, window_index).
        """
        try:
            payload = bytes.fromhex(payload_hex)
        except ValueError:
            return False, "Invalid hexadecimal payload format", 0

        if len(payload) != 20:
            return False, f"Invalid payload length: expected 20 bytes, got {len(payload)}", 0

        rx_session_tag = payload[0:4]
        rx_window_idx = struct.unpack(">I", payload[4:8])[0]
        rx_salt = payload[8:12]
        rx_hmac = payload[12:20]

        # Verify session tag matches
        expected_session_tag = hashlib.sha256(session_code.encode("utf-8")).digest()[:4]
        if not hmac.compare_digest(rx_session_tag, expected_session_tag):
            return False, "Session tag mismatch (broadcast does not match requested session)", rx_window_idx

        # Verify time-window is within allowable drift
        current_window = cls.get_epoch_window(None, settings.BLE_NONCE_VALIDITY_WINDOW_SECONDS)
        diff = abs(current_window - rx_window_idx)
        if diff > tolerance_windows:
            return False, f"BLE payload expired or timestamp desynchronized (diff: {diff} windows)", rx_window_idx

        # Compute HMAC signature for the received window and salt
        msg_to_sign = rx_session_tag + payload[4:8] + rx_salt
        expected_hmac = hmac.new(
            session_secret.encode("utf-8"),
            msg_to_sign,
            hashlib.sha256
        ).digest()[:8]

        if not hmac.compare_digest(rx_hmac, expected_hmac):
            return False, "Cryptographic HMAC verification failed (tampered or spoofed beacon)", rx_window_idx

        return True, "Valid BLE challenge token", rx_window_idx

    @staticmethod
    def estimate_distance(rssi: float, tx_power_1m: float = -59.0, path_loss_exponent: float = 2.4) -> float:
        """
        Calculates distance in meters from measured RSSI using log-distance path loss model:
        RSSI = -10 * n * log10(d) + A
        d = 10 ^ ((A - RSSI) / (10 * n))
        """
        if rssi >= 0:
            return 0.1  # Physical anomaly or direct contact
        ratio = (tx_power_1m - rssi) / (10.0 * path_loss_exponent)
        distance = math.pow(10.0, ratio)
        return round(distance, 2)
