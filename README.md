# UIU Bus Tracker - Zero to Hero Build Guide

This guide provides complete instructions to set up, build, and run the UIU Bus Tracker application on Android using Capacitor.

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

1.  **Node.js & npm** (Long Term Support version recommended)
    *   Download: [https://nodejs.org/](https://nodejs.org/)
    *   Verify: `node -v` and `npm -v` in your terminal.

2.  **Android Studio** (For building the Android App)
    *   Download: [https://developer.android.com/studio](https://developer.android.com/studio)
    *   During installation, ensure **Android SDK**, **Android SDK Command-line Tools**, and **Android SDK Build-Tools** are selected.

3.  **Git** (To clone the repository)
    *   Download: [https://git-scm.com/](https://git-scm.com/)

## 2. Project Setup

Open your terminal or command prompt and follow these steps:

### Clone the Repository
```bash
git clone https://github.com/naiimur-rahman/UIU-Bus-Tracker.git
cd UIU-Bus-Tracker
```

### Install Dependencies
Install the required Node.js packages (Vite, Capacitor, Plugins):
```bash
npm install
```

## 3. Web Development (Optional)

To run the web version of the app in your browser for testing UI changes:
```bash
npx vite
```
This will start a local server (usually at `http://localhost:5173`).

## 4. Building for Android

This project uses **Capacitor** to wrap the web application into a native Android app.

### Step 1: Build Web Assets
Compile the HTML, CSS, and JS into the `dist` folder:
```bash
npm run build
```

### Step 2: Sync with Capacitor
Copy the built web assets and plugins to the native Android project:
```bash
npx cap sync
```

### Step 3: Open in Android Studio
Open the native project in Android Studio to configure signing or run on a device:
```bash
npx cap open android
```

## 5. Running on a Real Device

Background geolocation works best on a real device.

1.  **Enable Developer Options** on your Android phone:
    *   Go to **Settings** > **About Phone**.
    *   Tap **Build Number** 7 times.
    *   Go back to **Settings** > **System** > **Developer Options**.
    *   Enable **USB Debugging**.

2.  **Connect your phone** to your computer via USB.

3.  **Run the App**:
    *   In Android Studio, select your device from the dropdown menu in the toolbar.
    *   Click the green **Run (Play)** button.
    *   **OR** run via command line:
        ```bash
        npx cap run android
        ```

## 6. Permissions & Testing

When the app launches on your phone:
1.  Go to the **"Start a Trip"** section.
2.  Select a route and click **"Confirm"**.
3.  Click **"START TRIP"**.
4.  **Grant Permissions**: The app will ask for:
    *   Notification Permission (to show the "Tracking Active" notification).
    *   Location Permission (Select **"Allow all the time"** or **"Allow in settings"** if prompted, as background tracking requires "Always" access on some Android versions, though "While using the app" + Foreground Service is usually sufficient for this implementation).
5.  **Lock your screen**. The app should continue broadcasting your location, visible via the persistent notification.

## Troubleshooting

*   **"SDK location not found":** Set the `ANDROID_HOME` environment variable to your Android SDK path (e.g., `%LOCALAPPDATA%\Android\Sdk` on Windows or `~/Library/Android/sdk` on macOS).
*   **Gradle Errors:** Try syncing Gradle in Android Studio (File > Sync Project with Gradle Files).
*   **White Screen:** Ensure `npm run build` was run before `npx cap sync`.

## Project Structure

*   `index.html`: Main application entry point.
*   `src/background.js`: Native background geolocation logic.
*   `android/`: Native Android project files (managed by Capacitor).
*   `dist/`: Compiled web assets (created after build).
