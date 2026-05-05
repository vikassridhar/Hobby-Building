# 🍎 Run TravelApp on MacBook Pro — Complete Guide

## Step 0: Get the project onto your Mac

**Option A: SCP from GB10** (if GB10 is reachable via SSH)
```bash
mkdir -p ~/Projects
scp -r node@GB10_LOCAL_IP:/home/node/.openclaw/workspace/ota-app ~/Projects/ota-app
```

**Option B: Download tarball** (I'll serve it via the tunnel)
```bash
mkdir -p ~/Projects && cd ~/Projects
# Download from the Cloudflare tunnel
curl -L -o ota-app.tar.gz https://benchmark-generic-regulation-annie.trycloudflare.com/../ota-app.tar.gz
# OR just copy the files however you prefer
tar xzf ota-app.tar.gz
```

---

## Step 1: Install dependencies
```bash
cd ~/Projects/ota-app
npm install
```

## Step 2: Build the web app
```bash
npx vite build
```
This creates `dist/` with the production bundle.

---

## 📱 iOS Simulator

### Prerequisites
- **Xcode** (from Mac App Store, free)
- Open Xcode once to accept license & install simulators

### Run it
```bash
cd ~/Projects/ota-app
npx cap sync ios          # Sync web assets to iOS project
npx cap open ios          # Opens Xcode
```

In Xcode:
1. Select **App** target (left sidebar)
2. Go to **Signing & Capabilities** → check "Automatically manage signing" → pick your Apple ID team
3. Pick a simulator at top: **iPhone 16 Pro** (or any iOS 17+ device)
4. Press **⌘R** (or click ▶)

The iOS simulator launches with TravelApp. ✅

### Run via CLI (no Xcode GUI needed):
```bash
# List available simulators
xcrun simctl list devices available | grep iPhone

# Run on a specific one
npx cap run ios --target "iPhone 16 Pro"
```

### Test multiple screen sizes:
- **iPhone SE (3rd gen)** — smallest supported screen
- **iPhone 16 Pro** — standard flagship
- **iPhone 16 Pro Max** — large screen
- **iPad Air (M2)** — tablet layout

---

## 🤖 Android Emulator

### Prerequisites
- **Android Studio** — download from https://developer.android.com/studio
- On Apple Silicon Mac, Android Studio runs natively

### First-time Android Studio setup:
1. Open Android Studio
2. Go through setup wizard (downloads SDK automatically)
3. Go to **More Actions → Virtual Device Manager**
4. **Create Device** → **Pixel 7** → Next
5. Select system image: **API 34, ARM64 (arm64-v8a)** — this matches Apple Silicon
6. Finish → Start the emulator

### Run the app:
```bash
cd ~/Projects/ota-app
npx cap sync android      # Sync web assets to Android project
npx cap open android      # Opens Android Studio
```

In Android Studio:
1. Wait for Gradle sync to finish (first time takes 2-3 min)
2. Select the running Pixel 7 emulator at the top
3. Press **▶ Run** (or ⌃R)

The emulator shows the TravelApp. ✅

### Run via CLI:
```bash
# Make sure emulator is running first, then:
npx cap run android
```

---

## 🔄 Live Development (Hot Reload)

### For web (fastest iteration):
```bash
npx vite --host 0.0.0.0
# Open http://localhost:5173 — changes reflect instantly
```

### For iOS with live reload:
```bash
npx cap run ios --livereload --external
# App reloads on every file save
```

### For Android with live reload:
```bash
npx cap run android --livereload --external
```

---

## 🏗️ Build APK (for sharing)
```bash
cd ~/Projects/ota-app/android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

## 🏗️ Build IPA (for TestFlight)
1. In Xcode: **Product → Archive**
2. **Distribute App → Ad Hoc** or upload to TestFlight

---

## Quick Reference

| What | Command |
|------|---------|
| Web dev server | `npx vite --host` |
| Build production | `npx vite build` |
| Sync to mobile | `npx cap sync` |
| Open iOS | `npx cap open ios` |
| Open Android | `npx cap open android` |
| Run iOS CLI | `npx cap run ios` |
| Run Android CLI | `npx cap run android` |
| Live reload iOS | `npx cap run ios --livereload --external` |
| Live reload Android | `npx cap run android --livereload --external` |
