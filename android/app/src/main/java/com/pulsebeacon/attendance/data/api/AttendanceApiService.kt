package com.pulsebeacon.attendance.data.api

import com.pulsebeacon.attendance.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface AttendanceApiService {

    @POST("api/auth/login")
    async suspend fun login(
        @Body credentials: Map<String, String>
    ): Response<AuthTokenResponse>

    @POST("api/auth/register")
    suspend fun register(
        @Body registrationData: Map<String, Any>
    ): Response<AuthTokenResponse>

    // Student endpoints
    @GET("api/student/active-sessions")
    suspend fun getActiveSessions(
        @Header("Authorization") token: String
    ): Response<List<ActiveSession>>

    @POST("api/student/verify-ble-checkin")
    suspend fun verifyBleCheckIn(
        @Header("Authorization") token: String,
        @Body request: BleCheckInRequest
    ): Response<BleCheckInResponse>

    @GET("api/student/attendance-history")
    suspend fun getAttendanceHistory(
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // Faculty endpoints
    @GET("api/faculty/sessions/{session_id}/broadcast-token")
    suspend fun getSessionBroadcastToken(
        @Header("Authorization") token: String,
        @Path("session_id") sessionId: Int
    ): Response<BroadcastTokenResponse>

    @GET("api/faculty/sessions/{session_id}/records")
    suspend fun getSessionAttendanceRecords(
        @Header("Authorization") token: String,
        @Path("session_id") sessionId: Int
    ): Response<List<AttendanceRecordItem>>

    @POST("api/faculty/sessions/{session_id}/close")
    suspend fun closeSession(
        @Header("Authorization") token: String,
        @Path("session_id") sessionId: Int
    ): Response<Map<String, Any>>
}
