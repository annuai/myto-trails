# Recording: device test protocol (phase 1)

Run on a real phone with a development build. Web and Expo Go cannot test any of this. Record Pass or Fail and notes for each row.

## Build

```bash
cd apps/mobile
npx expo prebuild
npx expo run:ios --device      # iPhone
npx expo run:android --device  # Android 13 or later
```

The committed `apps/mobile/ios/Info.plist` already carries the background location mode and the location and microphone texts. Do **not** run `prebuild` without a pod install (it deletes `Podfile.lock` and other generated files): `npx expo run:ios` installs pods itself. Android has no native project yet; `npx expo run:android` generates it from `app.json` (background location, foreground service, microphone).

Allow **Always** location when asked. On Android 13+, also allow notifications, or the "Recording your ride" notice stays hidden (recording still runs).

## Reference

Before each ride, note the real distance from a trusted source (a second app, or a known route). Pass means the saved distance is within **2%** of the reference and the ride shows no "GPS gap" unless you really lost signal.

## Cases

| # | What you do | Pass when | iPhone | Android |
|---|-------------|-----------|--------|---------|
| a | Ride about 6 km. Lock the screen for the whole ride, unlock at the end | Saved ride is about 6 km, one continuous line, no GPS gap | | |
| b | Ride about 6 km with Google Maps navigating in front for most of it | Same as a | | |
| c | Start a ride. Force-quit Myto after 1 km. Reopen | Home shows "Recovered a ride". **Keep riding** continues and finishes at the full distance. Also try **Save ride** on a second attempt | | |
| c2 | Android: start a ride, swipe the app away from recents, ride 1 km, reopen. Then tap **Save ride** | Fixes recorded while the app was gone are in the ride (this proves the background task is defined in a headless start). After saving, the "Recording your ride" notice disappears and GPS stops | | |
| c3 | Repeat c, but tap **Discard** | Same: notice gone, no recording continues | | |
| d | Ride with Airplane mode on for 2 minutes mid-ride | GPS keeps recording (no network needed). Route continuous | | |
| e | Start a ride with location set to "While using" only | "Start" shows the explainer. After "Not now" the live screen shows the "Recording stops if you lock the phone" banner | | |
| f | Ride through a covered or poor-GPS stretch (tunnel, underpass) | Live screen shows "Lost GPS signal, still recording" after 15 s. The saved ride splits there and the story shows a "GPS gap". No straight line is drawn across it, on the live map, the ride card and the story map | | |
| g | Stop for 10 minutes at a tea stop, standing still, then continue | No "GPS gap" in the story, and no "Lost GPS signal" banner while stopped. Also note how far the distance grew while standing (GPS drift) | | |
| h | Export the GPX from a ride with a gap | The file has two `<trkseg>` blocks | | |
| i | Android: check the notification shade during a ride | "Recording your ride" is shown for the whole ride and goes away on stop | | |
| j | iOS: look at the status bar during a ride with the screen on | The blue location indicator is shown | | |

## Pause, stopped detection and the journal

| # | What you do | Pass when | iPhone | Android |
|---|-------------|-----------|--------|---------|
| k | Ride, tap **Pause** at a tea stop, walk around with the phone for 5 minutes, tap **Resume**, ride on | Timer froze while paused, the ride bar says "Paused", no GPS gap is shown, the saved duration excludes the break, no line crosses the break | | |
| l | Pause, force-quit, reopen | Home offers the recovered ride; **Keep riding** comes back paused with the right time | | |
| m | Stop at a light or tea stop with the bike on (screen on, live screen open), then open **Journal**, **Write a note** | Note editor unlocks within about 10 s of stopping, even if the phone shows 1 km/h. Record how long it took and whether the speed reading drifted | | |
| n | Roll off in traffic at 3 to 5 km/h and try **Write a note** | Stays locked. If you start moving while typing, the draft is saved as a note and the editor closes | | |
| o | While riding, tap Journal, **Record a voice note**, stop, **Take photo** | Both are saved; open the ride story, **Journal**: the voice note plays back and the photo shows | | |
| p | **Export my data**, erase all data, **Import data** (replace) | Notes, photos and voice notes all come back and play. Repeat with merge on a phone that has other journals | | |
| q | Delete a ride that has a journal | The prompt says the journal is deleted too, and its photos and voice files go with it | | |

## Also check the journal on a device

The SQLite journal (`src/lib/journalStore.ts`) can only be exercised on a phone. Cases a to d cover it. If c fails, check that `myto-ride-journal.db` still has rows after the kill.

## Results

Fill in the table above, then record the date, phone models and OS versions here.
