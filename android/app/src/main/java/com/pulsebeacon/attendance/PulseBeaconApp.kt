package com.pulsebeacon.attendance

import android.app.Application
import com.pulsebeacon.attendance.data.repository.AttendanceRepository

class PulseBeaconApp : Application() {
    lateinit var repository: AttendanceRepository
        private set

    override fun onCreate() {
        super.onCreate()
        repository = AttendanceRepository.getInstance(this)
    }
}
