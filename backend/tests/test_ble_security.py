import time
import pytest
from backend.app.ble_crypto import BleCryptoService

def test_ble_advertising_payload_generation_length():
    """Verify generated BLE advertisement payload strictly adheres to 20-byte legacy AD service data limit."""
    session_code = "SESS-A1B2C3D4"
    session_secret = "0123456789abcdef0123456789abcdef"
    salt_hex = "ABCD1234"

    payload_bytes = BleCryptoService.generate_advertising_payload(
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex
    )
    assert len(payload_bytes) == 20
    hex_str = BleCryptoService.generate_advertising_payload_hex(
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex
    )
    assert len(hex_str) == 40  # 20 bytes * 2 characters

def test_ble_verification_success_in_same_window():
    """Verify that an untampered payload generated in the current window verifies successfully."""
    session_code = "CS401-SESSION-99"
    session_secret = "secret-super-key-ble-attendance"
    salt_hex = "DEADBEEF"

    payload_hex = BleCryptoService.generate_advertising_payload_hex(
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex
    )

    is_valid, reason, window_idx = BleCryptoService.verify_advertising_payload(
        payload_hex=payload_hex,
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex,
        tolerance_windows=1
    )
    assert is_valid is True
    assert "Valid" in reason

def test_ble_verification_fails_on_wrong_session():
    """Verify that payload from Session A is rejected when attempting to verify against Session B."""
    session_secret = "secret-super-key-ble-attendance"
    salt_hex = "DEADBEEF"

    payload_hex = BleCryptoService.generate_advertising_payload_hex(
        session_code="SESSION-A",
        session_secret=session_secret,
        salt_hex=salt_hex
    )

    is_valid, reason, _ = BleCryptoService.verify_advertising_payload(
        payload_hex=payload_hex,
        session_code="SESSION-B-DIFFERENT",
        session_secret=session_secret,
        salt_hex=salt_hex
    )
    assert is_valid is False
    assert "mismatch" in reason.lower()

def test_ble_verification_fails_on_tampered_payload():
    """Verify that byte tampering causes HMAC cryptographic failure."""
    session_code = "SESSION-SAFE"
    session_secret = "secret-key-12345"
    salt_hex = "11223344"

    payload_bytes = bytearray(BleCryptoService.generate_advertising_payload(
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex
    ))
    
    # Flip one byte in the HMAC signature segment
    payload_bytes[-1] ^= 0xFF
    tampered_hex = payload_bytes.hex().upper()

    is_valid, reason, _ = BleCryptoService.verify_advertising_payload(
        payload_hex=tampered_hex,
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex
    )
    assert is_valid is False
    assert "hmac" in reason.lower()

def test_ble_verification_fails_on_expired_window():
    """Verify replay protection rejects old payloads outside time tolerance window."""
    session_code = "SESSION-REPLAY-TEST"
    session_secret = "secret-key-12345"
    salt_hex = "11223344"

    # Simulate payload created 5 minutes ago (10 windows ago for 30s window)
    old_time = time.time() - 300
    old_payload_hex = BleCryptoService.generate_advertising_payload_hex(
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex,
        timestamp=old_time
    )

    is_valid, reason, _ = BleCryptoService.verify_advertising_payload(
        payload_hex=old_payload_hex,
        session_code=session_code,
        session_secret=session_secret,
        salt_hex=salt_hex,
        tolerance_windows=1
    )
    assert is_valid is False
    assert "expired" in reason.lower()

def test_distance_estimation():
    """Verify log-distance path loss estimation calculations."""
    # At 1 meter with reference RSSI -59 dBm, estimated distance should be ~1.0m
    d1 = BleCryptoService.estimate_distance(rssi=-59.0, tx_power_1m=-59.0, path_loss_exponent=2.4)
    assert abs(d1 - 1.0) < 0.1

    # At lower RSSI (e.g. -75 dBm), distance should be larger (~4.6m)
    d2 = BleCryptoService.estimate_distance(rssi=-75.0, tx_power_1m=-59.0, path_loss_exponent=2.4)
    assert d2 > 3.5
