package com.pulsebeacon.attendance.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.pow

data class DiscoveredBeacon(
    val deviceAddress: String,
    val payloadHex: String,
    val sessionTagHex: String,
    val rssi: Int,
    val estimatedDistanceM: Float,
    val timestamp: Long = System.currentTimeMillis()
)

sealed class ScanningState {
    object Idle : ScanningState()
    object Scanning : ScanningState()
    data class Discovered(val beacon: DiscoveredBeacon) : ScanningState()
    object Timeout : ScanningState()
    data class Error(val message: String, val errorCode: Int? = null) : ScanningState()
}

class BleScanner(private val context: Context) {

    private val tag = "PulseBeacon_Scanner"

    private val bluetoothManager: BluetoothManager? =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private var scanner: BluetoothLeScanner? = null

    private val _state = MutableStateFlow<ScanningState>(ScanningState.Idle)
    val state: StateFlow<ScanningState> = _state.asStateFlow()

    private var activeCallback: ScanCallback? = null
    private var timeoutJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Estimates physical distance in meters using log-distance path loss:
     * RSSI = -10 * n * log10(d) + A
     * d = 10 ^ ((A - RSSI) / (10 * n))
     */
    fun calculateDistance(
        rssi: Int,
        txPower1m: Float = BleProtocolConstants.DEFAULT_TX_POWER_1M,
        pathLossExponent: Float = BleProtocolConstants.PATH_LOSS_EXPONENT
    ): Float {
        if (rssi >= 0) return 0.1f
        val ratio = (txPower1m - rssi) / (10.0f * pathLossExponent)
        val distance = 10.0.pow(ratio.toDouble()).toFloat()
        return (Math.round(distance * 100.0f) / 100.0f)
    }

    /**
     * Starts low-latency scan filtered by the PulseBeacon Service UUID.
     * @param targetSessionTagHex optional 4-byte session tag hex to match specific classroom session
     */
    @SuppressLint("MissingPermission")
    fun startScanning(targetSessionTagHex: String? = null) {
        stopScanning()

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            _state.value = ScanningState.Error("Bluetooth is disabled. Please enable Bluetooth to check in.")
            return
        }

        scanner = bluetoothAdapter.bluetoothLeScanner
        if (scanner == null) {
            _state.value = ScanningState.Error("Bluetooth LE Scanner unavailable on this device")
            return
        }

        _state.value = ScanningState.Scanning

        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(BleProtocolConstants.SERVICE_UUID)
            .build()

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult?) {
                super.onScanResult(callbackType, result)
                if (result == null) return

                val record = result.scanRecord ?: return
                val serviceData = record.getServiceData(BleProtocolConstants.SERVICE_UUID)

                if (serviceData != null && serviceData.size == BleProtocolConstants.PAYLOAD_LENGTH_BYTES) {
                    val payloadHex = BleProtocolConstants.bytesToHex(serviceData)
                    val sessionTagHex = payloadHex.substring(0, 8) // First 4 bytes (8 hex chars)
                    
                    // If filtering by specific session tag, ensure match
                    if (targetSessionTagHex != null && !sessionTagHex.equals(targetSessionTagHex, ignoreCase = true)) {
                        Log.d(tag, "Ignored beacon with different tag: $sessionTagHex (wanted $targetSessionTagHex)")
                        return
                    }

                    val distance = calculateDistance(result.rssi)
                    val beacon = DiscoveredBeacon(
                        deviceAddress = result.device.address ?: "BEACON-DEVICE",
                        payloadHex = payloadHex,
                        sessionTagHex = sessionTagHex,
                        rssi = result.rssi,
                        estimatedDistanceM = distance
                    )

                    Log.i(tag, "Discovered matching PulseBeacon session: $sessionTagHex, RSSI: ${result.rssi} dBm, Est: ${distance}m")
                    _state.value = ScanningState.Discovered(beacon)
                }
            }

            override fun onScanFailed(errorCode: Int) {
                super.onScanFailed(errorCode)
                val msg = when (errorCode) {
                    SCAN_FAILED_ALREADY_STARTED -> "Scan already in progress"
                    SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "Bluetooth scan app registration failed"
                    SCAN_FAILED_INTERNAL_ERROR -> "Bluetooth scan internal controller error"
                    SCAN_FAILED_FEATURE_UNSUPPORTED -> "BLE scan unsupported on this device"
                    else -> "Bluetooth scan failed with code $errorCode"
                }
                Log.e(tag, msg)
                _state.value = ScanningState.Error(msg, errorCode)
            }
        }

        activeCallback = callback
        try {
            scanner?.startScan(listOf(scanFilter), scanSettings, callback)
        } catch (e: Exception) {
            _state.value = ScanningState.Error("Failed to start BLE scan: ${e.message}")
            return
        }

        // Auto-timeout after 15 seconds to preserve battery
        timeoutJob = scope.launch {
            delay(BleProtocolConstants.SCAN_TIMEOUT_MILLIS)
            if (_state.value is ScanningState.Scanning) {
                withContext(Dispatchers.Main) {
                    stopScanning()
                    _state.value = ScanningState.Timeout
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun stopScanning() {
        timeoutJob?.cancel()
        timeoutJob = null
        activeCallback?.let {
            try {
                scanner?.stopScan(it)
            } catch (e: Exception) {
                Log.w(tag, "Failed to stop BLE scan: ${e.message}")
            }
        }
        activeCallback = null
        if (_state.value is ScanningState.Scanning) {
            _state.value = ScanningState.Idle
        }
    }
}
