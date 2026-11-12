# Myto Moto app (apps/mobile)

Expo (React Native) app. Design and decisions: [docs/16](../../docs/16-myto-app-ui.md). Runs on the web for testing and on Android/iOS with the same code.

```bash
npm install            # from the repo root
npm run web -w @moto-trails/mobile        # http://localhost:8081, shown at phone width
npm run android -w @moto-trails/mobile    # needs Android Studio or a device with Expo Go / a dev build
npm test -w @moto-trails/mobile           # logic tests (dates, due dates, GPX, trimming)
npm run typecheck -w @moto-trails/mobile
```

**Run it against the website (real trails, sign-in, upload):**

```bash
# terminal 1: the website, on a local database, printing sign-in links instead of emailing them
cd apps/web && DATABASE_URL=postgres://localhost:54329/moto_trails SITE_URL=http://localhost:3000 EMAIL_PROVIDER=console STORAGE_PROVIDER=local npm run dev
# terminal 2: the app (web build)
npm run web -w @moto-trails/mobile
```

`EXPO_PUBLIC_API_BASE` (default `http://localhost:3000/api/v1`) points the app at a website; on an Android emulator use `http://10.0.2.2:3000/api/v1`. `EXPO_PUBLIC_MAP_STYLE_URL` replaces OpenStreetMap's public tiles (light use only) for launch. Apply the new migration (`npm run db:migrate -w @moto-trails/web`) to any database the app will sign in against; it adds one table, `app_auth_code`.

**Try without a phone:** Record, choose "Simulated (testing)", Start ride, hold Stop. The ride story can then be exported as GPX or uploaded.

**Stubs, so nothing here is mistaken for done:** clubs are sample data; the phone map (`OsmMap.tsx`) and the Android and iOS sign-in redirect are written but not yet run on a device; background recording on Android is not built (the recorder runs in the foreground only, see the spike in docs/16 §7); voice notes are not built; documents and contacts sit in unencrypted local storage.

`src/ui` holds every component, `src/theme` the tokens (copied from `packages/tokens`, to be generated), `src/api` the website client, `src/lib` the tested logic, `src/store` the on-device data.

**iPhone build:** the native project is `ios/MytoMoto` (renamed from `ios/Myto`). After pulling, run `npx pod-install` or `pod install` in `ios/`; `Podfile.properties.json` sets `EXPO_USE_PRECOMPILED_MODULES` to `false`. Background location, motion and notification buttons only work in a development build on a real phone, not in Expo Go or the simulator.

**What is built, by feature:** see [docs/16 §13](../../docs/16-myto-app-ui.md) and [docs/superpowers/specs/](../../docs/superpowers/specs/). Route planning uses two free public services (Photon for places, Valhalla for roads) and needs no key.

## Home and recording power use

- **Home and Work** are saved on the phone only (`src/store/places.ts`, set in You, Settings, Home and work); they are never sent to the server. They are in the encrypted device backup; older backups still import.
- **Trimming:** anything with a route that leaves the phone (link, ride card, OSM trace, trail submission, GPX, condition report) drops leading and trailing points within 500 m of Home or Work (`src/lib/privacy.ts`); nothing left means the "too short" handling.
- **Ride home offer** (`src/lib/homeRoute/offer.ts`): on Dash after the just-finished ride card and at the top of that ride's story, when Home is set, a fix under 2 minutes old is more than 1.5 km away, and sunset is within an hour, a ride ended in the last 30 minutes, or it is near the rider's usual start. Quiet at home, during a ride, group ride or trip, after a sample or simulated ride, 3 hours after a dismissal and 14 days after three dismissals in 14 days.
- **Guidance is the default;** "Record it" also starts a ride (`src/features/home/goHome.ts`). Ready and "Get to the start" carry a plain Home row that never reads the position.
- **No continuous GPS for the offer:** it uses the recorder's latest point, else a fresh fix another screen holds, else one balanced-accuracy reading on focus, at most every 5 minutes; no timer.
- **Heading home? nudge** (kind `home`, see [ride-nudges](../../docs/ride-nudges.md)) reads only Home and the last ride's final point.
- **Auto-end** (`src/lib/homeRoute/autoEnd.ts`, off by default) acts only on a real ride (1 km, 5 minutes) that went 1 km away and came back: still inside 200 m for 60 s (20 s when guided there) warns, 30 s later it ends through the same `endRide` as Stop. Keep recording cancels that place for the ride and adds a strike; after 2 strikes, and for Work unless guided there, it only asks. Never in a group ride; during a trip or route with waypoints only when guided there.
- **Recording profiles** (`src/lib/recordingProfile.ts`, "Save battery on long rides", on by default): full (best for navigation, 1 s), saver (high, 3 s), idle (balanced, 10 s). Saver at 20% or less unplugged (10% while navigating), left at 25%; idle after 2 minutes still; full again at 5 km/h, on resume or on a poor fix; otherwise switches wait 60 s.
- **Trade-offs:** savings show only with the screen off; iOS saves through accuracy only (the interval is Android's); distance and top speed may read slightly low. Auto-end stops the GPS on arrival.
- **Not measured yet (manual test for the owner):** (1) record the same ~45-minute commute twice, saver off then on, and compare battery percent; (2) ride home with auto-end on and confirm the GPS indicator is gone within 2 minutes of arriving; (3) note both results in the PR. This has not been run.
