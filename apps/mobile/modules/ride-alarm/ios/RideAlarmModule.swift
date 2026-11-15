import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
#endif

/** Ride alarms on iOS: AlarmKit from iOS 26. Older phones report unsupported and the app sends notifications instead. */
public class RideAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RideAlarm")

    Function("isSupported") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { return true }
      #endif
      return false
    }

    AsyncFunction("authorization") { () -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        switch AlarmManager.shared.authorizationState {
        case .authorized: return "granted"
        case .notDetermined: return "undetermined"
        default: return "denied"
        }
      }
      #endif
      return "denied"
    }

    AsyncFunction("requestAuthorization") { () async -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { return (try? await AlarmManager.shared.requestAuthorization()) == .authorized }
      #endif
      return false
    }

    AsyncFunction("replaceAll") { (json: String) async throws in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { try await RideAlarmKit.replaceAll(json) }
      #endif
    }

    AsyncFunction("takeWoken") { () -> String in RideAlarmStore.takeWoken() }
  }
}
