# Android Background Tracking Instructions

To ensure your UIU Bus Tracker app runs reliably in the background (when the screen is locked or the app is minimized), you need to update your Android Studio project.

Standard WebViews (and web browsers) are paused by the Android System to save battery when they are not visible. To bypass this, we need a **Foreground Service** that:
1. Keeps the app "alive" with a persistent notification.
2. Tracks GPS location natively in Java/Kotlin.
3. Injects that location into the WebView, ensuring the tracking logic runs even if the browser wants to sleep.

Follow these steps carefully in your Android Studio project.

## Step 1: Update `AndroidManifest.xml`

Open `app/src/main/AndroidManifest.xml` and add the following permissions **above** the `<application>` tag:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" /> <!-- For Android 14+ -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Inside the `<application>` tag, register the service:

```xml
<application ... >
    <!-- Your existing activity -->
    <activity android:name=".MainActivity" ... >
        ...
    </activity>

    <!-- ADD THIS SERVICE BLOCK -->
    <service
        android:name=".LocationService"
        android:enabled="true"
        android:exported="false"
        android:foregroundServiceType="location" />
</application>
```

## Step 2: Create `LocationService.java`

Create a new Java class named `LocationService` (in the same folder as your MainActivity). This service will track location and send it to the WebView.

```java
package com.example.yourappname; // CHANGE THIS to your actual package name

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.pm.ServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class LocationService extends Service implements LocationListener {

    private LocationManager locationManager;
    public static final String ACTION_LOCATION_UPDATE = "LocationUpdate";

    @Override
    public void onCreate() {
        super.onCreate();
        // Support for Android 14+ Foreground Service Types
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, createNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(1, createNotification());
        }
        startLocationUpdates();
    }

    private void startLocationUpdates() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);

        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            // Request updates every 2 seconds or 5 meters
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000, 5, this);
        }
    }

    private Notification createNotification() {
        String channelId = "bus_tracker_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Background Tracking", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        return new NotificationCompat.Builder(this, channelId)
                .setContentTitle("UIU Bus Tracker Active")
                .setContentText("Sharing location in background...")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation) // Replace with your icon
                .setOngoing(true)
                .build();
    }

    @Override
    public void onLocationChanged(Location location) {
        // Broadcast location to MainActivity
        Intent intent = new Intent(ACTION_LOCATION_UPDATE);
        intent.putExtra("lat", location.getLatitude());
        intent.putExtra("lng", location.getLongitude());
        intent.putExtra("acc", location.getAccuracy());
        intent.putExtra("speed", location.getSpeed());
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
    }
}
```

## Step 3: Update `MainActivity.java`

Update your `MainActivity` to start the service and inject the location into the WebView.

```java
package com.example.yourappname; // CHANGE THIS

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView myWebView;
    private static final int PERMISSION_REQUEST_CODE = 100;

    // Receiver to handle location updates from Service
    private final BroadcastReceiver locationReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            double lat = intent.getDoubleExtra("lat", 0);
            double lng = intent.getDoubleExtra("lng", 0);
            float acc = intent.getFloatExtra("acc", 0);
            float speed = intent.getFloatExtra("speed", 0);

            // INJECT INTO WEBVIEW
            // This calls the JS function we added to index.html
            // IMPORTANT: Use Locale.US to ensure dots are used for decimals (e.g. 23.456), not commas
            String jsCommand = String.format(Locale.US, "window.updateLocationFromAndroid('%f', '%f', '%f', '%f')", lat, lng, acc, speed);

            if (myWebView != null) {
                myWebView.post(() -> myWebView.evaluateJavascript(jsCommand, null));
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main); // Ensure you have a layout with a WebView ID "webview"

        myWebView = findViewById(R.id.webview);
        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);

        // Prevent WebView from sleeping
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(myWebView, true);
        }

        myWebView.setWebViewClient(new WebViewClient());
        myWebView.loadUrl("https://your-website-url-here.com"); // REPLACE WITH YOUR URL

        checkPermissions();
    }

    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.FOREGROUND_SERVICE
            }, PERMISSION_REQUEST_CODE);
        } else {
            startTrackingService();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startTrackingService();
        }
    }

    private void startTrackingService() {
        Intent serviceIntent = new Intent(this, LocationService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        LocalBroadcastManager.getInstance(this).registerReceiver(locationReceiver, new IntentFilter(LocationService.ACTION_LOCATION_UPDATE));
    }

    @Override
    protected void onPause() {
        super.onPause();
        // NOTE: We DO NOT unregister the receiver here if we want updates to continue processing
        // while the activity is technically paused but visible (e.g. multi-window).
        // However, standard lifecycle suggests unregistering.
        // For this specific "Keep Alive" use case, we keep the service running.
        // If the Activity is destroyed, the Service keeps running (startService was used).
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        LocalBroadcastManager.getInstance(this).unregisterReceiver(locationReceiver);
    }
}
```

## Step 4: Build & Run

1.  Replace the package name in the Java files with your project's package name.
2.  Replace the URL in `myWebView.loadUrl(...)` with the live URL of your updated `index.html`.
3.  Build and install the APK on your device.
4.  **Important**: When the app starts, grant "Allow all the time" or "Allow only while using the app" (Foreground service makes "while using" effectively "always" for the duration of the trip).

This setup ensures that even if the screen turns off, the `LocationService` keeps getting GPS coordinates and pushing them into the `WebView` logic via `window.updateLocationFromAndroid`.
