# Dynamic Island / Live Activity — Complete Xcode Setup Walkthrough

## Validation Report

### Files Reviewed
| # | File | Status |
|---|------|--------|
| 1 | `ios/App/App/AppDelegate.swift` | ✅ Correct — imports ActivityKit, uses `BrowserTimerAttributes` with `#available(iOS 16.1, *)` guard |
| 2 | `ios/App/App/BrowserTimerPlugin.swift` | ✅ Correct — `@objc(BrowserTimerPlugin)` matches JS `registerPlugin('BrowserTimerPlugin')`, uses ActivityKit correctly |
| 3 | `ios/App/App/BrowserTimerLiveActivity/BrowserTimerAttributes.swift` | ✅ Correct — `public struct BrowserTimerAttributes: ActivityAttributes` with `public` init and ContentState |
| 4 | `ios/App/App/BrowserTimerLiveActivity/BrowserTimerLiveActivityWidget.swift` | ✅ Correct — references `BrowserTimerAttributes`, uses `@main` attribute, implements all Dynamic Island regions |
| 5 | `ios/App/App/BrowserTimerLiveActivity/BrowserTimerLiveActivity.entitlements` | ✅ Correct — has `com.apple.developer.activitykit = true` and `aps-environment = development` |
| 6 | `ios/App/App/TravelApp.entitlements` | ✅ Correct — has `com.apple.developer.activitykit = true` and `aps-environment = development` |
| 7 | `ios/App/App/Info.plist` | ✅ Correct — has `NSSupportsLiveActivities = true` |
| 8 | `src/plugins/BrowserTimer.js` | ✅ Correct — `registerPlugin('BrowserTimerPlugin')` matches the `@objc` name |
| 9 | `src/hooks/useBrowserTimer.js` | ✅ Correct — patches `Browser.open()`, calls `startTimer`/`stopTimer` properly |
| 10 | `src/App.jsx` | ⚠️ **NOT USING THE HOOK** — `useBrowserTimer()` is not imported or called |

### Consistency Check
- **Plugin name**: `@objc(BrowserTimerPlugin)` in Swift ↔ `registerPlugin('BrowserTimerPlugin')` in JS — ✅ Match
- **Attribute type**: `BrowserTimerAttributes` used in AppDelegate, Plugin, and Widget — ✅ Consistent
- **Imports**: All Swift files import `ActivityKit`; Widget also imports `WidgetKit` and `SwiftUI` — ✅ Correct
- **Entitlements**: Both main app and widget extension have `activitykit` and `aps-environment` — ✅ Correct
- **Info.plist**: `NSSupportsLiveActivities = YES` — ✅ Present
- **iOS version**: All ActivityKit usage guarded with `@available(iOS 16.1, *)` or `if #available(iOS 16.1, *)` — ✅ Correct

### Issues Found
1. **CRITICAL — project.pbxproj is empty**: Only `AppDelegate.swift` is in the Sources build phase. None of the new files are registered. Xcode cannot see them at all.
2. **CRITICAL — No Widget Extension target exists**: The project has only one target (`App`). A Widget Extension target named `BrowserTimerLiveActivity` must be created.
3. **IMPORTANT — `useBrowserTimer` not called in App.jsx**: The hook exists but is never imported or used. Dynamic Island will never trigger.
4. **MINOR — iOS deployment target is 15.0**: ActivityKit requires iOS 16.1+. The deployment target should be raised to 16.1, OR the availability checks are sufficient (they are — this is fine as-is).

---

## Step-by-Step Xcode Walkthrough

### PHASE 1: Get the project onto your Mac

**Option A: Direct file copy (recommended if GB10 is on your LAN)**
```bash
# On your MacBook Pro, run:
cd ~/Projects
rm -rf ota-app  # remove old copy
scp -r node@<GB10_IP>:/home/node/.openclaw/workspace/ota-app ./ota-app
```

**Option B: Compress and transfer**
```bash
# On the GB10 (I can do this for you):
cd /home/node/.openclaw/workspace
tar czf /tmp/ota-app.tar.gz ota-app/

# Then on your Mac:
scp node@<GB10_IP>:/tmp/ota-app.tar.gz ~/Projects/
cd ~/Projects && tar xzf ota-app.tar.gz
```

