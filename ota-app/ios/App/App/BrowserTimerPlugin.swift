import Foundation
import ActivityKit
import Capacitor

/// Capacitor plugin that manages a Live Activity (Dynamic Island timer)
/// triggered when the in-app browser opens.
///
/// JS usage:
///   BrowserTimer.startTimer({ url: "https://google.com", label: "Searching on Google..." })
///   BrowserTimer.stopTimer()
@available(iOS 16.2, *)
@objc(BrowserTimerPlugin)
public class BrowserTimerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BrowserTimerPlugin"
    public let jsName = "BrowserTimerPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startTimer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTimer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLabel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - State

    /// The currently running Live Activity (if any)
    private var currentActivity: Activity<BrowserTimerAttributes>?

    /// Background timer that updates the Live Activity state every second
    private var updateTimer: Timer?

    /// When the browser was opened
    private var startTime: Date?

    /// Label shown in the Dynamic Island
    private var browsingLabel: String = "Browsing..."

    // MARK: - Capacitor Registration

    override public func load() {
        // Observe when any previously running Live Activities are stale
        // (e.g., app was killed and relaunched)
        Task { @MainActor in
            for activity in Activity<BrowserTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }

    // MARK: - Plugin Methods

    /// Start the Dynamic Island timer.
    /// Call from JS: BrowserTimer.startTimer({ url: "...", label: "..." })
    @objc func startTimer(_ call: CAPPluginCall) {
        guard activityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are not enabled on this device")
            return
        }

        let url = call.getString("url") ?? "https://example.com"
        let label = call.getString("label") ?? "Browsing..."

        // End any existing activity first
        if let existing = currentActivity {
            Task { @MainActor in
                await existing.end(nil, dismissalPolicy: .immediate)
            }
            currentActivity = nil
        }

        stopUpdateTimer()

        let attributes = BrowserTimerAttributes(url: url)
        let initialState = BrowserTimerAttributes.ContentState(
            elapsedSeconds: 0,
            browsingLabel: label
        )

        browsingLabel = label
        startTime = Date()

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: initialState, staleDate: nil)
            )
            currentActivity = activity
            startUpdateTimer()
            call.resolve([
                "activityId": activity.id
            ])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    /// Stop the Dynamic Island timer and dismiss the Live Activity.
    /// Call from JS: BrowserTimer.stopTimer()
    @objc func stopTimer(_ call: CAPPluginCall) {
        stopUpdateTimer()

        guard let activity = currentActivity else {
            call.resolve(["dismissed": false, "reason": "no_active_activity"])
            return
        }


        Task { @MainActor in
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        currentActivity = nil
        startTime = nil
        call.resolve(["dismissed": true])
    }

    /// Update the label text in the Dynamic Island.
    /// Call from JS: BrowserTimer.updateLabel({ label: "New label..." })
    @objc func updateLabel(_ call: CAPPluginCall) {
        guard let activity = currentActivity else {
            call.reject("No active Live Activity")
            return
        }

        let newLabel = call.getString("label") ?? browsingLabel
        browsingLabel = newLabel

        let elapsed = computeElapsedSeconds()
        let state = BrowserTimerAttributes.ContentState(
            elapsedSeconds: elapsed,
            browsingLabel: newLabel
        )

        Task { @MainActor in
            await activity.update(.init(state: state, staleDate: nil))
        }

        call.resolve()
    }

    /// Check if Live Activities are available on this device.
    /// Call from JS: BrowserTimer.isAvailable()
    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "enabled": activityAuthorizationInfo().areActivitiesEnabled
        ])
    }

    // MARK: - Timer

    private func startUpdateTimer() {
        // Update the Live Activity every second with the new elapsed time.
        // RunLoop-based timer works in background as long as the app is alive.
        updateTimer = Timer.scheduledTimer(
            withTimeInterval: 1.0,
            repeats: true
        ) { [weak self] _ in
            self?.tickUpdate()
        }
    }

    private func stopUpdateTimer() {
        updateTimer?.invalidate()
        updateTimer = nil
    }

    private func tickUpdate() {
        guard let activity = currentActivity else {
            stopUpdateTimer()
            return
        }

        let elapsed = computeElapsedSeconds()
        let state = BrowserTimerAttributes.ContentState(
            elapsedSeconds: elapsed,
            browsingLabel: browsingLabel
        )

        Task { @MainActor in
            await activity.update(.init(state: state, staleDate: nil))
        }
    }

    // MARK: - Helpers

    private func computeElapsedSeconds() -> Int {
        guard let start = startTime else { return 0 }
        return Int(Date().timeIntervalSince(start))
    }

    /// Wrapper so we can call this from both @available and non-@available contexts
    private func activityAuthorizationInfo() -> ActivityAuthorizationInfo {
        return ActivityAuthorizationInfo()
    }
}
