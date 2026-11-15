# Product analytics (web + mobile): design

## Intent
Learn how riders use the site and the app (roadmap F5, "measurement without tracking"), and report monthly active riders (MAR), at no cost and without breaking the privacy promises in `packages/domain/src/legal.ts`.

## Goals / non-goals / anti-goals
- Goals: one typed event list shared by web and mobile; MAR; funnels for the main journeys; web session replay with masking.
- Non-goals: crash reporting (Sentry stays), A/B tests, feature flags, mobile session replay, marketing attribution.
- Anti-goals: any coordinates, route, ride id, email, name or free text in an event; cookies or ad identifiers; anything that costs money.

## Constraints
Free tier only (PostHog Cloud ~1M events and 5k replays a month). DPDP-aligned. The privacy policy says the site sets no tracking cookies, and that must stay true.

## Approaches
- **PostHog Cloud (EU) — chosen.** Free, covers web and Expo, has funnels and retention, and the user already knows it.
- Aptabase: very private, but 20k events a month and thin reports.
- OpenPanel: self-hosting it would cost money; the free cloud plan is unclear.
- Umami / Vercel Analytics: web only.

## Decided with the user
- **On by default, with an opt-out** ("Usage statistics" switch, You → Privacy, next to Crash reports). This replaces "off until the rider agrees" in docs/15.
- **Session replay: web only, masked.** No replay in the app (screens show the rider's location and routes; it would also cost battery and data during rides).

## Design
1. `packages/domain/src/analytics.ts`: an `AnalyticsEvent` union (name + allowed props) and `scrubAnalyticsProps`, which drops any prop not on the allow-list and rounds numbers (distance to 1 km, duration to 5 min). Unit tests.
   - App events: `app_opened`, `screen_viewed` (route pattern, e.g. `/trail/[id]`, never real ids), `ride_started`, `ride_finished` (rounded distance and duration), `trail_viewed`, `offline_region_downloaded` (country/region code), `fix_it_opened` (guide slug).
   - Web events: `$pageview` (path with ids replaced by the route pattern), `trail_viewed`, `sign_in_completed`, `app_download_clicked`.
2. **Mobile** `apps/mobile/src/lib/analytics.ts` with `posthog-react-native`:
   - It runs only in a release build with `EXPO_PUBLIC_POSTHOG_KEY` set, the same way as `crashReporting.ts`.
   - An anonymous random ID, with no ad IDs, no automatic tap capture, no replay and no person profiles.
   - Screen events come from the expo-router pathname, reduced to its pattern.
   - The `usageStats` flag lives in the store next to `crashReports`. Turning it off calls `optOut()` straight away.
3. **Web** with `posthog-js`, set up in a small client provider in the root layout:
   - `persistence: 'memory'`, so no cookies or localStorage, and `person_profiles: 'never'`. Errors are not captured.
   - Events are sent through a `/ingest` rewrite in `next.config.ts` to the EU host, so ad blockers don't drop them.
   - Replay is sampled (about 20%) with `maskAllInputs` and text masking on. Pages under `/account`, `/sign-in`, `/auth` and `/moderate` are never recorded.
   - Keys come from `NEXT_PUBLIC_POSTHOG_KEY`; with no key set, the provider does nothing.
4. **MAR** = distinct anonymous IDs with `app_opened` in a calendar month, saved as a PostHog insight.
5. **Docs (one line each):**
   - Privacy text in `legal.ts`: what is counted, the opt-out, and that the site has no cookies.
   - docs/05: an observability row.
   - docs/11: a privacy line.
   - docs/15: line 245, now on with an opt-out.
   - Roadmap F5: built.
   - docs/13: close open question 9.

## Left to the builder
Exact masking selectors, the replay sample rate, and the flush and batch settings.

## User to do
Create the PostHog EU project, set the keys in `apps/web/.env.local`, on Vercel and in `apps/mobile/.env`, and save the MAR insight. A mobile release build (with `pod install`) is needed before app events can be checked on a device.
