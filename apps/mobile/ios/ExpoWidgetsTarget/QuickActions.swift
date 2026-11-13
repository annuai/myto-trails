import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct QuickActions: Widget {
  let name: String = "QuickActions"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Quick actions")
    .description("Start or pause a ride, SOS, group ride and check-in.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}