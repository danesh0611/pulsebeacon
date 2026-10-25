package com.pulsebeacon.attendance.data.repository

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.pulsebeacon.attendance.data.api.AttendanceApiService
import com.pulsebeacon.attendance.data.model.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class AttendanceRepository private constructor(context: Context) {

    companion object {
        @Volatile
        private var instance: AttendanceRepository? = null

        fun getInstance(context: Context): AttendanceRepository {
            return instance ?: synchronized(this) {
                instance ?: AttendanceRepository(context.applicationContext).also { instance = it }
            }
        }

        // Default local backend host - points to host machine when using Android Emulator (10.0.2.2)
        const val BASE_URL = "http://10.0.2.2:8000/"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "pulsebeacon_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val api: AttendanceApiService

    init {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        api = retrofit.create(AttendanceApiService::class.java)
    }

    fun saveAuthToken(token: String, role: String, fullName: String, idCode: String?) {
        prefs.edit()
            .putString("auth_token", token)
            .putString("user_role", role)
            .putString("full_name", fullName)
            .putString("id_code", idCode ?: "")
            .apply()
    }

    fun getAuthToken(): String? {
        val token = prefs.getString("auth_token", null) ?: return null
        return "Bearer $token"
    }

    fun getUserRole(): String? = prefs.getString("user_role", null)
    fun getUserFullName(): String? = prefs.getString("full_name", null)
    fun getUserIdCode(): String? = prefs.getString("id_code", null)

    fun logout() {
        prefs.edit().clear().apply()
    }

    suspend fun getActiveSessions(): Result<List<ActiveSession>> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = api.getActiveSessions(token)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch sessions"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitBleCheckIn(
        sessionId: Int,
        payloadHex: String,
        observedRssi: Float
    ): Result<BleCheckInResponse> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val req = BleCheckInRequest(
                sessionId = sessionId,
                blePayloadHex = payloadHex,
                observedRssi = observedRssi
            )
            val response = api.verifyBleCheckIn(token, req)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val err = response.errorBody()?.string() ?: "Check-in failed"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getBroadcastToken(sessionId: Int): Result<BroadcastTokenResponse> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = api.getSessionBroadcastToken(token, sessionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch broadcast token"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSessionRecords(sessionId: Int): Result<List<AttendanceRecordItem>> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = api.getSessionAttendanceRecords(token, sessionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch attendance records"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
