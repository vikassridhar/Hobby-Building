# Dynamic Island Browser Timer – Setup Guide

This feature adds a **Live Activity** to the Dynamic Island that shows an elapsed timer whenever the in-app browser is open. It works on **iPhone 14 Pro and newer** (iOS 16.1+).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Web App (React)                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ useBrowserTimer() hook                           │     │
│  │  → patches Browser.open() to call native plugin │     │
│  │  → listens for browser close events             │     │
│  └─────────────┬───────────────────────────────────┘     │
│                │ BrowserTimer.startTimer() / .stopTimer() │
└────────────────┼──────────────────────────────────────────┘
                 │ Capacitor bridge
┌────────────────┼──────────────────────────────────────────┐
│  iOS Native                                              │
│  ┌─────────────▼───────────────────────────────────┐     │
│  │ BrowserTimerPlugin.swift (Capacitor Plugin)      │     │
│  │  → Activity.request() to start Live Activity     │     │
│  │  → Timer.scheduledTimer for 1s updates           │     │
│  │  → Activity.end() to dismiss                     │     │
│  └─────────────┬───────────────────────────────────┘     │
│                │ ActivityKit                             │
│  ┌─────────────▼───────────────────────────────────┐     │
│  │ BrowserTimerLiveActivity (Widget Extension)      │     │
│  │  → Dynamic Island compact/expanded views         │     │
│  │  → Lock Screen banner view                       │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `ios/App/App/BrowserTimerPlugin.swift` | Capacitor plugin that bridges JS ↔ ActivityKit |
| `ios/App/App/BrowserTimerLiveActivity/BrowserTimerAttributes.swift` | Shared ActivityAttributes model (used by both app + widget) |
| `ios/App/App/BrowserTimerLiveActivity/BrowserTimerLiveActivityWidget.swift` | Widget extension with Dynamic Island + Lock Screen views |
| `ios/App/App/BrowserTimerLiveActivity/BrowserTimerLiveActivity.entitlements` | Widget extension entitlements |
| `ios/App/App/TravelApp.entitlements` | Main app entitlements (ActivityKit) |
| `src/plugins/BrowserTimer.js` | JS plugin registration |
| `src/hooks/useBrowserTimer.js` | React hook that auto-starts/stops timer |

### Modified Files

| File | Change |
|------|--------|
| `ios/App/App/Info.plist` | Added `NSSupportsLiveActivities = YES` |
| `ios/App/App/AppDelegate.swift` | Added cleanup of Live Activities on app terminate |

---

## Setup Steps on Mac

### 1. Add the Widget Extension Target in Xcode

This is the most important step. Xcode needs a Widget Extension target for the Live Activity to render.

1. Open `ota-app/ios/App/App.xcworkspace` (or `.xcodeproj`) in **Xcode**
2. Select the **App** project in the navigator
3. Click **+** at the bottom of the Targets list → **Widget Extension**
4. Product Name: **BrowserTimerLiveActivity**
5. Uncheck "Include Live Activity" (we provide our own implementation)
6. Uncheck "Include Configuration App Intent" (not needed)
7. Click **Finish**

### 2. Replace the Generated Files

Xcode generates placeholder files. Replace them:

```
BrowserTimerLiveActivity/
├── BrowserTimerLiveActivity.entitlements   ← already created
└── (delete generated .swift files)

Then copy our files INTO the extension target:
├── BrowserTimerAttributes.swift            ← add to BOTH targets
└── BrowserTimerLiveActivityWidget.swift    ← add to extension target ONLY
```

**Important:** `BrowserTimerAttributes.swift` must be compiled in **both** the main app target AND the widget extension target. Select the file → Target Membership → check both "App" and "BrowserTimerLiveActivity".

### 3. Configure Entitlements

**Main App Target:**
1. Select the **App** target → Signing & Capabilities
2. Click **+ Capability** → add **Push Notifications** (this enables the `aps-environment` entitlement)
3. If you don't see "Supports Live Activities" under Push Notifications, ensure `NSSupportsLiveActivities` is in Info.plist (we already added it)
4. Set the entitlements file: Build Settings → Code Signing Entitlements → `App/TravelApp.entitlements`

