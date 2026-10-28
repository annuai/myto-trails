# Recording: device test protocol (phase 1)

Run on a real phone with a development build. Web and Expo Go cannot test any of this. Record Pass or Fail and notes for each row.

## Build

```bash
cd apps/mobile
npx expo prebuild
npx expo run:ios --device      # iPhone
npx expo run:android --device  # Android 13 or later
```

Allow **Always** location when asked. On Android 13+, also allow notifications, or the "Recording your ride" notice stays hidden (recording still runs).

## Reference

Before each ride, note the real distance from a trusted source (a second app, or a known route). Pass means the saved distance is within **2%** of the reference and the ride shows no "GPS gap" unless you really lost signal.

## Cases

| # | What you do | Pass when | iPhone | Android |
|---|-------------|-----------|--------|---------|
| a | Ride about 6 km. Lock the screen for the whole ride, unlock at the end | Saved ride is about 6 km, one continuous line, no GPS gap | | |
| b | Ride about 6 km with Google Maps navigating in front for most of it | Same as a | | |
| c | Start a ride. Force-quit Myto after 1 km. Reopen | Home shows "Recovered a ride". **Keep riding** continues and finishes at the full distance. Also try **Save ride** on a second attempt | | |
| d | Ride with Airplane mode on for 2 minutes mid-ride | GPS keeps recording (no network needed). Route continuous | | |
| e | Start a ride with location set to "While using" only | "Start" shows the explainer. After "Not now" the live screen shows the "Recording stops if you lock the phone" banner | | |
| f | Ride through a covered or poor-GPS stretch (tunnel, underpass) | Live screen shows "Lost GPS signal, still recording" after 15 s. The saved ride splits there and the story shows a "GPS gap". No straight line is drawn across it | | |
| g | Stop for 10 minutes at a tea stop, standing still, then continue | No "GPS gap" is reported for the stop | | |
| h | Export the GPX from a ride with a gap | The file has two `<trkseg>` blocks | | |
| i | Android: check the notification shade during a ride | "Recording your ride" is shown for the whole ride and goes away on stop | | |
| j | iOS: look at the status bar during a ride with the screen on | The blue location indicator is shown | | |

## Also check the journal on a device

The SQLite journal (`src/lib/journalStore.ts`) can only be exercised on a phone. Cases a to d cover it. If c fails, check that `myto-ride-journal.db` still has rows after the kill.

## Results

Fill in the table above, then record the date, phone models and OS versions here.
