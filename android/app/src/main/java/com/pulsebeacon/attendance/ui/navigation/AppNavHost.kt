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
import com.pulsebeacon.attendance.ui.screens.student.BleScanScreen
import com.pulsebeacon.attendance.ui.screens.student.StudentHomeScreen
import com.pulsebeacon.attendance.ui.screens.faculty.SessionBroadcastScreen

sealed class Screen(val route: String) {
    object StudentHome : Screen("student_home")
    object StudentScan : Screen("student_scan/{sessionId}/{sessionTag}/{rssiCutoff}") {
        fun createRoute(sessionId: Int, sessionTag: String, rssiCutoff: Float) =
            "student_scan/$sessionId/$sessionTag/$rssiCutoff"
    }
    object FacultyBroadcast : Screen("faculty_broadcast/{sessionId}/{sessionCode}/{duration}") {
        fun createRoute(sessionId: Int, sessionCode: String, duration: Int) =
            "faculty_broadcast/$sessionId/$sessionCode/$duration"
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
    val isFaculty = repository.getUserRole() == "FACULTY"
    val startDestination = if (isFaculty) "faculty_home" else Screen.StudentHome.route

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.StudentHome.route) {
            StudentHomeScreen(
                repository = repository,
                onNavigateToScan = { sessionId, sessionTag, rssiCutoff ->
                    navController.navigate(Screen.StudentScan.createRoute(sessionId, sessionTag, rssiCutoff))
                },
                onSwitchRole = {
                    navController.navigate("faculty_home") {
                        popUpTo(Screen.StudentHome.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.StudentScan.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.IntType },
                navArgument("sessionTag") { type = NavType.StringType },
                navArgument("rssiCutoff") { type = NavType.FloatType }
            )
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getInt("sessionId") ?: 0
            val sessionTag = backStackEntry.arguments?.getString("sessionTag") ?: ""
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

        composable("faculty_home") {
            SessionBroadcastScreen(
                repository = repository,
                bleAdvertiser = bleAdvertiser,
                hasPermissions = hasPermissions,
                onRequestPermissions = onRequestPermissions,
                onSwitchRole = {
                    navController.navigate(Screen.StudentHome.route) {
                        popUpTo("faculty_home") { inclusive = true }
                    }
                }
            )
        }
    }
}
