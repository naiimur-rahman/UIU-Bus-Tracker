package com.uiubustracker.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.SharedPreferences;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class NativeLocationBroadcastService extends Service {
    public static final String ACTION_START = "com.uiubustracker.app.NativeLocationBroadcast.START";
    public static final String ACTION_UPDATE = "com.uiubustracker.app.NativeLocationBroadcast.UPDATE";
    public static final String ACTION_STOP = "com.uiubustracker.app.NativeLocationBroadcast.STOP";
    public static final String EXTRA_BUS_JSON = "bus_json";
    public static final String EXTRA_DATABASE_URL = "database_url";
    public static final String EXTRA_PATH = "path";

    private static final String CHANNEL_ID = "uiu_bus_native_location";
    private static final int NOTIFICATION_ID = 44021;
    private static final long MIN_SEND_INTERVAL_MS = 1500L;
    private static final String PREFS_NAME = "native_location_broadcast";
    private static final String PREF_BUS_JSON = "bus_json";
    private static final String PREF_DATABASE_URL = "database_url";
    private static final String PREF_PATH = "path";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private DatabaseReference locationRef;
    private JSONObject busJson;
    private long lastSentAt;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            if (intent == null && restoreFromPrefs()) {
                startForegroundCompat();
                configureFirebase(
                    getPrefs().getString(PREF_DATABASE_URL, null),
                    getPrefs().getString(PREF_PATH, "locations")
                );
                startLocationUpdates();
                return START_STICKY;
            }
            stopBroadcast();
            return START_NOT_STICKY;
        }

        if (intent.hasExtra(EXTRA_BUS_JSON)) {
            try {
                busJson = new JSONObject(intent.getStringExtra(EXTRA_BUS_JSON));
                getPrefs().edit().putString(PREF_BUS_JSON, busJson.toString()).apply();
            } catch (JSONException e) {
                stopBroadcast();
                return START_NOT_STICKY;
            }
        }

        if (ACTION_START.equals(intent.getAction())) {
            startForegroundCompat();
            String databaseUrl = intent.getStringExtra(EXTRA_DATABASE_URL);
            String path = intent.getStringExtra(EXTRA_PATH);
            getPrefs().edit()
                .putString(PREF_DATABASE_URL, databaseUrl)
                .putString(PREF_PATH, path == null ? "locations" : path)
                .apply();
            configureFirebase(databaseUrl, path == null ? "locations" : path);
            startLocationUpdates();
        }

        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void configureFirebase(String databaseUrl, String path) {
        if (busJson == null || databaseUrl == null) return;
        FirebaseAuth.getInstance().signInAnonymously().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) return;
            String busId = busJson.optString("id", null);
            if (busId == null) return;
            locationRef = FirebaseDatabase.getInstance(databaseUrl).getReference(path).child(busId);
        });
    }

    private boolean restoreFromPrefs() {
        String savedBusJson = getPrefs().getString(PREF_BUS_JSON, null);
        if (savedBusJson == null) return false;
        try {
            busJson = new JSONObject(savedBusJson);
            return busJson.optString("id", null) != null;
        } catch (JSONException e) {
            return false;
        }
    }

    private SharedPreferences getPrefs() {
        return getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
    }

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopBroadcast();
            return;
        }

        if (locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        LocationRequest request = new LocationRequest.Builder(LocationRequest.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(1000L)
            .setMaxUpdateDelayMillis(1000L)
            .setMinUpdateDistanceMeters(0f)
            .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location != null) {
                    sendLocation(location);
                }
            }
        };

        fusedLocationClient.requestLocationUpdates(request, locationCallback, getMainLooper());
    }

    private void sendLocation(Location location) {
        if (locationRef == null || busJson == null) return;
        long now = System.currentTimeMillis();
        if (now - lastSentAt < MIN_SEND_INTERVAL_MS) return;
        if (location.hasAccuracy() && location.getAccuracy() > 150f) return;
        lastSentAt = now;

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", busJson.optString("id"));
        payload.put("route", busJson.optString("route"));
        payload.put("username", busJson.optString("username"));
        payload.put("cap", busJson.optString("cap", "seats"));
        if (busJson.has("msg") && !busJson.isNull("msg")) {
            payload.put("msg", busJson.optString("msg"));
        } else {
            payload.put("msg", null);
        }
        payload.put("lat", location.getLatitude());
        payload.put("lng", location.getLongitude());
        payload.put("acc", location.hasAccuracy() ? location.getAccuracy() : 10f);
        payload.put("speed", String.format(java.util.Locale.US, "%.1f", location.hasSpeed() ? location.getSpeed() * 3.6f : 0f));
        payload.put("ts", now);

        locationRef.setValue(payload);
    }

    private void stopBroadcast() {
        if (locationCallback != null && fusedLocationClient != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            locationCallback = null;
        }
        if (locationRef != null) {
            locationRef.removeValue();
            locationRef = null;
        }
        getPrefs().edit().clear().apply();
        stopForeground(true);
        stopSelf();
    }

    private void startForegroundCompat() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_tracker)
            .setContentTitle("UIU Bus Tracker Active")
            .setContentText("Sharing live location with students.")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE);

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "UIU Bus Live Tracking",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setSound(null, null);
        channel.enableVibration(false);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
