# Ride controls on the lock screen: design

Status: **built (steps 2 to 5 of section 6), not yet run on a device.** The iOS spike (step 1) is the first thing to check on the phone: press Pause on the lock screen and confirm the ride pauses. Android is untested. Scope: `apps/mobile`. No server work, nothing that costs money (no push updates; every update is local). Follows [the ride notification design](2026-10-29-ride-notification-design.md), which listed Live Activity as not done.

## 1. Why

The ride notification works through iOS's and Android's ordinary notification buttons. On iPhone those buttons are hidden until the rider pulls the notification down, so Pause is not visible at a glance, and nothing is shown in the Dynamic Island (the only thing there today is iOS's own location pill, which just opens the app). A rider on a bike needs Pause, and the ride's numbers, visible without any gesture.

## 2. What it does

| Platform | Surface | Always visible | Buttons |
|---|---|---|---|
| iOS 16.2+ | Live Activity: lock screen card and Dynamic Island (compact, expanded, minimal) | Yes | Pause / Resume, and Help on a group ride |
| Android | One ongoing notification with a custom layout, expanded by default | Yes | Pause / Resume, and Help on a group ride |
| Either, when the surface is unavailable (Live Activities off, old OS, permission refused) | The ordinary notification we have now | Buttons behind a pull-down on iOS | Same actions |

Shown while a ride is recording and for as long as it is paused. Gone when the ride ends. It shows: state (Recording or Paused), elapsed time, distance, and on a group ride the number of riders. Solo or group, trip or no trip, the same card: a trip never removes a button.

## 3. Library

`expo-widgets` (58.x, the Expo package that matches this SDK). It gives:

- iOS: `LiveActivity` with lock screen and Dynamic Island layouts written with Expo UI components, `start`, `update`, `end`.
- Android: `CustomNotification` with a layout, in-place `update`, and `cancel`.
- One listener, `addUserInteractionListener`, for button presses on both platforms. The event carries a `target` string, so a button id such as `ride.pause` maps straight onto our `RideActionId`.

Rejected: `expo-live-activity` (iOS only, third party) and hand-written SwiftUI plus a Kotlin module (more native code to keep for the same result).

## 4. Parts

| File (`apps/mobile/src`) | Job |
|---|---|
| `lib/rideActions.ts` | Already pure. Gains `rideSurface(...)`: the state, labels and buttons for the card, tested without a device |
| `lib/rideSurface.ts` | New, phone only: start, update and end the Live Activity (iOS) or custom notification (Android); reports whether it could be shown |
| `lib/rideSurface.web.ts` | Web stand-in |
| `lib/rideNotification.ts` | Stays as the fallback and for the Help-sent, Undo and crash notices |
| `RideNotificationHost.tsx` | Chooses: surface if available, otherwise the ordinary notification. Button presses from either go to the same handler that exists now |
| `features/rideSurface/RideActivity.tokens.tsx`, `RideCard.tokens.tsx` | The two card layouts (iOS, Android). `.tokens` because a widget body cannot import anything, so its sizes and colours are literals |
| `lib/rideSurface.{ios,android}.ts`, `rideSurfaceEvents.ts` | The real start, update, end and button listener per platform (`rideSurface.ts` is the browser stand-in) |
| `app.json` | The `expo-widgets` plugin (`frequentUpdates`, `enableAndroid`): adds the iOS widget extension and `NSSupportsLiveActivities` |

## 5. Decisions

- **Local updates only.** The app is kept alive while recording by background location, so it can update the card without push. Time uses the system's own timer so it ticks without updates; distance is updated about every 30 seconds to stay inside iOS's update budget.
- **Buttons reach JavaScript** through the interaction listener. Whether that works with the phone locked is the main thing to prove (section 7).
- **One owner per button.** A press changes the recorder store, the store change updates the card. The card never changes itself.
- **Android has two notifications while recording**: the one the OS requires for the background location service ("Recording your ride") and ours. Ours carries the buttons; the required one stays low-key. Merging them is not possible with the location library, so this is accepted.
- **Fallback is automatic.** If the card cannot be shown, the ordinary notification is used, so the rider always has some controls.
- **Failures stay quiet**, as before: recording must never break because a card could not be drawn.

## 6. Steps

1. **iOS spike on the phone** (the risky part): add the plugin, regenerate `ios/`, build Release, show a static card with a Pause button, press it with the phone locked, confirm the event reaches the app. Stop here if it does not.
2. `rideSurface(...)` in `rideActions.ts` with tests.
3. `rideSurface.ts` for iOS, wired into the host, with the fallback.
4. Android: custom notification layout, same host, same tests; checked on a device later.
5. Update the two design docs and the README.

## 7. Risks

- **A locked-phone button press may not reach JavaScript** if iOS suspends the app. Background location should keep it alive, but this is unproven. If it fails, the button can open the app for a moment instead (still better than hidden), or the controls stay in the app only.
- **Native rebuild.** Adds a widget extension target: new signing and bundle identifier (`com.myto-moto.myto.widgets`), and the `ios/` folder is regenerated. Expo Go no longer works; development builds do.
- **Dynamic Island exists only on newer iPhones.** Older ones get the lock screen card only.
- **Android Live Updates** (Android 16 status-bar chip) is not in scope; the ongoing notification is the baseline.
- **Not run on any device yet.** Android is tested later, as agreed.

## 8. Not doing

- Push-driven updates, a map in the card, an elapsed-distance chart, or any server work.
- A home screen widget (the same package could do it later).
