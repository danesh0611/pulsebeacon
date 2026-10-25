package com.pulsebeacon.attendance.ui.screens.student

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pulsebeacon.attendance.ble.BleScanner
import com.pulsebeacon.attendance.ble.DiscoveredBeacon
import com.pulsebeacon.attendance.ble.ScanningState
import com.pulsebeacon.attendance.data.model.BleCheckInResponse
import com.pulsebeacon.attendance.data.repository.AttendanceRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BleScanScreen(
    sessionId: Int,
    sessionTag: String,
    rssiCutoff: Float,
    repository: AttendanceRepository,
    bleScanner: BleScanner,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val scanState by bleScanner.state.collectAsState()

    var isSubmitting by remember { mutableStateOf(false) }
    var checkInResult by remember { mutableStateOf<BleCheckInResponse?>(null) }
    var submissionError by remember { mutableStateOf<String?>(null) }

    // Start BLE scan on mount if permissions granted
    LaunchedEffect(hasPermissions) {
        if (hasPermissions) {
            bleScanner.startScanning(targetSessionTagHex = sessionTag)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            bleScanner.stopScanning()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Proximity Radar Scan") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (!hasPermissions) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Bluetooth Permissions Required", fontWeight = FontWeight.Bold)
                        Text("Grant Bluetooth Scan & Location permissions to search for the instructor's beacon.")
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(onClick = onRequestPermissions) {
                            Text("Grant Permissions")
                        }
                    }
                }
                return@Scaffold
            }

            if (checkInResult != null) {
                // Success Screen
                val res = checkInResult!!
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF2E7D32),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Attendance Verified!",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1B5E20)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            res.courseTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Student: ${res.studentName} (${res.registrationNumber})",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Proximity: ~${res.estimatedDistanceM}m (RSSI: ${res.observedRssi} dBm)",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF2E7D32)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = onBack,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Text("Done")
                        }
                    }
                }
                return@Scaffold
            }

            // Radar Pulse Animation
            val infiniteTransition = rememberInfiniteTransition(label = "RadarPulse")
            val pulseScale by infiniteTransition.animateFloat(
                initialValue = 0.8f,
                targetValue = 1.35f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1400, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "scale"
            )
            val pulseAlpha by infiniteTransition.animateFloat(
                initialValue = 0.6f,
                targetValue = 0.0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1400, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "alpha"
            )

            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(200.dp)
                    .padding(16.dp)
            ) {
                if (scanState is ScanningState.Scanning) {
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .scale(pulseScale)
                            .background(
                                MaterialTheme.colorScheme.primary.copy(alpha = pulseAlpha),
                                CircleShape
                            )
                    )
                }
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "BLE",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (val state = scanState) {
                is ScanningState.Scanning -> {
                    Text(
                        "Searching for Faculty BLE Beacon...",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "Listening for UUID 0xFD2A (Session: $sessionTag)",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }

                is ScanningState.Discovered -> {
                    val beacon = state.beacon
                    val isWithinRange = beacon.rssi >= rssiCutoff

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isWithinRange) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFFFEBEE)
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Faculty Beacon Detected", fontWeight = FontWeight.Bold)
                                Text("${beacon.rssi} dBm", fontWeight = FontWeight.Bold, color = if (isWithinRange) Color(0xFF2E7D32) else Color.Red)
                            }

                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Estimated Distance: ~${beacon.estimatedDistanceM} meters")
                            Text("Rolling Nonce: ${beacon.payloadHex.takeLast(16)}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)

                            Spacer(modifier = Modifier.height(14.dp))

                            if (isWithinRange) {
                                Button(
                                    onClick = {
                                        scope.launch {
                                            isSubmitting = true
                                            submissionError = null
                                            val res = repository.submitBleCheckIn(
                                                sessionId = sessionId,
                                                payloadHex = beacon.payloadHex,
                                                observedRssi = beacon.rssi.toFloat()
                                            )
                                            isSubmitting = false
                                            res.onSuccess {
                                                checkInResult = it
                                            }.onFailure {
                                                submissionError = it.localizedMessage ?: "Verification rejected"
                                            }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !isSubmitting
                                ) {
                                    if (isSubmitting) {
                                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Validating Nonce...")
                                    } else {
                                        Text("Confirm Proximity & Mark Attendance")
                                    }
                                }
                            } else {
                                Text(
                                    "Signal too weak for verified attendance. Please move closer to the lecturer.",
                                    color = Color.Red,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                }

                is ScanningState.Timeout -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No beacon detected within 15 seconds.", color = Color.Gray)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { bleScanner.startScanning(sessionTag) }) {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Scan Again")
                        }
                    }
                }

                is ScanningState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Scan Error", fontWeight = FontWeight.Bold)
                            Text(state.message)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { bleScanner.startScanning(sessionTag) }) {
                                Text("Retry")
                            }
                        }
                    }
                }

                else -> {}
            }

            if (submissionError != null) {
                Spacer(modifier = Modifier.height(14.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = Color.Red)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(submissionError ?: "", color = Color.Red, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
