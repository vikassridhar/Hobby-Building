import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Widget
// This file implements the Dynamic Island + Lock Screen Live Activity views.
// It must be compiled inside a Widget Extension target named "BrowserTimerLiveActivity".

@available(iOS 16.2, *)
@main
struct BrowserTimerLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        BrowserTimerLiveActivity()
    }
}

@available(iOS 16.2, *)
struct BrowserTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BrowserTimerAttributes.self) { context in
            // Lock Screen / Banner Live Activity
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded region
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "globe")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.formattedElapsedTime)
                        .font(.system(.title2, design: .monospaced))
                        .foregroundColor(.white)
                        .padding(4)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.browsingLabel)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    // Progress bar showing elapsed time (fills over 60s, then resets)
                    ProgressView(
                        timerInterval: Date.now...Date.now.addingTimeInterval(
                            max(1, 60 - Double(context.state.elapsedSeconds % 60))
                        ),
                        countsDown: false
                    )
                    .tint(.blue)
                    .padding(.horizontal, 12)
                }
            } compactLeading: {
                // Compact leading: timer icon
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact trailing: elapsed time
                Text(context.state.formattedElapsedTime)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.white)
            } minimal: {
                // Minimal (when another ongoing activity has priority)
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            }
        }
    }

    // MARK: - Lock Screen View

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<BrowserTimerAttributes>) -> some View {
        HStack(spacing: 12) {
            // Timer icon
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: "globe")
                    .font(.title2)
                    .foregroundColor(.blue)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.browsingLabel)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text("Elapsed: \(context.state.formattedElapsedTime)")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            // Elapsed time large
            Text(context.state.formattedElapsedTime)
                .font(.system(.title3, design: .monospaced))
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.trailing, 4)
        }
        .padding(16)
        .background(.black)
    }
}

// MARK: - Preview

@available(iOS 16.2, *)
struct BrowserTimerLiveActivity_Previews: PreviewProvider {
    static let attributes = BrowserTimerAttributes(url: "https://google.com")
    static let state = BrowserTimerAttributes.ContentState(
        elapsedSeconds: 5023,
        browsingLabel: "Searching on Google..."
    )

    static var previews: some View {
        Group {
            attributes
                .previewContext(state, viewKind: .dynamicIsland(.compact))
                .previewDisplayName("Compact")

            attributes
                .previewContext(state, viewKind: .dynamicIsland(.expanded))
                .previewDisplayName("Expanded")

            attributes
                .previewContext(state, viewKind: .dynamicIsland(.minimal))
                .previewDisplayName("Minimal")

            attributes
                .previewContext(state, viewKind: .content)
                .previewDisplayName("Lock Screen")
        }
    }
}
