package com.pulsebeacon.attendance.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pulsebeacon.attendance.data.repository.AttendanceRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    repository: AttendanceRepository,
    onLoginSuccess: (role: String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var emailOrRegNo by remember { mutableStateOf("alex.rivera@university.edu") }
    var password by remember { mutableStateOf("student123") }
    var passwordVisible by remember { mutableStateOf(false) }
    var selectedRole by remember { mutableStateOf("STUDENT") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showServerConfig by remember { mutableStateOf(false) }
    var serverUrl by remember { mutableStateOf(AttendanceRepository.BASE_URL) }

    fun selectPreset(role: String, user: String, pass: String) {
        selectedRole = role
        emailOrRegNo = user
        password = pass
        errorMessage = null
    }

    fun performLogin(useDemoMode: Boolean = false) {
        scope.launch {
            isLoading = true
            errorMessage = null
            val result = repository.login(
                emailOrReg = emailOrRegNo.trim(),
                password = password.trim(),
                roleHint = selectedRole,
                forceOfflineDemo = useDemoMode,
                customServerUrl = serverUrl.trim()
            )
            isLoading = false
            result.onSuccess { role ->
                onLoginSuccess(role)
            }.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Invalid credentials or server unreachable"
            }
        }
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // App Icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.BluetoothSearching,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "PulseBeacon Attendance",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Text(
                "Bluetooth Low Energy Proximity Verification",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Quick Role Preset Chips
            Text(
                "Quick Select Role:",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.align(Alignment.Start)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedRole == "STUDENT",
                    onClick = {
                        selectPreset("STUDENT", "alex.rivera@university.edu", "student123")
                    },
                    label = { Text("🎓 Student") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = selectedRole == "FACULTY",
                    onClick = {
                        selectPreset("FACULTY", "prof.rostova@university.edu", "faculty123")
                    },
                    label = { Text("👨‍🏫 Faculty") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Email or Reg No
            OutlinedTextField(
                value = emailOrRegNo,
                onValueChange = { emailOrRegNo = it },
                label = { Text(if (selectedRole == "STUDENT") "Email or Reg. Number (e.g. 21BCE1001)" else "University Faculty Email") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Password
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            errorMessage ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Sign In Button
            Button(
                onClick = { performLogin(useDemoMode = false) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = !isLoading && emailOrRegNo.isNotBlank() && password.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Verifying...")
                } else {
                    Text("Sign In to University Portal", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Standalone Offline / Direct BLE Test Button
            OutlinedButton(
                onClick = { performLogin(useDemoMode = true) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Instant Test Mode (No Server Needed)")
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Advanced Server Settings Toggle
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { showServerConfig = !showServerConfig }
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    if (showServerConfig) "Hide Server URL Config" else "Configure Server Endpoint",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray
                )
            }

            if (showServerConfig) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("Backend Base URL") },
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Text(
                    "Use your computer's local Wi-Fi IP (e.g., http://192.168.1.15:8000/) or the cloud backend URL.",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
