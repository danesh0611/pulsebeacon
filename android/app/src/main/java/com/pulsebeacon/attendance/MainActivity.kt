package com.pulsebeacon.attendance

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.pulsebeacon.attendance.ble.BleAdvertiser
import com.pulsebeacon.attendance.ble.BleScanner
import com.pulsebeacon.attendance.data.repository.AttendanceRepository
import com.pulsebeacon.attendance.ui.navigation.AppNavHost
import com.pulsebeacon.attendance.ui.theme.PulseBeaconTheme

class MainActivity : ComponentActivity() {

    private lateinit var bleScanner: BleScanner
    private lateinit var bleAdvertiser: BleAdvertiser
    private lateinit var repository: AttendanceRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        repository = (application as PulseBeaconApp).repository
        bleScanner = BleScanner(this)
        bleAdvertiser = BleAdvertiser(this)

        setContent {
            PulseBeaconTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var permissionsGranted by remember { mutableStateOf(checkPermissions()) }

                    // Android 12+ Permission Launcher
                    val permissionLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestMultiplePermissions()
                    ) { results ->
                        val allGranted = results.values.all { it }
                        permissionsGranted = allGranted
                        if (!allGranted) {
                            Toast.makeText(
                                this,
                                "Bluetooth and Location permissions are required for BLE proximity verification.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }

                    LaunchedEffect(Unit) {
                        if (!permissionsGranted) {
                            val permsToRequest = getRequiredPermissions()
                            permissionLauncher.launch(permsToRequest)
                        }
                    }

                    AppNavHost(
                        repository = repository,
                        bleScanner = bleScanner,
                        bleAdvertiser = bleAdvertiser,
                        hasPermissions = permissionsGranted,
                        onRequestPermissions = {
                            permissionLauncher.launch(getRequiredPermissions())
                        }
                    )
                }
            }
        }
    }

    private fun getRequiredPermissions(): Array<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        }
    }

    private fun checkPermissions(): Boolean {
        for (perm in getRequiredPermissions()) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                return false
            }
        }
        return true
    }

    override fun onDestroy() {
        super.onDestroy()
        bleScanner.stopScanning()
        bleAdvertiser.stopAdvertising()
    }
}
