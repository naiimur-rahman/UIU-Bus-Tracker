package com.uiubustracker

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface

class WebAppInterface(private val mContext: Context) {

    @JavascriptInterface
    fun startService() {
        val serviceIntent = Intent(mContext, LocationService::class.java)
        serviceIntent.action = LocationService.ACTION_START
        mContext.startForegroundService(serviceIntent)
    }

    @JavascriptInterface
    fun stopService() {
        val serviceIntent = Intent(mContext, LocationService::class.java)
        serviceIntent.action = LocationService.ACTION_STOP
        mContext.startService(serviceIntent)
    }
}
