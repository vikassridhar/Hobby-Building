# 🤖 Android Setup Guide — TravelApp

## What's Already Installed

On this machine (Debian ARM64 Linux):
- ✅ **JDK 21** at `~/jdk-21/`
- ✅ **Android SDK** at `~/android-sdk/`
  - `platform-tools` (adb, fastboot)
  - `platforms;android-34` and `platforms;android-36`
  - `build-tools;34.0.0` and `build-tools;36.0.0`
- ✅ **Capacitor Android project** at `android/`

## ⚠️ ARM64 Build Limitation

The Android build tools (aapt2) are **x86-64 only binaries**. On this ARM64 machine, the Gradle build will fail at the `processDebugResources` step because aapt2 can't execute.

### Solutions:

#### Option A: Build on x86-64 machine
Copy the project to an Intel/AMD Linux machine or CI runner:

```bash
# On x86-64 machine
cd ota-app
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
npm install
npx vite build
npx cap sync android
cd android && ./gradlew assembleDebug

# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option B: Use QEMU user-mode emulation
```bash
# Install QEMU x86-64 emulation (requires root)
apt-get install qemu-user-static

# aapt2 and other x86 tools will run via QEMU translation
./gradlew assembleDebug  # Should work with QEMU
```

#### Option C: Build on your Mac (recommended)
Your MacBook Pro (Apple Silicon) can run Android Studio natively:

```bash
# 1. Install Android Studio on Mac
# Download from: https://developer.android.com/studio

# 2. Open the android/ folder in Android Studio
npx cap open android

# 3. Android Studio handles SDK, build tools, and emulator natively
# 4. Build → Make Project (⌘F9)
# 5. Run → Run 'app' (⌃R) on emulator or device
```

## Running the Android Emulator

### On macOS with Android Studio:
1. Open Android Studio → Tools → Device Manager
2. Create Virtual Device → Pixel 7 → Android 34 → ARM64 (matching your Mac)
3. Start the emulator
4. Run the app from Android Studio or:
```bash
npx cap run android
```

### On x86-64 Linux:
```bash
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# Create AVD
avdmanager create avd -n Pixel7 -k "system-images;android-34;google_apis;arm64-v8a" -d "pixel_7"

# Start emulator
emulator -avd Pixel7 -no-window -no-audio &
npx cap run android
```

## Quick Commands

```bash
# Sync web assets to Android project
npx cap sync android

# Open in Android Studio (Mac)
npx cap open android

# Build debug APK (x86-64 only)
cd android && ./gradlew assembleDebug

# Install APK on connected device
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Live Reload (Development)

```bash
# Start web dev server
npx vite --host 0.0.0.0

# In another terminal, run on device/emulator with live reload
npx cap run android --livereload --external
```
