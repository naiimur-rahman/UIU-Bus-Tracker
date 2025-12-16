package com.uiubustracker

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    // Broadcast Receiver for Location Updates from Service
    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == LocationService.ACTION_LOCATION_UPDATE) {
                val lat = intent.getDoubleExtra(LocationService.EXTRA_LAT, 0.0)
                val lng = intent.getDoubleExtra(LocationService.EXTRA_LNG, 0.0)
                val acc = intent.getFloatExtra(LocationService.EXTRA_ACC, 0f)
                val speed = intent.getFloatExtra(LocationService.EXTRA_SPEED, 0f)

                // Inject into WebView
                injectLocationUpdate(lat, lng, acc, speed)
            } else if (intent?.action == LocationService.ACTION_SERVICE_STOPPED) {
                 runOnUiThread {
                    webView.evaluateJavascript("window.stopBroadcastFromAndroid()", null)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        setupWebView()
        checkPermissions()
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter()
        filter.addAction(LocationService.ACTION_LOCATION_UPDATE)
        filter.addAction(LocationService.ACTION_SERVICE_STOPPED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(locationReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(locationReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(locationReceiver)
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.geolocationEnabled = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        // Bridge to JS
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                callback.invoke(origin, true, false)
            }
        }

        webView.webViewClient = WebViewClient()

        // Load local HTML
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun injectLocationUpdate(lat: Double, lng: Double, acc: Float, speed: Float) {
        val js = "window.updateLocationFromAndroid($lat, $lng, $acc, $speed)"
        runOnUiThread {
            webView.evaluateJavascript(js, null)
        }
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val toRequest = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (toRequest.isNotEmpty()) {
            requestPermissionLauncher.launch(toRequest.toTypedArray())
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            // Good
        } else {
            Toast.makeText(this, "Location permission is required for broadcasting", Toast.LENGTH_LONG).show()
        }
    }

    // Handle back button
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
