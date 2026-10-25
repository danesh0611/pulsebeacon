package com.pulsebeacon.attendance

import com.pulsebeacon.attendance.ble.BleProtocolConstants
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.abs

class BleProtocolTest {

    @Test
    fun testBytesToHexConversion() {
        val bytes = byteArrayOf(0xFD.toByte(), 0x2A.toByte(), 0x00.toByte(), 0x12.toByte())
        val hex = BleProtocolConstants.bytesToHex(bytes)
        assertEquals("FD2A0012", hex)
    }

    @Test
    fun testHexToBytesConversion() {
        val hex = "FD2A0012"
        val bytes = BleProtocolConstants.hexToBytes(hex)
        assertEquals(4, bytes.size)
        assertEquals(0xFD.toByte(), bytes[0])
        assertEquals(0x2A.toByte(), bytes[1])
    }

    @Test
    fun testPayloadStructureConstants() {
        assertEquals(20, BleProtocolConstants.PAYLOAD_LENGTH_BYTES)
        assertEquals(4, BleProtocolConstants.SESSION_TAG_LENGTH)
        assertEquals(4, BleProtocolConstants.WINDOW_LENGTH)
        assertEquals(4, BleProtocolConstants.SALT_LENGTH)
        assertEquals(8, BleProtocolConstants.HMAC_LENGTH)
        // Verify offsets sum up correctly
        assertEquals(BleProtocolConstants.SESSION_TAG_OFFSET + BleProtocolConstants.SESSION_TAG_LENGTH, BleProtocolConstants.WINDOW_OFFSET)
        assertEquals(BleProtocolConstants.WINDOW_OFFSET + BleProtocolConstants.WINDOW_LENGTH, BleProtocolConstants.SALT_OFFSET)
        assertEquals(BleProtocolConstants.SALT_OFFSET + BleProtocolConstants.SALT_LENGTH, BleProtocolConstants.HMAC_OFFSET)
    }
}
