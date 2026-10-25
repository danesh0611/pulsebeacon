package com.pulsebeacon.attendance.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.pulsebeacon.attendance.ble.BleAdvertiser
import com.pulsebeacon.attendance.ble.BleScanner
import com.pulsebeacon.attendance.data.repository.AttendanceRepository
import com.pulsebeacon.attendance.ui.screens.auth.LoginScreen
import com.pulsebeacon.attendance.ui.screens.faculty.SessionBroadcastScreen
import com.pulsebeacon.attendance.ui.screens.student.BleScanScreen
import com.pulsebeacon.attendance.ui.screens.student.StudentHomeScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object StudentHome : Screen("student_home")
    object FacultyHome : Screen("faculty_home")
    object StudentScan : Screen("student_scan/{sessionId}/{sessionTag}/{rssiCutoff}") {
        fun createRoute(sessionId: Int, sessionTag: String, rssiCutoff: Float) =
            "student_scan/$sessionId/$sessionTag/$rssiCutoff"
    }
}

@Composable
fun AppNavHost(
    repository: AttendanceRepository,
    bleScanner: BleScanner,
    bleAdvertiser: BleAdvertiser,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit
) {
    val navController = rememberNavController()

    // Determine start destination: If not logged in, go to LoginScreen!
    val startDestination = if (!repository.isLoggedIn()) {
        Screen.Login.route
    } else if (repository.getUserRole() == "FACULTY") {
        Screen.FacultyHome.route
    } else {
        Screen.StudentHome.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Login Screen
        composable(Screen.Login.route) {
            LoginScreen(
                repository = repository,
                onLoginSuccess = { role ->
                    val targetRoute = if (role == "FACULTY") Screen.FacultyHome.route else Screen.StudentHome.route
                    navController.navigate(targetRoute) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // Student Home Screen
        composable(Screen.StudentHome.route) {
            StudentHomeScreen(
                repository = repository,
                onNavigateToScan = { sessionId, sessionTag, rssiCutoff ->
                    navController.navigate(Screen.StudentScan.createRoute(sessionId, sessionTag, rssiCutoff))
                },
                onSwitchRole = {
                    navController.navigate(Screen.FacultyHome.route) {
                        popUpTo(Screen.StudentHome.route) { inclusive = true }
                    }
                },
                onLogout = {
                    repository.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // Student BLE Radar Scanning Screen
        composable(
            route = Screen.StudentScan.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.IntType },
                navArgument("sessionTag") { type = NavType.StringType },
                navArgument("rssiCutoff") { type = NavType.FloatType }
            )
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getInt("sessionId") ?: 1
            val sessionTag = backStackEntry.arguments?.getString("sessionTag") ?: "FD2A01"
            val rssiCutoff = backStackEntry.arguments?.getFloat("rssiCutoff") ?: -78.0f

            BleScanScreen(
                sessionId = sessionId,
                sessionTag = sessionTag,
                rssiCutoff = rssiCutoff,
                repository = repository,
                bleScanner = bleScanner,
                hasPermissions = hasPermissions,
                onRequestPermissions = onRequestPermissions,
                onBack = { navController.popBackStack() }
            )
        }

        // Faculty Broadcast Screen
        composable(Screen.FacultyHome.route) {
            SessionBroadcastScreen(
                repository = repository,
                bleAdvertiser = bleAdvertiser,
                hasPermissions = hasPermissions,
                onRequestPermissions = onRequestPermissions,
                onSwitchRole = {
                    navController.navigate(Screen.StudentHome.route) {
                        popUpTo(Screen.FacultyHome.route) { inclusive = true }
                    }
                },
                onLogout = {
                    repository.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
