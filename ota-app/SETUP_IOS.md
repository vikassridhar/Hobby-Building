# 📱 iOS Setup Guide — TravelApp

Since Xcode only runs on macOS, you'll need to build and run the iOS app on your MacBook Pro.

## Prerequisites

- **macOS** (any Apple Silicon or Intel Mac)
- **Xcode 15+** (download from Mac App Store)
- **Node.js 18+** (already have via OpenClaw)
- **CocoaPods** (install with `gem install cocoapods`)

## Step-by-Step

### 1. Copy the project to your Mac

The `ios/` folder is already generated. Copy the entire `ota-app` project:

```bash
# Option A: If you can access the workspace files
scp -r /path/to/ota-app ~/Projects/ota-app

# Option B: Create fresh on Mac
git clone <your-repo> ~/Projects/ota-app
cd ~/Projects/ota-app
npm install
npx vite build
npx cap add ios
```

### 2. Install CocoaPods dependencies

```bash
cd ios/App
pod install
cd ../..
```

### 3. Open in Xcode

```bash
# This opens the .xcworkspace (important: not .xcodeproj)
npx cap open ios
```

Or manually: Open `ios/App/App.xcworkspace` in Xcode.

### 4. Configure Signing

1. In Xcode, select the **App** target in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Select your **Team** (your Apple Developer account)
5. Change **Bundle Identifier** if needed (currently `com.ota.travelapp`)

### 5. Select a Simulator

1. At the top of Xcode, click the device dropdown
2. Select **iPhone 15 Pro** (or any iOS 17+ simulator)
3. Make sure the scheme is set to **App**

### 6. Build & Run

Press **⌘R** (or click the Play button).

The iOS simulator will launch and load the TravelApp.

### 7. Test on Different Devices

In Xcode, switch between simulators:
- **iPhone SE** (small screen)
- **iPhone 15 Pro Max** (large screen)
- **iPad Air** (tablet layout)

## Quick Commands (Terminal)

```bash
# Build web assets and sync to iOS
cd ~/Projects/ota-app
npx vite build
npx cap sync ios

# Run on simulator via CLI (alternative to Xcode)
npx cap run ios --target "iPhone 15 Pro"

# Live reload during development
npx cap run ios --livereload --external
```

## Troubleshooting

### "No signing certificate found"
- Open Xcode → Preferences → Accounts → Add your Apple ID
- Make sure your Apple ID has a developer account (free tier works for simulators)

### "Unable to find a target named iPhone 15 Pro"
```bash
# List available simulators
xcrun simctl list devices available
# Use the exact name from the list
npx cap run ios --target "iPhone 16 Pro"
```

### Build errors after web changes
```bash
npx cap sync ios  # Re-syncs web assets to iOS project
```

## App Store Deployment (if needed)

1. Archive the app: Xcode → Product → Archive
2. Upload to App Store Connect
3. Configure screenshots, metadata, pricing
4. Submit for review

For a demo/internal app, TestFlight distribution is sufficient.
