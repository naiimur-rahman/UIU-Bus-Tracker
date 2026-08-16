#!/bin/bash
set -e

echo "1. Installing Java 21 via Homebrew..."
brew install openjdk@21
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"

echo "2. Setting up Android SDK directories..."
export ANDROID_HOME="$HOME/Library/Android/sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "3. Downloading Android Command Line Tools..."
    curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-mac-10406996_latest.zip
    unzip -q cmdline-tools.zip -d "$ANDROID_HOME/cmdline-tools/"
    mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
    rm cmdline-tools.zip
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "4. Accepting Android Licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true

echo "5. Installing required Android SDK packages..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "6. Building the APK..."
cd android
./gradlew assembleDebug

echo "==================================="
echo "DONE! Your APK is ready at: android/app/build/outputs/apk/debug/app-debug.apk"
echo "==================================="
