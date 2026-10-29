# Crash detection: design

Status: **built, beta, uncommitted.** Unit tests (detector, countdown, store) pass and the countdown, alert and test screens were checked in the web build. The sensors have never run on a phone. Scope: `apps/mobile` only, no server work, no cost. Opt-in, off until the rider turns it on. Decided with the owner on 2026-10-29: the alert goes to the rider's group and offers a call; nothing is sent automatically to a solo rider's contacts.

## 1. What it does

While a ride is recording, the phone watches for a crash: a hard impact while moving, then the bike stopping dead. If it sees one, a full-screen "Are you OK?" countdown starts with loud buzzing and a lock-screen notification. The rider cancels it with one big button ("I'm OK", also a button on the notification). If nobody cancels within 60 seconds:

1. On a **group ride**, the rider's status becomes `help` and syncs at once, exactly like pressing Help. The group's phones tell their riders ("is asking for help"), and the group sheet shows where.
2. The screen and a notification offer **one-tap calls**: the primary emergency contact and 112.

## 2. What it deliberately does not do

- **No automatic SMS or call.** iOS does not let an app send a text or place a call unseen, and a paid SMS service breaks the free-tier rule. A **solo rider with no group is alerted to no one automatically**; the countdown and call prompt are all they get. The settings screen says this in plain words so nobody relies on more than it does.
- **Not a certified crash detector.** It is not tested against real falls. Offered as beta.
- No lean-angle, no speed-limit warnings.

## 3. Detection (`lib/crashDetect.ts`, pure, tested)

A crash needs all of these in order:

| Step | Evidence | Threshold |
|---|---|---|
| Moving | GPS speed in the 12 s before the impact | at least 25 km/h |
| Impact | Peak acceleration in a 2 s accelerometer window (includes gravity) | at least 4 g |
| Dead stop | A GPS fix 1 to 6 s after the impact window | under 8 km/h |
| Still | No walking steps and no fix at 15 km/h or more from 3 s on | until 12 s after the impact |

The stop must come quickly: a pothole followed by a normal stop at a signal slows over many seconds and does not qualify. After 12 s with all of the above holding, the detector reports a crash. It gives up on an impact if the rider is riding again (a fix at 15 km/h or more 3 s or more after it), if steps are seen (they are up and walking), or after 30 s without the dead stop.

Thresholds are first guesses. The accelerometer runs at about 10 Hz, so a very short spike can be missed and a window peak is read late by up to 2 s. Both lean towards missing a crash rather than raising a false alarm; tune by replaying recorded rides (see the motion trace).

**Known false-alarm cases:** a phone dropped or knocked hard while the bike brakes to a stop within seconds; a very hard pothole followed by an immediate stop. The countdown is the safety net, and the alert is cancellable from the lock screen.

## 4. Parts

| File (`apps/mobile/src`) | Job |
|---|---|
| `lib/crashDetect.ts` | Pure state machine: evidence in, `crash: true` out |
| `lib/crashAlert.ts` | Pure: the countdown, what to say, who to call |
| `store/crashCore.ts`, `store/crash.ts` | The on/off setting (persisted), the detector state and the countdown phase |
| `CrashHost.tsx` | Full-screen countdown and alerted screens; buzzing; sends the group Help; notification |
| `lib/shakeSensor.ts` | Also reports the window's peak acceleration |
| `RecorderHost.tsx` | Feeds GPS speed and accelerometer windows to the detector while a ride runs |
| `app/safety.tsx` | The settings screen: on/off, a test button, plain limits |

## 5. Permissions and privacy

Uses the accelerometer and location the ride already uses, and the notification permission. Nothing is recorded or sent unless a crash is confirmed by the rider's inaction on a group ride, and then only the status the Help button already sends. The "Test the alert" button runs the whole screen and notification but sends nothing to the group.

## 6. Not done

- Not run on a real phone, never tested with a real or simulated impact. Whether the accelerometer keeps delivering readings with the screen locked (iOS suspends sensors unless background location keeps the app alive) is unverified, and the whole feature depends on it.
- The lock-screen "I'm OK" button and the loud Android channel are written but unseen on a device.
- No sound louder than vibration and the notification sound; no audible siren.
- No automatic contact for solo riders (see section 2).
- No server-side "no check-in, so alert" for solo riders; the existing check-in timer covers some of that.
