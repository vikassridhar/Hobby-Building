import ActivityKit
import Foundation

// MARK: - Activity Attributes
// Shared between the main app and the Live Activity widget extension.

@available(iOS 16.2, *)
public struct BrowserTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Elapsed seconds since the browser opened
        public var elapsedSeconds: Int
        /// What the user is browsing (e.g. "Searching on Google...")
        public var browsingLabel: String

        public init(elapsedSeconds: Int, browsingLabel: String) {
            self.elapsedSeconds = elapsedSeconds
            self.browsingLabel = browsingLabel
        }
    }

    /// URL being browsed
    public var url: String

    public init(url: String) {
        self.url = url
    }
}

// MARK: - Time Formatting Helper

@available(iOS 16.2, *)
extension BrowserTimerAttributes.ContentState {
    /// Returns elapsed time as "HH:MM:SS" or "MM:SS" if under 1 hour
    public var formattedElapsedTime: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}
