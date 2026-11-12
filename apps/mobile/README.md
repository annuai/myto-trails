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

Home and Work are saved on the phone only (store `myto-places`, `src/store/places.ts`). They are never sent to the server.
Anything with a route that leaves the phone (route link, ride card, OpenStreetMap trace, trail submission, GPX export, a story's condition report) also drops its leading and trailing points within 500 m of Home or Work (`trimNearPlaces` in `src/lib/geo.ts`, via `src/lib/privacy.ts`); a pass in the middle stays. When nothing is left, the existing "too short" handling applies (GPX export is disabled).
Home, Work, their strikes and the auto-end and battery saver switches are in the encrypted device backup (`places`, `rideSwitches`); older backups without them still import and leave the phone's own.

The "Ride home" offer (`src/lib/homeRoute/offer.ts`) shows when Home is saved, the phone has a fresh fix more than 1.5 km from it, and one of these holds: sunset is within an hour, a ride ended in the last 30 minutes, or it is near a time the rider usually starts.
It stays quiet at home, during a ride, group ride or trip, after a sample or simulated ride, for 3 hours after a dismissal, and for 14 days after three dismissals within 14 days.
Dismissals are kept on the phone only (store `myto-home-offer`, `src/store/homeOffer.ts`), the last 10.
The offer never starts a GPS watch. It uses the recorder's latest point during a ride, else a fresh fix another screen already holds, else one low-accuracy reading (`Accuracy.Balanced`) on screen focus or returning to the app, at most once every 5 minutes (`src/features/home/quickPosition.ts`).
There is no repeating timer; sunset is looked up once a day per area and cached.
The offer card (`src/features/home/HomeOfferCard.tsx`) sits on Dash after the just-finished ride card (ADR 0009) and at the top of that ride's story.
The Ready screen and the "Get to the start" sheet carry a plain "Ride home" / "Home" row whenever Home is set; they never read the position.
Set Home and Work in You, Settings, Home and work (`app/home-place.tsx`): by search or one reading of your current location; Work is optional.
That screen holds the two switches: "Stop recording when I get home or to work" (needs Home or Work set) and "Save battery on long rides".
Auto-end (`src/lib/homeRoute/autoEnd.ts`) acts only on a real ride of at least 1 km and 5 minutes that has been 1 km or more from Home or Work and returned: standing still inside 200 m for 60 s (20 s when guided there) warns, and 30 s later ends it, so a stop at a junction near home or a ride that merely starts there never closes it.
It only asks, never ends, for Work unless guided there and for a place the rider has declined twice, because those are the likeliest mistaken stops.
Auto-end is off by default (`useCompanion.autoEnd`); `src/AutoEndHost.tsx` runs it only when the recorder hears a fix, with no timer and no reading of its own, and saves through the same `endRide` as Stop.
The warning is one local notification plus a line on the live screen; Keep recording (or tapping the warning) cancels that place for the ride and adds a strike, and a completed end clears the strikes.
It never runs in a group ride, and during a trip or a route with waypoints ahead only when guided to that place.
The background recording runs at one of three GPS profiles (`src/lib/recordingProfile.ts`): full (best for navigation, every second), saver (high accuracy, every 3 s) and idle (balanced, every 10 s); the on-screen watch stays at full.
Saver is used at 20 % or less unplugged (10 % or less while navigating) and left at 25 %; idle after 2 minutes still, and full again at once at 5 km/h, on resuming, or on a fix too poor to judge. Switches otherwise wait 60 s.
The trade-off: in saver and idle, distance and top speed may read slightly low. It is on by default (`useCompanion.batterySaver`); off keeps full. Auto-end stops the GPS on arrival.
