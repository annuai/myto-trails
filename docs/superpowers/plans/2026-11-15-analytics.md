# Product analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anonymous, scrubbed PostHog analytics in the site and the app, on by default with an opt-out in the app, and masked session replay on the site only.

**Architecture:** `packages/domain` owns the event list, the allow-list scrubber and the web page-pattern function. Each app has one thin client module that calls the scrubber before anything leaves the device.

**Tech Stack:** posthog-js (web), posthog-react-native (pure JS, no new native modules), vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-analytics-design.md`

## Global Constraints
- Free tier only. EU host: `https://eu.i.posthog.com` (assets: `https://eu-assets.i.posthog.com`).
- No cookies or localStorage on the site (`cookieless_mode: 'always'` where supported, otherwise `persistence: 'memory'`).
- No coordinates, routes, ride ids, emails, names or free text in any event. Every event carries `$geoip_disable: true`.
- Off in a development build and without a key (`EXPO_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`).
- Mobile styling only through tokens; no new native modules (so no pod install is needed).

## Review Focus
1. A prop that is not on the allow-list (for example a `lat` slipped into `ride_finished`) is dropped, not sent.
2. A string prop that looks like an email, a token or a coordinate is dropped even when its key is allowed.
3. Web paths with private ids (`/track/abc`, `/route/x`, `/join/CODE`, `/account/contributions/123`) come out as patterns; query strings and hashes are removed.
4. Turning Usage statistics off stops events straight away; turning it back on resumes them.
5. Replay never runs on `/account`, `/sign-in`, `/auth`, `/moderate`, `/track`, `/route`, `/join`, `/submit` or `/saved`, including after a client-side navigation onto one of them.

---

### Task 1: Domain event list and scrubber
**Files:** Create `packages/domain/src/analytics.ts`, `packages/domain/src/analytics.test.ts`; export from `packages/domain/src/index.ts`.
**Produces:**
- `AnalyticsEventName`, `AnalyticsProps`, and the `ANALYTICS_EVENTS` allow-list.
- `scrubAnalyticsProps(name, props) => AnalyticsProps`.
- `webPagePattern(pathname) => string`.
- `screenPattern(segments: string[]) => string`.
- `REPLAY_BLOCKED_PREFIXES` and `replayAllowed(pathname) => boolean`.

- [ ] Tests:
  - Unknown keys are dropped.
  - `distanceKm` rounds to a whole km and `durationMin` to the nearest 5.
  - Emails, coordinates and strings over 80 characters are dropped.
  - `webPagePattern('/track/abc?x=1#y') === '/track/[id]'`.
  - `webPagePattern('/trails/spiti-loop') === '/trails/spiti-loop'`.
  - `webPagePattern('/account/contributions/9') === '/account/contributions/[id]'`.
  - `screenPattern(['(tabs)','trail','[id]']) === '/trail/[id]'`.
  - `replayAllowed('/account') === false` and `replayAllowed('/trails/x') === true`.
- [ ] Implement, then run `npx vitest run packages/domain/src/analytics.test.ts` and check it passes.

### Task 2: Mobile client and opt-out
**Files:**
- Create `apps/mobile/src/lib/analytics.ts` and its test.
- Modify `apps/mobile/src/store/appearance.ts` to add `usageStats` (default true, persisted).
- Modify `apps/mobile/app/others.tsx` to add the Usage statistics row.
- Modify `apps/mobile/app/_layout.tsx` to start analytics and track screens through `useSegments`.
- Add calls in `app/ride/index.tsx` (ride_started), `src/lib/finishRide.ts` (ride_finished), `app/trail/[id].tsx` (trail_viewed), `app/fixit/[id].tsx` (fix_it_opened) and the offline region download (offline_region_downloaded).

**Produces:**
- `startAnalytics(key?, dev?) => boolean`.
- `track(name, props?)`.
- `setUsageStats(on)`.
- `useScreenTracking()`.

- [ ] Tests:
  - It stays off without a key or in a dev build.
  - Nothing is sent while `usageStats` is false.
  - Props are scrubbed before `capture`.
- [ ] Implement, then run `npx vitest run apps/mobile/src/lib/analytics.test.ts` and check it passes.

### Task 3: Web client, proxy, masked replay
**Files:**
- Create `apps/web/src/lib/analytics.ts` (`initAnalytics`, `track`) and `apps/web/src/layout/Analytics.tsx` (a client component that sends page views by pattern and starts or stops replay by path).
- Modify `apps/web/next.config.ts` to add `/ingest` rewrites and `skipTrailingSlashRedirect`.
- Modify `apps/web/src/app/layout.tsx` to mount `<Analytics />`.

- [ ] Run `npm run typecheck` and the web tests touched; load a page in dev with a key and check the `/ingest` requests are sent, no cookies are set and the path is a pattern.

### Task 4: Privacy text and docs
- `legal.ts`:
  - Add a "Usage statistics" section.
  - Add PostHog to the companies list.
  - Add one sentence to the Cookies section.
  - Change `UPDATED` to 15 November 2026.
- One line each in docs/05 (observability), docs/11 (privacy), docs/15 (line 245) and docs/myto-strategy/product-roadmap.md F5. Close question 9 in docs/13.
- Then run `npm test`, `npm run lint`, `npm run typecheck` and `npm run check:tokens`, and commit.
