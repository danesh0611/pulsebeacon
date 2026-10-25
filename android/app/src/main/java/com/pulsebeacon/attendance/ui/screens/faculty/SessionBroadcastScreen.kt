package com.pulsebeacon.attendance.ui.screens.faculty

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pulsebeacon.attendance.ble.AdvertisingState
import com.pulsebeacon.attendance.ble.BleAdvertiser
import com.pulsebeacon.attendance.data.model.AttendanceRecordItem
import com.pulsebeacon.attendance.data.repository.AttendanceRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionBroadcastScreen(
    repository: AttendanceRepository,
    bleAdvertiser: BleAdvertiser,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit,
    onSwitchRole: () -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val advertisingState by bleAdvertiser.state.collectAsState()

    var isBroadcasting by remember { mutableStateOf(false) }
    var sessionId by remember { mutableStateOf(1) }
    var sessionCode by remember { mutableStateOf("SESS-CS401-LAB") }
    var attendees by remember { mutableStateOf<List<AttendanceRecordItem>>(emptyList()) }
    var remainingSeconds by remember { mutableStateOf(1800) }

    fun startBeacon() {
        if (!hasPermissions) {
            onRequestPermissions()
            return
        }
        isBroadcasting = true
        // Start physical BLE peripheral advertising
        bleAdvertiser.startAdvertising(
            sessionCode = sessionCode,
            sessionSecret = "pulsebeacon_ble_hmac_master_secret_key_8842",
            saltHex = "ABCD1234"
        )
    }

    fun stopBeacon() {
        isBroadcasting = false
        bleAdvertiser.stopAdvertising()
    }

    // Poll live attendees periodically
    LaunchedEffect(isBroadcasting) {
        while (isBroadcasting) {
            val res = repository.getSessionRecords(sessionId)
            res.onSuccess {
                attendees = it
            }
            delay(3000)
        }
    }

    // Countdown timer loop
    LaunchedEffect(isBroadcasting) {
        while (isBroadcasting && remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Faculty BLE Transmitter", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            repository.getUserFullName() ?: "Dr. Elena Rostova",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                },
                actions = {
                    TextButton(onClick = onSwitchRole) {
                        Text("Student View", color = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Log Out", tint = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Transmitter Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isBroadcasting) Color(0xFF1E1B4B) else MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .background(
                                        if (isBroadcasting) Color(0xFF10B981) else Color.Gray,
                                        CircleShape
                                    )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                if (isBroadcasting) "BROADCASTING ACTIVE" else "BROADCASTER READY",
                                fontWeight = FontWeight.Bold,
                                color = if (isBroadcasting) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        val mins = remainingSeconds / 60
                        val secs = remainingSeconds % 60
                        Text(
                            String.format("%02d:%02d", mins, secs),
                            fontWeight = FontWeight.Bold,
                            color = if (isBroadcasting) Color(0xFF818CF8) else Color.Gray,
                            fontSize = 18.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        "Course: CS-401 Distributed Computing & BLE",
                        color = if (isBroadcasting) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "Room: Lab 304 | Beacon UUID: 0xFD2A",
                        color = if (isBroadcasting) Color(0xFF94A3B8) else Color.Gray,
                        style = MaterialTheme.typography.bodySmall
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Advertising telemetry
                    when (val state = advertisingState) {
                        is AdvertisingState.Advertising -> {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF312E81))
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Rotating Payload (20B AD Frame):", color = Color(0xFFA5B4FC), style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        state.payloadHex,
                                        color = Color.White,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 11.sp
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Window Slot: ${state.windowIndex} (Rotates every 30s)", color = Color(0xFFC7D2FE), style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                        is AdvertisingState.Error -> {
                            Text("Advertiser Notice: ${state.message}", color = Color(0xFFFCA5A5), style = MaterialTheme.typography.bodySmall)
                        }
                        else -> {}
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isBroadcasting) {
                        Button(
                            onClick = { startBeacon() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Start BLE Attendance Beacon")
                        }
                    } else {
                        Button(
                            onClick = { stopBeacon() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Stop Beacon & End Session")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Live Attendance List Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Live Attendees", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Badge(containerColor = Color(0xFF10B981)) {
                    Text("${attendees.size} Present", modifier = Modifier.padding(4.dp), color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (attendees.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No students checked in yet. Proximity beacons are transmitting.", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(attendees) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981))
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(item.studentName, fontWeight = FontWeight.SemiBold)
                                        Text(item.registrationNumber, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    }
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "${item.observedRssi ?: -65.0} dBm",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF0D9488)
                                    )
                                    Text(
                                        "~${item.estimatedDistanceM ?: 1.5}m",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.Gray
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
