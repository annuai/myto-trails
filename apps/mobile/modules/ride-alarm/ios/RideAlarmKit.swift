import Foundation
#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI

@available(iOS 26.0, *)
struct RideAlarmMetadata: AlarmMetadata {
  var group: String
}

/**
 * Ride alarms with AlarmKit: real alarms that ring through silent mode and Focus and show on the lock screen. Every ring of a ride is
 * set up front as its own alarm; Snooze only stops the ringing one, and Stop ("I'm up") stops the ride's other rings too and opens the
 * app. iOS shows only an alarm's title, so the planner keeps the warning in the title.
 */
@available(iOS 26.0, *)
enum RideAlarmKit {
  // The app's brick red (packages/tokens), as AlarmKit wants a SwiftUI colour.
  private static let tint = Color(red: 0.69, green: 0.267, blue: 0.18)

  /** From 26.1 the system draws Stop itself; 26.0 wants it named. */
  private static func makeAlert(_ title: LocalizedStringResource, snooze: AlarmButton?) -> AlarmPresentation.Alert {
    if #available(iOS 26.1, *) { return .init(title: title, secondaryButton: snooze, secondaryButtonBehavior: snooze == nil ? nil : .custom) }
    return .init(title: title, stopButton: AlarmButton(text: "I'm up", textColor: .white, systemImageName: "checkmark"), secondaryButton: snooze, secondaryButtonBehavior: snooze == nil ? nil : .custom)
  }

  static func replaceAll(_ json: String) async throws {
    let steps = (try? JSONDecoder().decode([RideAlarmStep].self, from: Data(json.utf8))) ?? []
    RideAlarmStore.saveSteps(steps)
    // Every alarm this app has is a ride alarm, so all of them go, including any left by an earlier run.
    for alarm in (try? AlarmManager.shared.alarms) ?? [] { try? AlarmManager.shared.cancel(id: alarm.id) }
    for id in RideAlarmStore.ids().values { if let u = UUID(uuidString: id) { try? AlarmManager.shared.cancel(id: u) } }
    var ids: [String: String] = [:]
    let now = Date().timeIntervalSince1970 * 1000
    for step in steps where step.fireAt > now && !RideAlarmStore.isDone(step.group) {
      let id = UUID()
      let snooze = step.snooze ? AlarmButton(text: "Snooze", textColor: .white, systemImageName: "zzz") : nil
      let alert = makeAlert(LocalizedStringResource("\(step.title)"), snooze: snooze)
      let attributes = AlarmAttributes<RideAlarmMetadata>(presentation: AlarmPresentation(alert: alert), metadata: RideAlarmMetadata(group: step.group), tintColor: tint)
      let config = AlarmManager.AlarmConfiguration<RideAlarmMetadata>(
        schedule: .fixed(Date(timeIntervalSince1970: step.fireAt / 1000)),
        attributes: attributes,
        stopIntent: RideAlarmUpIntent(group: step.group),
        secondaryIntent: step.snooze ? RideAlarmSnoozeIntent(alarmID: id.uuidString) : nil
      )
      do {
        _ = try await AlarmManager.shared.schedule(id: id, configuration: config)
        ids[step.id] = id.uuidString
      } catch {
        // Over the limit: the soonest are set, the rest come at the next sync.
        break
      }
    }
    RideAlarmStore.saveIds(ids)
  }

  /** "I'm up": no more rings for this ride, and the app hears of it when it opens. */
  static func up(_ group: String) {
    RideAlarmStore.markWoken(group)
    let ids = RideAlarmStore.ids()
    for step in RideAlarmStore.steps() where step.group == group {
      if let s = ids[step.id], let u = UUID(uuidString: s) { try? AlarmManager.shared.cancel(id: u) }
    }
  }
}

/** Stop on the alarm. Opens the app, which shows the pre-ride screen. */
@available(iOS 26.0, *)
struct RideAlarmUpIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "I'm up"
  static var isDiscoverable: Bool = false
  static var openAppWhenRun: Bool = true

  @Parameter(title: "group")
  var group: String?

  init() {}
  init(group: String) { self.group = group }

  func perform() async throws -> some IntentResult {
    if let group { RideAlarmKit.up(group) }
    return .result()
  }
}

/** Snooze: stops this ring only. The next ring of the ride is already set. */
@available(iOS 26.0, *)
struct RideAlarmSnoozeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Snooze"
  static var isDiscoverable: Bool = false

  @Parameter(title: "alarmID")
  var alarmID: String?

  init() {}
  init(alarmID: String) { self.alarmID = alarmID }

  func perform() async throws -> some IntentResult {
    if let alarmID, let u = UUID(uuidString: alarmID) { try? AlarmManager.shared.stop(id: u) }
    return .result()
  }
}
#endif
