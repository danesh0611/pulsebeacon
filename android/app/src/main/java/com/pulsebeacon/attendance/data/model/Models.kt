package com.pulsebeacon.attendance.data.model

import com.google.gson.annotations.SerializedName

enum class UserRole {
    @SerializedName("STUDENT") STUDENT,
    @SerializedName("FACULTY") FACULTY,
    @SerializedName("ADMIN") ADMIN
}

enum class AttendanceStatus {
    @SerializedName("VERIFIED") VERIFIED,
    @SerializedName("REJECTED") REJECTED,
    @SerializedName("MANUAL_OVERRIDE") MANUAL_OVERRIDE
}

data class AuthTokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    @SerializedName("role") val role: UserRole,
    @SerializedName("user_id") val userId: Int,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String,
    @SerializedName("registration_or_emp_id") val registrationOrEmpId: String?
)

data class ActiveSession(
    @SerializedName("id") val id: Int,
    @SerializedName("session_code") val sessionCode: String,
    @SerializedName("course_code") val courseCode: String,
    @SerializedName("course_title") val courseTitle: String,
    @SerializedName("faculty_name") val facultyName: String,
    @SerializedName("room_number") val roomNumber: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("ble_service_uuid") val bleServiceUuid: String,
    @SerializedName("ble_session_tag_hex") val bleSessionTagHex: String,
    @SerializedName("rssi_threshold") val rssiThreshold: Float,
    @SerializedName("already_checked_in") val alreadyCheckedIn: Boolean
)

data class BleCheckInRequest(
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("ble_payload_hex") val blePayloadHex: String,
    @SerializedName("observed_rssi") val observedRssi: Float,
    @SerializedName("device_model") val deviceModel: String? = android.os.Build.MODEL
)

data class BleCheckInResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("status") val status: AttendanceStatus,
    @SerializedName("message") val message: String,
    @SerializedName("check_in_time") val checkInTime: String,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("registration_number") val registrationNumber: String,
    @SerializedName("course_title") val courseTitle: String,
    @SerializedName("estimated_distance_m") val estimatedDistanceM: Float,
    @SerializedName("observed_rssi") val observedRssi: Float
)

data class BroadcastTokenResponse(
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("session_code") val sessionCode: String,
    @SerializedName("service_uuid") val serviceUuid: String,
    @SerializedName("payload_hex") val payloadHex: String,
    @SerializedName("salt_hex") val saltHex: String,
    @SerializedName("rssi_threshold") val rssiThreshold: Float,
    @SerializedName("remaining_seconds") val remainingSeconds: Int,
    @SerializedName("refresh_interval_seconds") val refreshIntervalSeconds: Int
)

data class AttendanceRecordItem(
    @SerializedName("id") val id: Int,
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("registration_number") val registrationNumber: String,
    @SerializedName("check_in_time") val checkInTime: String,
    @SerializedName("status") val status: AttendanceStatus,
    @SerializedName("verification_method") val verificationMethod: String,
    @SerializedName("observed_rssi") val observedRssi: Float?,
    @SerializedName("estimated_distance_m") val estimatedDistanceM: Float?,
    @SerializedName("override_reason") val overrideReason: String?
)