**Widget Extension Target:**
1. Select the **BrowserTimerLiveActivity** target → Signing & Capabilities
2. Click **+ Capability** → add **Push Notifications**
3. Set entitlements file: Build Settings → Code Signing Entitlements → `BrowserTimerLiveActivity/BrowserTimerLiveActivity.entitlements`

### 4. Add BrowserTimerPlugin.swift to Main Target

1. In Xcode, right-click the **App** group → **Add Files to "App"...**
2. Select `BrowserTimerPlugin.swift`
3. Ensure Target Membership: **App** only (not the widget extension)
4. Also ensure `BrowserTimerAttributes.swift` has **both** targets checked

### 5. Register the Plugin with Capacitor

Capacitor auto-discovers plugins via the `@objc` annotation. No manual registration needed for plugins in the main app target.

However, you need to ensure the plugin file is compiled. Verify in:
- **App** target → Build Phases → Compile Sources → `BrowserTimerPlugin.swift` should be listed

### 6. Update the Web App

Add the `useBrowserTimer` hook to your `App.jsx`:

```jsx
import useBrowserTimer from './hooks/useBrowserTimer';

export default function App() {
  useBrowserTimer(); // ← add this line

  return (
    // ... existing JSX
  );
}
```

This hooks into `Browser.open()` and automatically starts/stops the Dynamic Island timer.

### 7. Build & Run

```bash
# From the project root
cd ota-app

# Sync Capacitor (copies web assets into iOS)
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select your development team for both targets
2. Select a physical device (Live Activities don't work in Simulator)
3. Build & Run (⌘R)

### 8. Test

1. Launch the app on a **physical iPhone 14 Pro or newer**
2. Scroll to the footer → tap **"Search on Google"**
3. The Dynamic Island should appear with a timer counting up
4. Long-press the Dynamic Island to see the expanded view
5. Close the browser → the Dynamic Island should dismiss

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Live Activities are not available" | Device must be iPhone 14 Pro+ with iOS 16.1+. Simulator doesn't support Dynamic Island. |
| Plugin not found | Ensure `BrowserTimerPlugin.swift` is in the App target's Compile Sources |
| Build error: "Cannot find 'BrowserTimerAttributes' in scope" | `BrowserTimerAttributes.swift` must be in BOTH targets (main app + widget extension) |
| Live Activity doesn't appear | Check `NSSupportsLiveActivities = YES` in Info.plist. Also check Settings → TravelApp → Live Activities is enabled on the device. |
| Timer doesn't update in background | This is expected — ActivityKit handles stale dates. The timer resumes when the app returns to foreground. For true background updates, you'd need Push Notifications for Live Activities (APNs token). |
| Entitlements error | Both targets need `com.apple.developer.activitykit = true` in their entitlements files |

---

## How It Works

1. **Browser opens** → `useBrowserTimer` hook intercepts `Browser.open()` → calls `BrowserTimer.startTimer()`
2. **Native plugin** calls `Activity.request()` with `BrowserTimerAttributes` → Live Activity starts
3. **Timer updates** every 1 second via `Timer.scheduledTimer` → `Activity.update()` with new elapsed seconds
4. **Dynamic Island** renders compact (timer icon + elapsed) and expanded (label + timer + progress bar) views
5. **Browser closes** → `browserFinished` event → `BrowserTimer.stopTimer()` → `Activity.end()` dismisses the Live Activity

### Timer Format
- Under 1 hour: `MM:SS` (e.g., `05:23`)
- Over 1 hour: `HH:MM:SS` (e.g., `01:05:23`)

---

## Notes

- **Device requirement:** iPhone 14 Pro or newer (Dynamic Island hardware)
- **iOS requirement:** 16.1+
- **Simulator:** Dynamic Island is not available in Simulator — you must test on a real device
- **Background:** The 1-second timer updates stop when the app is fully suspended. ActivityKit will show the last known state. For continuous background updates, you'd need to implement APNs-based Live Activity updates (more complex, requires server-side push)
- **Multiple browsers:** If the user opens the browser again while a timer is running, the old one is dismissed and a new one starts
