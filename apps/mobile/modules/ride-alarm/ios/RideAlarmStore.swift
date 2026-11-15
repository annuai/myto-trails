import Foundation

/** One ring, as planned by the app (src/lib/alarm/ladder.ts). */
struct RideAlarmStep: Codable {
  let id: String
  let group: String
  let index: Int
  let fireAt: Double
  let title: String
  let body: String
  let snooze: Bool
  let route: String
}

/**
 * The rings, the AlarmKit ids they were set under, and what the rider did. Kept in the app's own defaults: the intents run in the app's
 * process, so they read the same store without the JavaScript.
 */
enum RideAlarmStore {
  private static let defaults = UserDefaults.standard
  private static let stepsKey = "rideAlarm.steps"
  private static let idsKey = "rideAlarm.ids"
  private static let wokenKey = "rideAlarm.woken"
  private static let doneKey = "rideAlarm.done"
  /** A group the rider got up for is never rung again, even if the app sends it back before it has heard. Forgotten after two days. */
  private static let doneKeepS: Double = 2 * 86_400

  static func steps() -> [RideAlarmStep] {
    guard let data = defaults.data(forKey: stepsKey) else { return [] }
    return (try? JSONDecoder().decode([RideAlarmStep].self, from: data)) ?? []
  }
  static func saveSteps(_ steps: [RideAlarmStep]) { defaults.set(try? JSONEncoder().encode(steps), forKey: stepsKey) }

  /** Step id → AlarmKit UUID string. */
  static func ids() -> [String: String] { defaults.dictionary(forKey: idsKey) as? [String: String] ?? [:] }
  static func saveIds(_ ids: [String: String]) { defaults.set(ids, forKey: idsKey) }

  static func isDone(_ group: String) -> Bool { (defaults.dictionary(forKey: doneKey) as? [String: Double])?[group] != nil }

  static func markWoken(_ group: String, at: Date = Date()) {
    let now = at.timeIntervalSince1970
    var done = (defaults.dictionary(forKey: doneKey) as? [String: Double] ?? [:]).filter { now - $0.value < doneKeepS }
    done[group] = now
    defaults.set(done, forKey: doneKey)
    var woken = defaults.array(forKey: wokenKey) as? [[String: Any]] ?? []
    woken.append(["group": group, "at": now * 1000])
    defaults.set(woken, forKey: wokenKey)
  }

  static func takeWoken() -> String {
    let woken = defaults.array(forKey: wokenKey) as? [[String: Any]] ?? []
    defaults.set([[String: Any]](), forKey: wokenKey)
    guard let data = try? JSONSerialization.data(withJSONObject: woken), let s = String(data: data, encoding: .utf8) else { return "[]" }
    return s
  }
}
