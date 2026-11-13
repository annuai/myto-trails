# To do later

Things that are decided or half-built and waiting on something outside the code. Newest first.

## Push notifications (waiting for a paid Apple Developer account)

Needs the **Apple Developer Program** (paid). Without it an iPhone app cannot receive remote push; local reminders (to-dos, trips, daylight) already work and are unaffected.

When the account exists:
1. In Apple Developer, Certificates, Identifiers & Profiles, Keys: create a key with **Apple Push Notifications service**, download the `.p8` once, note the Key ID and the Team ID (`42XYUS7TVE`).
2. Give the key to Expo (an Expo account and `eas credentials`), and turn on the Push Notifications capability for `com.myto-moto.myto` (also its widget extension's App Group profile).
3. App: ask permission, get the Expo push token, send it to the site; add a `push_token` table (user, token, platform, last seen) and a route to register and remove it.
4. Site: send through Expo's push API (free) in batches of 100, only to members of the club, never to the author. First messages: new photo or post in a club, a reaction to your post, a ride event starting, a join request decided. Keep the same opt-out and quiet-hours rules as the local reminders.
5. Remove a token when Expo reports it invalid; delete a rider's tokens on account deletion and in the retention purge.

Until then the club feed refreshes when the screen opens and while it stays open.

## Other open items

- **Parked: "Your routes".** The list of routes a rider drew or imported (with its sheet: ride, share as a link, export GPX, delete) and the saved-routes picker on a trip day are hidden, because riders should not keep riding the same routes. The code is not deleted: `SHOW_SAVED_ROUTES` in `apps/mobile/src/lib/savedRoutes.ts` is `false`; the UI is in `app/plan.tsx` and `features/trip/TripDayFields.tsx`, the data in `store/myRoutes.ts`. A route built or imported is still saved and followed, but there is no list to manage it from. Turn the flag on to bring it back; delete the code only if it is clearly not needed. Also gone from the trip day: "minutes after you set off" (riders should not micro-plan); old stops keep any value they had, unshown.

- **Crash reporting, what is left:** Sentry projects `myto-web` and `myto-mobile` exist (org `myto-xc`) and the site's `SENTRY_DSN` is set on Vercel. The phone reports only from a release build with `EXPO_PUBLIC_SENTRY_DSN` in `apps/mobile/.env`. Left: `pod install` and a device build (the Sentry pod is new), a Sentry auth token as `SENTRY_AUTH_TOKEN` on the build machine (never committed) to upload source maps, and an upload step for the source maps in the Xcode build (the Sentry Expo plugin is not used: it wants `expo prebuild --clean`, which would wipe the hand-made native setup; Metro already adds debug ids via `metro.config.js`). Sentry can still store a coarse city and country per phone report; a data-scrubbing rule for `$user.geo.**` would remove it (declined for now).
- **Apply migrations 0049 (sweep heartbeat) and 0050 (sync, and the `sync` token scope) to Supabase** before deploying; sign-in fails against the old scope check otherwise. After deploying, the check-in workflow's watchdog step stays red until the first sweep has run.

- **Rider story:** Before standing is useful in production, set `CRON_SECRET` on Vercel (the rollup needs it; migration 0048 is applied). More Pillion poses (helmet, chai stall, rain) are P1; see `apps/mobile/assets/pillion/README.md`. Move cells to districts for a district once it has 20 opted-in riders (`ride_summary` stores a 1-degree cell, so district challenges cannot be counted yet).
- **R2 lifecycle rule:** expire objects in the `quarantine` bucket after one day. Photos that were sent but never posted leave nothing in the database for the purge to find.
- **Custom domain for the public bucket** behind Cloudflare, so photos are cached at the edge (the `r2.dev` address is rate limited and not for production). Set `R2_PUBLIC_BASE_URL` to it.
- **GitHub `CRON_SECRET`** must equal the Vercel one (the check-in sweep got a 401 on 6 Nov 2026). Reveal the Vercel value, then `pbpaste | gh secret set CRON_SECRET --repo annuai/myto-trails`, and run the Check-in sweep workflow to confirm.
- **Video in club posts:** short clips (15 s or less), compressed on the phone, stored in R2. Not started.
- **Community heat map:** needs sync, consent and 30 or more active riders first (see the architecture notes in the conversation of 5 Nov 2026 and `docs/sync-design.md`).
- **Offline regions:** build and upload the states in `tooling/offline-regions/regions.json` that are not yet published, set up a monthly refresh, and run the device checks (download, airplane-mode map and search, delete, update, trail inside a region) on a phone.
