package com.uiubustracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.CountDownTimer
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.util.Locale

class LocationService : Service(), LocationListener {

    private var locationManager: LocationManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var isBroadcasting = false

    // 30 Minutes in Milliseconds
    private val TIMEOUT_MS = 30 * 60 * 1000L
    private var timer: CountDownTimer? = null

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val CHANNEL_ID = "LocationServiceChannel"

        // Broadcast to Activity
        const val ACTION_LOCATION_UPDATE = "com.uiubustracker.LOCATION_UPDATE"
        const val ACTION_SERVICE_STOPPED = "com.uiubustracker.SERVICE_STOPPED"
        const val EXTRA_LAT = "lat"
        const val EXTRA_LNG = "lng"
        const val EXTRA_ACC = "acc"
        const val EXTRA_SPEED = "speed"
    }

    override fun onBind(intent: Intent): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                ACTION_START -> startLocationUpdates()
                ACTION_STOP -> stopLocationUpdates()
            }
        }
        return START_STICKY
    }

    private fun startLocationUpdates() {
        if (isBroadcasting) return
        isBroadcasting = true

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("UIU Bus Tracker")
            .setContentText("Broadcasting location in background...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW) // Silent
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(1, notification)
        }

        // Acquire WakeLock
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "UIUBusTracker::Wakelock")
        wakeLock?.acquire(TIMEOUT_MS + 60000) // Acquire for slightly more than 30 mins

        try {
            locationManager?.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                2000L, // 2 seconds
                5f,    // 5 meters
                this
            )
            locationManager?.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                5000L,
                10f,
                this
            )
        } catch (e: SecurityException) {
            e.printStackTrace()
        }

        // Start 30 min timer
        startTimer()
    }

    private fun stopLocationUpdates() {
        isBroadcasting = false
        try {
            locationManager?.removeUpdates(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null

        timer?.cancel()
        timer = null

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()

        // Notify Activity to update UI
        val intent = Intent(ACTION_SERVICE_STOPPED)
        sendBroadcast(intent)
    }

    private fun startTimer() {
        timer?.cancel()
        timer = object : CountDownTimer(TIMEOUT_MS, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                // Optional: Broadcast remaining time
            }

            override fun onFinish() {
                stopLocationUpdates()
            }
        }.start()
    }

    override fun onLocationChanged(location: Location) {
        if (!isBroadcasting) return

        val intent = Intent(ACTION_LOCATION_UPDATE).apply {
            putExtra(EXTRA_LAT, location.latitude)
            putExtra(EXTRA_LNG, location.longitude)
            putExtra(EXTRA_ACC, location.accuracy)
            putExtra(EXTRA_SPEED, location.speed)
        }
        sendBroadcast(intent)
    }

    // Boilerplate
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Location Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }
}
