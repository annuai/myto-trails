# Myto app (apps/mobile)

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

**Stubs, so nothing here is mistaken for done:** clubs are sample data; the offline copy saves details and route but not map tiles; the phone map (`OsmMap.tsx`) and the Android and iOS sign-in redirect are written but not yet run on a device; background recording on Android is not built (the recorder runs in the foreground only, see the spike in docs/16 §7); voice notes are not built; documents and contacts sit in unencrypted local storage.

`src/ui` holds every component, `src/theme` the tokens (copied from `packages/tokens`, to be generated), `src/api` the website client, `src/lib` the tested logic, `src/store` the on-device data.
