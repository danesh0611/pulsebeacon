package com.pulsebeacon.attendance.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed class AdvertisingState {
    object Idle : AdvertisingState()
    data class Advertising(val payloadHex: String, val windowIndex: Long) : AdvertisingState()
    data class Error(val message: String, val errorCode: Int? = null) : AdvertisingState()
}

class BleAdvertiser(private val context: Context) {

    private val tag = "PulseBeacon_Advertiser"

    private val bluetoothManager: BluetoothManager? =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private var advertiser: BluetoothLeAdvertiser? = null

    private val _state = MutableStateFlow<AdvertisingState>(AdvertisingState.Idle)
    val state: StateFlow<AdvertisingState> = _state.asStateFlow()

    private var activeCallback: AdvertiseCallback? = null
    private var rotationJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Checks if the device supports BLE Peripheral Advertising.
     */
    fun isAdvertisingSupported(): Boolean {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) return false
        return bluetoothAdapter.isMultipleAdvertisementSupported
    }

    /**
     * Starts advertising the rotating BLE session beacon.
     * @param sessionCode unique session identifier
     * @param sessionSecret HMAC shared secret
     * @param saltHex 4-byte session salt
     */
    @SuppressLint("MissingPermission")
    fun startAdvertising(
        sessionCode: String,
        sessionSecret: String,
        saltHex: String
    ) {
        stopAdvertising()

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            _state.value = AdvertisingState.Error("Bluetooth is disabled or unavailable")
            return
        }

        advertiser = bluetoothAdapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            _state.value = AdvertisingState.Error("Device does not support BLE advertising as a peripheral")
            return
        }

        // Coroutine to periodically compute and update the rotating advertisement payload
        rotationJob = scope.launch {
            while (isActive) {
                val currentEpoch = System.currentTimeMillis() / 1000
                val windowIdx = currentEpoch / BleProtocolConstants.ROTATING_WINDOW_SECONDS
                
                // Compute current 20-byte rolling payload
                val payloadBytes = computePayload(sessionCode, sessionSecret, saltHex, windowIdx)
                val payloadHex = BleProtocolConstants.bytesToHex(payloadBytes)

                withContext(Dispatchers.Main) {
                    broadcastPayload(payloadBytes, payloadHex, windowIdx)
                }

                // Sleep until next window boundary
                val secondsUntilNextWindow = BleProtocolConstants.ROTATING_WINDOW_SECONDS - 
                    (currentEpoch % BleProtocolConstants.ROTATING_WINDOW_SECONDS)
                delay((secondsUntilNextWindow * 1000L).coerceAtLeast(1000L))
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun broadcastPayload(payloadBytes: ByteArray, payloadHex: String, windowIdx: Long) {
        // Stop current advertising slice before restarting with fresh payload
        activeCallback?.let {
            try {
                advertiser?.stopAdvertising(it)
            } catch (e: Exception) {
                Log.w(tag, "Exception stopping advertising before cycle update: ${e.message}")
            }
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .setTimeout(0) // Run until explicitly stopped
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(BleProtocolConstants.SERVICE_UUID)
            .addServiceData(BleProtocolConstants.SERVICE_UUID, payloadBytes)
            .build()

        val callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                super.onStartSuccess(settingsInEffect)
                Log.i(tag, "BLE Beacon advertising successfully: $payloadHex")
                _state.value = AdvertisingState.Advertising(payloadHex, windowIdx)
            }

            override fun onStartFailure(errorCode: Int) {
                super.onStartFailure(errorCode)
                val msg = when (errorCode) {
                    ADVERTISE_FAILED_DATA_TOO_LARGE -> "Payload too large for legacy BLE packet (Max 31B)"
                    ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many active BLE advertisers"
                    ADVERTISE_FAILED_ALREADY_STARTED -> "Advertising already in progress"
                    ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "BLE advertising unsupported on hardware"
                    else -> "Advertising failed with internal error code $errorCode"
                }
                Log.e(tag, msg)
                _state.value = AdvertisingState.Error(msg, errorCode)
            }
        }

        activeCallback = callback
        try {
            advertiser?.startAdvertising(settings, data, callback)
        } catch (e: Exception) {
            _state.value = AdvertisingState.Error("Failed to invoke startAdvertising: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        rotationJob?.cancel()
        rotationJob = null
        activeCallback?.let {
            try {
                advertiser?.stopAdvertising(it)
            } catch (e: Exception) {
                Log.w(tag, "Failed to stop advertising: ${e.message}")
            }
        }
        activeCallback = null
        _state.value = AdvertisingState.Idle
    }

    /**
     * Constructs the 20-byte Service Data packet matching the backend BLE crypto scheme:
     * [0..3]: SHA256(sessionCode)[0..3]
     * [4..7]: Window Index (uint32 big-endian)
     * [8..11]: Salt (4 bytes)
     * [12..19]: HMAC-SHA256 slice (8 bytes)
     */
    private fun computePayload(
        sessionCode: String,
        sessionSecret: String,
        saltHex: String,
        windowIdx: Long
    ): ByteArray {
        val md = java.security.MessageDigest.getInstance("SHA-256")
        val sessionTag = md.digest(sessionCode.toByteArray(Charsets.UTF_8)).sliceArray(0..3)

        val windowBytes = ByteArray(4)
        windowBytes[0] = ((windowIdx shr 24) and 0xFF).toByte()
        windowBytes[1] = ((windowIdx shr 16) and 0xFF).toByte()
        windowBytes[2] = ((windowIdx shr 8) and 0xFF).toByte()
        windowBytes[3] = (windowIdx and 0xFF).toByte()

        val saltBytes = try {
            BleProtocolConstants.hexToBytes(saltHex).sliceArray(0..3)
        } catch (e: Exception) {
            saltHex.toByteArray().copyOf(4)
        }

        val msgToSign = sessionTag + windowBytes + saltBytes

        val mac = javax.crypto.Mac.getInstance("HmacSHA256")
        val secretKey = javax.crypto.spec.SecretKeySpec(
            sessionSecret.toByteArray(Charsets.UTF_8),
            "HmacSHA256"
        )
        mac.init(secretKey)
        val hmacDigest = mac.doFinal(msgToSign)
        val hmacSlice = hmacDigest.sliceArray(0..7)

        return sessionTag + windowBytes + saltBytes + hmacSlice
    }
}
