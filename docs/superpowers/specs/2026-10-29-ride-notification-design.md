# Ride notification: design

Status: **built, not yet committed, not run on a device.** Scope: `apps/mobile` only. No server work. This reverses the "action buttons" non-goal in [the notifications design](2026-10-28-notifications-design.md) for one notification, the one shown while a ride is recording.

## 1. What it does

While a ride is recording, a notification carries its controls so a rider can use them from the lock screen without opening the app.

| Situation | Title | Buttons |
|---|---|---|
| Solo, recording | Recording your ride | Pause |
| Solo, paused | Ride paused | Resume |
| Group ride, recording | Recording your ride | Pause, Help |
| Group ride, paused | Ride paused | Resume, Help |
| After Help is pressed | Help sent to your group | Undo |
| After Undo | Help cancelled | none |

Tapping the notification itself (not a button) opens `/ride/live`. Buttons do not open the app.

## 2. Parts

| File (`apps/mobile/src`) | Job |
|---|---|
| `lib/rideActions.ts` | Pure: action ids, button sets per category, `rideNotice` text. Tested in `rideActions.test.ts` |
| `lib/rideNotification.ts` | The phone part: registers categories, shows, replaces and clears notifications, listens for button presses |
| `lib/rideNotification.web.ts` | Web stand-in so the web build still runs |
| `RideNotificationHost.tsx` | Mounted in `app/_layout.tsx`. Watches the recorder and companion stores and keeps the notification right |

`rideActions.ts` has no phone imports on purpose, so the wording and the button rules are tested without a device.

## 3. Decisions

- **Local notification, one fixed id** (`ride-controls`). Each change replaces it in place, so there is never a pile of them.
- **Android:** a dedicated low-importance channel, "Ride controls", so updating never beeps or pops up. The notification is sticky and cannot be swiped away while the ride runs. Android shows at most three buttons; a group ride uses two and leaves room.
- **iOS:** button categories are registered once; Help shows red (destructive).
- **A pause from the notification is the rider's own.** The ride stays paused until they resume it; auto-pause never undoes it.
- **Help** sets the rider's status to `help`, syncs the group immediately (`syncGroupNow`), and shows a second notification with Undo, because a button on a lock screen is easy to press by mistake. Undo sets the status back to `ok` and syncs again.
- **Clean-up.** The ride notification clears when the ride is no longer running. The Undo notification clears when the ride ends or when help is cleared some other way, such as the group sheet.
- **Failures are quiet.** Every call is `.catch(quietly)`; a refused notification permission must never break recording.

## 4. Permission

Uses the notification permission the app already asks for under Notifications settings. If it is denied, nothing shows and the ride records as before.

## 5. Not done

- Not run on an iPhone or Android device. Whether Help from a locked iPhone reaches the group quickly depends on the app staying alive in the background; check it on a real ride.
- No Live Activity or Dynamic Island on iOS, and no ongoing-notification timer or distance. The text is static.
- No "I'm OK / need a break" buttons; Help is the only group status exposed.
