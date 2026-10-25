package com.pulsebeacon.attendance.ble

import android.os.ParcelUuid
import java.util.UUID

object BleProtocolConstants {
    // 16-bit Service UUID: 0xFD2A represented as 128-bit Bluetooth SIG base UUID
    const val SERVICE_UUID_STRING = "0000FD2A-0000-1000-8000-00805F9B34FB"
    val SERVICE_UUID: ParcelUuid = ParcelUuid.fromString(SERVICE_UUID_STRING)
    val SERVICE_UUID_16: Int = 0xFD2A

    // Protocol layout constants
    const val PAYLOAD_LENGTH_BYTES = 20
    const val SESSION_TAG_OFFSET = 0
    const val SESSION_TAG_LENGTH = 4
    const val WINDOW_OFFSET = 4
    const val WINDOW_LENGTH = 4
    const val SALT_OFFSET = 8
    const val SALT_LENGTH = 4
    const val HMAC_OFFSET = 12
    const val HMAC_LENGTH = 8

    // Timing parameters
    const val ROTATING_WINDOW_SECONDS = 30L
    const val SCAN_TIMEOUT_MILLIS = 15000L

    // RF Propagation calibration defaults
    const val DEFAULT_TX_POWER_1M = -59.0f // Average calibrated RSSI at 1 meter
    const val PATH_LOSS_EXPONENT = 2.4f    // Classroom indoor multipath environment
    const val DEFAULT_RSSI_THRESHOLD = -78.0f // ~7 to 8 meter lecture hall radius

    /**
     * Converts a byte array to an uppercase hexadecimal string.
     */
    fun bytesToHex(bytes: ByteArray): String {
        val hexChars = "0123456789ABCDEF"
        val result = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            val i = b.toInt() and 0xFF
            result.append(hexChars[i shr 4])
            result.append(hexChars[i and 0x0F])
        }
        return result.toString()
    }

    /**
     * Converts a hexadecimal string to a byte array.
     */
    fun hexToBytes(hex: String): ByteArray {
        val cleanHex = hex.trim().replace(" ", "")
        val len = cleanHex.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(cleanHex[i], 16) shl 4) +
                    Character.digit(cleanHex[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }
}
