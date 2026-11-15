# Ride alarms

A wake-up alarm for a planned trip (each day) or a club ride the rider is going to: 15 or 30 minutes before the start. Everything is on the phone; no server, no push.

**Decision: every ring is planned when the alarm is set.** `apps/mobile/src/lib/alarm/ladder.ts` (pure, tested in `alarm.test.ts`) turns one ride into up to six rings. Snoozes shrink from 9 to 3 minutes as the latest wake-up (10 minutes before the start, or before the sun if sooner) nears. A ride timed for a sunrise (30 min before to 90 after the start) or a sunset (up to 2 h after) gets "Snooze again and you miss the sunrise" on the ring after which one more snooze loses it. The last ring has no snooze. The phone's alarm code only steps through these rings, so Snooze never needs the app's JavaScript: it stops the ring, and the next one is already set. "I'm up" cancels the rest. Why: on a locked phone with the app killed, JS may not run.

| Where | How it rings | "I'm up" reaches the app |
|---|---|---|
| Android (`modules/ride-alarm/android`) | `setAlarmClock` per ring, alarm-sound channel, insistent, full-screen `AlarmActivity` over the lock screen, re-set after a restart | `takeWoken()` when the app opens |
| iOS 26+ (`modules/ride-alarm/ios`) | AlarmKit, one alarm per ring; Snooze and Stop are `LiveActivityIntent`s in the pod | same; Stop opens the app |
| iOS before 26, AlarmKit refused, Expo Go | time-sensitive notifications in the reminder schedule (`ride-alarm` category) | the button or a tap (`useAlarmResponse`) |

Context: the sun is worked out offline (`packages/domain/src/sun.ts`) at home, the latest ride's start or the phone's position. The weather comes from the nudge forecast, which is also kept fresh while an alarm is set. The pack list comes from the trip's to-dos. An alarm replaces the trip's "starts in 10 minutes" reminder for that day. Alarm text is always shown on the lock screen, whatever "Show details" says, because a hidden alarm could not warn. "I'm up" opens `app/alarm/[group].tsx`.