**Option C: Git (if you push to a repo)**
```bash
# On GB10:
cd /home/node/.openclaw/workspace/ota-app
git init && git add -A && git commit -m "Dynamic Island support"
git remote add origin <your-repo-url>
git push -u origin main

# On Mac:
cd ~/Projects && git clone <your-repo-url> ota-app
```

### PHASE 2: Install dependencies and build web assets

```bash
cd ~/Projects/ota-app
npm install
npx vite build          # creates dist/
npx cap sync ios        # copies dist/ into the iOS project
```

### PHASE 3: Fix App.jsx to use the hook

Before opening Xcode, edit `src/App.jsx` to add the hook:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BookingProvider } from './context/BookingContext';
import useBrowserTimer from './hooks/useBrowserTimer';    // ← ADD THIS
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import HotelDetail from './pages/HotelDetail';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import MyTrips from './pages/MyTrips';
import Account from './pages/Account';

export default function App() {
  useBrowserTimer();  // ← ADD THIS LINE (must be inside the component, before return)

  return (
    <ThemeProvider>
      <BookingProvider>
        <BrowserRouter>
          <Navbar />
          <main className="pt-14 md:pt-16 pb-20 md:pb-8 min-h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/hotel/:id" element={<HotelDetail />} />
              <Route path="/book/:id" element={<Booking />} />
              <Route path="/confirmation/:bookingId" element={<BookingConfirmation />} />
              <Route path="/trips" element={<MyTrips />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </main>
        </BrowserRouter>
      </BookingProvider>
    </ThemeProvider>
  );
}
```

Then rebuild and re-sync:
```bash
npx vite build
npx cap sync ios
```

### PHASE 4: Open in Xcode

1. Open **Finder** → navigate to `~/Projects/ota-app/ios/App/`
2. Double-click **App.xcworkspace** (if it exists) or **App.xcodeproj**
3. If Xcode shows "Welcome to Xcode", close it and open the project file directly

### PHASE 5: Add BrowserTimerPlugin.swift to the main App target

1. In Xcode's **Project Navigator** (left sidebar, ⌘1), find the **App** folder/group
2. **Right-click** on the **App** group → **Add Files to "App"...**
3. Navigate to `ios/App/App/` and select **BrowserTimerPlugin.swift**
4. In the dialog:
   - ✅ Check **"App"** target (under "Add to targets")
   - ❌ Uncheck any other targets
   - ✅ Check "Copy items if needed" (should already be in place, won't hurt)
5. Click **Add**

**Verify**: Click on `BrowserTimerPlugin.swift` in the navigator → open the **File Inspector** (right panel, ⌥⌘1) → under "Target Membership", you should see **App** checked.

### PHASE 6: Add BrowserTimerAttributes.swift to BOTH targets

This is the critical file that fixes the "Cannot find type in scope" error.

1. **Right-click** on the **App** group → **Add Files to "App"...**
2. Navigate to `ios/App/App/BrowserTimerLiveActivity/`
3. Select **BrowserTimerAttributes.swift**
4. In the dialog:
   - ✅ Check **"App"** target
   - ❌ Do NOT create a new target yet (we'll create the widget extension in the next step)
   - ✅ Check "Copy items if needed"
5. Click **Add**

> **Note**: After we create the Widget Extension target (Step 7), you'll come back and also check the extension target for this file.

### PHASE 7: Create the Widget Extension target

This is the most important step.

1. Click on the **top-level project** in the Project Navigator (the blue "App" icon at the top)
2. In the **center pane**, at the bottom of the **Targets** list, click the **"+"** button
3. In the template picker:
   - Search for **"Widget Extension"** (or find it under iOS → Application Extension)
   - Select **Widget Extension**
   - Click **Next**
4. Configure the target:
   - **Product Name**: `BrowserTimerLiveActivity` (must match exactly)
   - **Team**: Select your Apple Developer team
   - **Include Live Activity**: **UNCHECK** this (we provide our own implementation)
   - **Include Configuration App Intent**: **UNCHECK** this
5. Click **Finish**
6. Xcode will ask "Activate 'BrowserTimerLiveActivity' scheme?" → Click **Activate**

### PHASE 8: Replace generated widget files with our custom ones

Xcode just created placeholder Swift files. We need to replace them.

1. In the Project Navigator, expand the **BrowserTimerLiveActivity** group (the new folder Xcode created)
2. You'll see a generated file like `BrowserTimerLiveActivity.swift` (or `BrowserTimerLiveActivityBundle.swift`)
3. **Delete** all generated `.swift` files in this group (select → Delete key → "Move to Trash")

4. **Right-click** on the **BrowserTimerLiveActivity** group → **Add Files to "BrowserTimerLiveActivity"...**
5. Navigate to `ios/App/App/BrowserTimerLiveActivity/` and add:
   - **BrowserTimerLiveActivityWidget.swift**
   - Target Membership: check ONLY **BrowserTimerLiveActivity** (the extension target)
   - Click **Add**

6. Now add `BrowserTimerAttributes.swift` to the extension target too:
   - Click on **BrowserTimerAttributes.swift** in the navigator (it should be under the App group from Step 6)
   - Open the **File Inspector** (⌥⌘1)
   - Under **Target Membership**, check **BOTH**:
     - ✅ **App**
     - ✅ **BrowserTimerLiveActivity**
   - This is critical — the shared attributes type must compile in both targets

### PHASE 9: Configure entitlements for the main App target

1. Click the **App** target (the main app target in the Targets list)
2. Go to the **Signing & Capabilities** tab
3. Click **"+ Capability"** (top-left of the tab area)
4. Search for and add **Push Notifications** (this adds `aps-environment` entitlement)
5. If you see "Supports Live Activities" under Push Notifications, make sure it's **checked**
6. Now go to **Build Settings** tab:
   - Search for **"Code Signing Entitlements"**
   - Double-click the value → set it to: `App/TravelApp.entitlements`
   - Press Enter

> **Alternative**: If the entitlements path doesn't resolve, try just `TravelApp.entitlements` (Xcode resolves relative to the project).

### PHASE 10: Configure entitlements for the Widget Extension target

1. Click the **BrowserTimerLiveActivity** target in the Targets list
2. Go to **Signing & Capabilities** tab
3. Click **"+ Capability"** → add **Push Notifications**
4. Go to **Build Settings** tab:
   - Search for **"Code Signing Entitlements"**
   - Set it to: `BrowserTimerLiveActivity/BrowserTimerLiveActivity.entitlements`
5. While still in Build Settings, also verify:
   - **iOS Deployment Target**: Set to **16.1** or higher (required for ActivityKit)
   - **Swift Language Version**: Should be Swift 5

### PHASE 11: Update the main App target's deployment target (recommended)

1. Click the **App** target → **General** tab
2. Under **Minimum Deployments**, set **iOS** to **16.1** (or keep at 15.0 if you want to support older devices — the `@available` guards handle this)

### PHASE 12: Verify build phases

**App target:**
1. Select the **App** target → **Build Phases** tab
2. Expand **Compile Sources** — you should see:
   - `AppDelegate.swift`
   - `BrowserTimerPlugin.swift`
   - `BrowserTimerAttributes.swift`
   - If any are missing, click "+" and add them

**BrowserTimerLiveActivity target:**
1. Select the **BrowserTimerLiveActivity** target → **Build Phases** tab
2. Expand **Compile Sources** — you should see:
   - `BrowserTimerAttributes.swift`
   - `BrowserTimerLiveActivityWidget.swift`
   - If any are missing, click "+" and add them

### PHASE 13: Add the Widget Extension as a dependency of the App target

1. Select the **App** target → **General** tab
2. Scroll down to **Frameworks, Libraries, and Embedded Content**
3. Click **"+"** → select **BrowserTimerLiveActivity** (the widget extension) → Add

**OR** (alternative method):
1. Select the **App** target → **Build Phases** tab
2. Expand **Dependencies** (or "Target Dependencies")
3. Click **"+"** → select **BrowserTimerLiveActivity** → Add

### PHASE 14: Build and fix errors

1. Select **App** scheme at the top of Xcode (next to the stop button)
2. Select **"My Mac"** or **"Any iOS Device"** as the destination (we'll build first, run on device later)
3. Press **⌘B** to build

**Expected first-build errors and fixes:**

| Error | Fix |
|-------|-----|
| "Cannot find 'BrowserTimerAttributes' in scope" | BrowserTimerAttributes.swift is not in the target's Compile Sources. Go to Phase 12 and add it. |
| "No such module 'ActivityKit'" | Deployment target must be iOS 16.1+. Check Phase 11. |
| "Duplicate definition of 'BrowserTimerAttributes'" | The file is being compiled twice in the same target. Check Target Membership — it should be in both targets, but only once per target. |
| Entitlements error | Verify the Code Signing Entitlements path in Build Settings matches the actual file location. |

4. Keep building (⌘B) until you get **"Build Succeeded"**

### PHASE 15: Run on a physical device

> ⚠️ **Dynamic Island does NOT work in the iOS Simulator.** You need a physical iPhone 14 Pro or newer.

1. Connect your iPhone to the Mac via USB
2. In Xcode, select your **iPhone** from the device dropdown (top-center, next to the scheme selector)
3. Select the **App** scheme
4. Press **⌘R** to Build & Run
5. If prompted about signing:
   - Go to **App** target → **Signing & Capabilities**
   - Check **"Automatically manage signing"**
   - Select your **Team** (Apple ID)
   - If using a free Apple ID, you may need to:
     - Open **Settings** on your iPhone → **General** → **VPN & Device Management**
     - Trust your developer certificate
6. The app should install and launch on your iPhone

### PHASE 16: Test the Dynamic Island

1. **Launch TravelApp** on your iPhone
2. **Find a link that opens the in-app browser** (e.g., scroll to the footer → tap "Search on Google" or any external link)
3. **Observe the Dynamic Island**:
   - The compact pill should appear with a timer icon and elapsed time (00:00, 00:01, ...)
   - **Long-press** the Dynamic Island → the expanded view shows the browsing label + timer + progress bar
4. **Close the browser** → the Dynamic Island should dismiss immediately
5. **Check the Lock Screen**: While the browser is open, lock the phone. You should see the Live Activity banner on the Lock Screen

### PHASE 17: Troubleshooting

| Symptom | Fix |
|---------|-----|
| App builds but Dynamic Island doesn't appear | Check Settings → TravelApp → Live Activities is enabled. Also verify the device is iPhone 14 Pro+. |
| "Live Activities are not available" error | Device must be iOS 16.1+. Check Settings → Screen Time → Content & Privacy → isn't blocking Live Activities. |
| Timer starts but doesn't count up | The app is being suspended. This is expected when fully backgrounded. Timer resumes when foregrounded. |
| Build error about `@main` attribute | BrowserTimerLiveActivityWidget.swift must ONLY be in the widget extension target, not the main App target. |
| "Unsupported os version" runtime crash | Ensure deployment target is set correctly for both targets. |
| Plugin methods not found from JS | Ensure `BrowserTimerPlugin.swift` is in the App target's Compile Sources. Capacitor auto-discovers `@objc` plugins. |

---

## Quick Checklist (print this)

- [ ] Project copied from GB10 to MacBook
- [ ] `npm install` + `npx vite build` + `npx cap sync ios`
- [ ] App.jsx updated with `useBrowserTimer()` import and call
- [ ] Rebuild: `npx vite build` + `npx cap sync ios`
- [ ] Open `App.xcworkspace` in Xcode
- [ ] `BrowserTimerPlugin.swift` added to App target
- [ ] `BrowserTimerAttributes.swift` added to App target (and later both targets)
- [ ] Widget Extension target created: "BrowserTimerLiveActivity"
- [ ] Generated widget files deleted
- [ ] `BrowserTimerLiveActivityWidget.swift` added to extension target only
- [ ] `BrowserTimerAttributes.swift` added to extension target too (Target Membership: both)
- [ ] App target entitlements: `App/TravelApp.entitlements` (Push Notifications + ActivityKit)
- [ ] Widget target entitlements: `BrowserTimerLiveActivity/BrowserTimerLiveActivity.entitlements`
- [ ] Widget extension added as dependency of App target
- [ ] Both targets: Deployment Target ≥ 16.1
- [ ] ⌘B builds successfully
- [ ] Run on physical iPhone 14 Pro+ via ⌘R
- [ ] Test: open browser → Dynamic Island appears → close browser → it dismisses
