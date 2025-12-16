# UIU Bus Tracker

A real-time bus tracking application for United International University (UIU), designed to help students track campus transport and drivers to broadcast their location.

## Features

*   **Real-time Tracking:** Live map view of all active buses.
*   **Driver Dashboard:** dedicated interface for drivers to broadcast location.
*   **Background Broadcasting (Android):** Keep broadcasting even when the phone is locked.
*   **Auto-Disconnect:** Broadcasting automatically stops after 30 minutes to save battery.
*   **Dynamic Speed:** Moving average speed calculation for smooth display.
*   **Glassmorphism UI:** Modern, aesthetic interface.

## Web Application

The web application is a single-file SPA (`index.html`) that uses:
*   **Tailwind CSS** (Styling)
*   **Leaflet.js** (Maps)
*   **HiveMQ** (MQTT for Real-time data)

Just open `index.html` in a browser to run the web version.

## Android App Setup

This project includes a native Android wrapper to enable reliable background location broadcasting.

### Prerequisites

*   **Android Studio** (Latest version recommended)
*   Android SDK installed (API Level 34 / Android 14)

### How to Build & Run

1.  **Open Project in Android Studio:**
    *   Launch Android Studio.
    *   Select **Open**.
    *   Navigate to the `android/` folder in this repository and select it.
    *   *Note: Do not open the root repository folder, select the `android` subdirectory.*

2.  **Sync Gradle:**
    *   Android Studio should automatically start syncing Gradle files.
    *   Wait for the sync to complete successfully.

3.  **Run the App:**
    *   Connect an Android device via USB (with USB Debugging enabled) or use an Emulator.
    *   Click the green **Run** button (Play icon) in the toolbar.

### Troubleshooting

*   **Location Permissions:** If the app doesn't start broadcasting, ensure you have granted "Allow all the time" or "Allow only while using the app" location permissions in Android Settings.
*   **Background Restrictions:** On some devices (Xiaomi, OnePlus), you may need to disable "Battery Saver" for this app to allow the background service to run without interruption.
