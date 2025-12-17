import { BackgroundGeolocation } from '@capgo/background-geolocation';
import { Capacitor } from '@capacitor/core';

let backgroundWatcherId = null;

/**
 * Starts background tracking.
 * This function requests permissions and adds a watcher.
 * @param {Function} onLocationUpdate - Callback function receiving location data { latitude, longitude, accuracy, speed, bearing, time }.
 */
export async function startBackgroundTracking(onLocationUpdate) {
  try {
    // 1. Request Permissions
    // The plugin handles permission requests automatically on addWatcher, but we can be explicit.
    // However, for Android 14+, we need to ensure the manifest is correct (handled in step 5).

    // 2. Add Watcher
    // We use addWatcher which automatically starts the service if needed.
    // We configure the notification directly here.
    backgroundWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "Sharing your location with students.",
        backgroundTitle: "UIU Bus Tracker Active",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10 // Update every 10 meters
      },
      (location, error) => {
        if (error) {
          if (error.code === "NOT_AUTHORIZED") {
             if (window.confirm("This app needs your location to track the bus. Would you like to open settings to enable it?")) {
                 BackgroundGeolocation.openSettings();
             }
          }
          console.error("Background Geolocation Error:", error);
          return;
        }

        console.log("Background Location:", location);

        // Normalize data to match the browser's GeolocationPosition interface if possible
        // or just pass the raw data.
        // The existing app expects: { coords: { latitude, longitude, accuracy, speed } }
        // The plugin returns: { latitude, longitude, accuracy, speed, bearing, time, ... }

        const position = {
            coords: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                speed: location.speed, // might be null
                heading: location.bearing,
                altitude: location.altitude
            },
            timestamp: location.time || Date.now()
        };

        if (onLocationUpdate) {
            onLocationUpdate(position);
        }
      }
    );

    console.log("Background tracking started with watcher ID:", backgroundWatcherId);
    return true;

  } catch (err) {
    console.error("Failed to start background tracking:", err);
    alert("Failed to start background tracking: " + err.message);
    return false;
  }
}

/**
 * Stops background tracking.
 */
export async function stopBackgroundTracking() {
  if (backgroundWatcherId) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherId });
      backgroundWatcherId = null;
      console.log("Background tracking stopped.");
    } catch (err) {
      console.error("Error stopping background tracking:", err);
    }
  }
}

/**
 * Check if the app is running natively.
 */
export function isNativeApp() {
    return Capacitor.isNativePlatform();
}
