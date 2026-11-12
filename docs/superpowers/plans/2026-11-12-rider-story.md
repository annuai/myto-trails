# Rider story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Marks registry, titles, a Moment object that surfaces them, Pillion, richer Year in Rides, and opt-in standing against nearby riders, all on the free tier.

**Architecture:** Pure evaluators over one `ProgressSnapshot` produce `Moment`s; a governor (max one per session, never on ride/navigation/error screens) picks one for four existing surfaces. Comparison uses an opt-in `ride_summary` upload rolled up daily into per-cell decile tables; the phone computes its own percentile.

**Tech Stack:** TypeScript, Expo/React Native + zustand + vitest (`apps/mobile`), `packages/domain`, Next.js API routes + Supabase SQL (`apps/web`).

**Spec:** `docs/superpowers/specs/2026-11-12-rider-story-design.md`

## Global Constraints

- Free tier only: no new service; the rollup is one Vercel Hobby cron (daily) hitting a Supabase SQL function.
- Never rank or show speed or top speed; never a streak; nobody is labelled a beginner (no title below Day-tripper, no "new rider" text).
- No raw spacing, colour or type values in mobile code: tokens only; run `npm run check:tokens` after UI work.
- Sentence-case copy, one plain sentence, no guilt; Pillion never on ride, navigation, tracking or error screens.
- Upload contains only: ride id, date (day), distance km, duration s, coarse cell, bike class. Never route, start point, or time of day.
- A cohort under 20 riders shows no percentile.
- Docs: update the owning doc in the same commit as the code, about 5 lines (list in Task 10). No new doc files.
- Run only the affected test per task (`npx vitest run <file>` in the package); `*.db.test.ts` are not run.

## Review Focus

- A rider with zero real rides (sample ride only): no title, no Moment, no percentile, nothing crashes or reads as "beginner".
- Offline or signed out: server metrics are `undefined`, not 0; a title or standing never regresses or flashes.
- Cohort of 19 vs 20 riders; a value above the top decile or below the bottom; equal values (ties).
- Opt-out: summaries are deleted server-side and not re-uploaded by a queued retry; account deletion cascades.
- Existing earned Marks are not re-announced after the registry merge (the `seeded` quiet-seed behaviour is kept).

---

### Task 1: One Marks registry

**Files:**
- Create: `apps/mobile/src/lib/story/registry.ts`, `apps/mobile/src/lib/story/registry.test.ts`
- Modify: `apps/mobile/app/marks.tsx`, `apps/mobile/src/lib/badges.ts` (re-export only)

**Interfaces:**
- Consumes: `MARKS`, `earnedMarks`, `MarkInput` (`lib/marks.ts`); `ACHIEVEMENTS`, `evaluateAll`, `ProgressSnapshot`, `AchievementCategory` (`@moto-trails/domain`); `localSnapshot` (`lib/badges.ts`).
- Produces: `type MarkView = { id: string; title: string; hint: string; glyph: MarkGlyph; category: AchievementCategory; state: 'earned' | 'in_progress' | 'locked' | 'needs_data'; fraction: number }`; `markViews(input: MarkInput, server: ProgressSnapshot | undefined): MarkView[]` (local marks first, category `personal`, then badges).

- [ ] **Step 1: Write failing tests** in `registry.test.ts`: `markViews` with one real 120 km ride returns `first-ride` and `km-100` as `earned` with category `personal`; the sample ride alone returns every local mark `locked`; with `server` undefined a server-metric badge (`explorer`) is `needs_data` not `locked`; ids are unique across marks and badges.
- [ ] **Step 2: Run** `cd apps/mobile && npx vitest run src/lib/story/registry.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `markViews`** in `registry.ts`: map `MARKS` through `earnedMarks` to views, map `evaluateAll({...localSnapshot(input.rides), ...server})` through `badgeStamp` glyphs, concatenate. Make `app/marks.tsx` render one list from `markViews` grouped by category (replace its two sections); keep Trailmarks points text, challenge and leaderboard controls as they are.
- [ ] **Step 4: Run** the test and `npx vitest run src/lib/badges.test.ts src/lib/marks.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(mobile): one Marks registry`.

### Task 2: Titles

**Files:** Create `apps/mobile/src/lib/story/titles.ts`, `titles.test.ts`.

**Interfaces:**
- Produces: `type TitleId = 'day-tripper' | 'trail-regular' | 'ghat-rider' | 'long-hauler' | 'road-veteran'`; `TITLES: readonly { id: TitleId; name: string; rung: number; hint: string }[]`; `type TitleStats = { rides: number; monthsRidden: number; trailsRidden?: number }`; `titleFor(s: TitleStats): TitleId | null`; `monthsRidden(rides: readonly { startedAt: number; sample?: boolean }[]): number` (distinct calendar months, local time, sample ignored); `higherTitle(a: TitleId | null, b: TitleId | null): TitleId | null`.
- Thresholds (my calls, all must hold; `trailsRidden` undefined counts as 0): day-tripper rides ≥ 1; trail-regular rides ≥ 5 and months ≥ 3; ghat-rider rides ≥ 15, months ≥ 6, trails ≥ 5; long-hauler rides ≥ 30, months ≥ 9, trails ≥ 10; road-veteran rides ≥ 80, months ≥ 18, trails ≥ 20.

- [ ] **Step 1: Failing tests:** `titleFor({rides:0,monthsRidden:0})` is `null`; `{rides:1,...}` is `day-tripper`; 15 rides over 6 months with no `trailsRidden` stays `trail-regular`; same with `trailsRidden: 5` is `ghat-rider`; `higherTitle('ghat-rider','trail-regular')` is `ghat-rider`; `monthsRidden` counts two rides in one month once and ignores the sample.
- [ ] **Step 2: Run** `npx vitest run src/lib/story/titles.test.ts` → FAIL.
- [ ] **Step 3: Implement** the signatures above; `TITLES` order defines rung.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(mobile): rider titles`.

### Task 3: Moment, governor and story store

**Files:** Create `apps/mobile/src/lib/story/moment.ts`, `moment.test.ts`, `apps/mobile/src/store/story.ts`. Modify the places that call `useMarks.getState().sync` / the ride-end sheet and the Dash first-card area (`app/(tabs)/index.tsx`): find with `grep -rn "\.sync(" apps/mobile/src apps/mobile/app`.

**Interfaces:**
- Consumes: `MarkId`, `TitleId`, `titleFor`, `higherTitle`.
- Produces: `type PillionPose = 'hello' | 'waiting' | 'map' | 'paw-up' | 'standing-up' | 'tired-happy' | 'campfire' | 'asleep'`; `type Moment = { id: string; kind: 'mark' | 'title' | 'standing' | 'year'; title: string; body: string; pose: PillionPose }`; `type Surface = 'ride-end' | 'dash' | 'year' | 'ride' | 'navigate' | 'error'`; `pickMoment(candidates: readonly Moment[], ctx: { surface: Surface; shownThisSession: readonly string[]; seen: readonly string[] }): Moment | undefined`; store `useStory` with `{ seen: string[]; title: TitleId | null; shownThisSession: string[] (not persisted); markSeen(id); noteShown(id); raiseTitle(t: TitleId | null): boolean (true when it rose); wipe() }`.

- [ ] **Step 1: Failing tests:** `pickMoment` returns `undefined` for surfaces `ride`, `navigate`, `error` whatever the candidates; returns `undefined` when `shownThisSession` is non-empty; skips ids in `seen`; returns the first remaining candidate otherwise; `raiseTitle` never lowers (`ghat-rider` then `trail-regular` returns false and keeps `ghat-rider`).
- [ ] **Step 2: Run** `npx vitest run src/lib/story/moment.test.ts` → FAIL.
- [ ] **Step 3: Implement** `pickMoment` (pure) and the persisted zustand store (follow `store/marks.ts`, `wipe` added to the erase-all path in `lib/eraseAll.ts`). Build candidates: a `mark` Moment per mark returned by `useMarks.sync`, a `title` Moment when `raiseTitle` returns true. Copy: mark `"<title>. A new mark."`; title `"You are a <name> now."` (one line each, no exclamation marks). Show the picked Moment as a card on the existing ride-end sheet and as Dash's first card for 24 h, replacing the current plain mark stamp announcement. Keep the quiet seeding (`useMarks.seeded`) so existing marks are not announced.
- [ ] **Step 4: Run** moment test plus `npx vitest run src/store` → PASS. **Step 5: Commit** `feat(mobile): moments and the governor`.

### Task 4: Pillion component and poses

**Files:** Create `apps/mobile/src/ui/Pillion.tsx`, `apps/mobile/assets/pillion/poses.ts`, `apps/mobile/src/ui/Pillion.tokens.ts`, `apps/mobile/src/ui/Pillion.test.ts`.

**Interfaces:**
- Consumes: `PillionPose` (Task 3).
- Produces: `POSES: Record<PillionPose, { source: ImageSourcePropType | null; label: string }>`; `Pillion({ pose, size }: { pose: PillionPose; size?: 'sm' | 'md' | 'lg' })`; renders the image, or a quiet lucide `Dog` glyph when `source` is `null` (artwork not delivered yet), always with an accessible label.

- [ ] **Step 1: Failing test:** every `PillionPose` key exists in `POSES` (type and runtime list match); no pose label contains "noob", "beginner" or "new".
- [ ] **Step 2: Run** `npx vitest run src/ui/Pillion.test.ts` → FAIL. **Step 3: Implement**; sizes come from `Pillion.tokens.ts` (follow `Badge.tokens.ts`). Illustrations are added later by dropping webp files and filling `source`; prompts go in the existing `apps/mobile/assets/fixit/PROMPTS.md` style, in a short section appended to `apps/mobile/assets/pillion/README.md` (the one allowed asset note: identity, goggles + bandana only, P0 pose list).
- [ ] **Step 4: Run** test + `cd ../.. && npm run check:tokens` → PASS. Wire `<Pillion>` into the Moment card (Task 3) and EmptyState for empty rides and trails. **Step 5: Commit** `feat(mobile): Pillion, eight poses`.

### Task 5: Year in Rides additions (on-device)

**Files:** Modify `apps/mobile/src/lib/yearRecap.ts`, `yearRecap.test.ts` (extend), `apps/mobile/app/recap.tsx`, `apps/mobile/src/ui/RecapCard.tsx`.

**Interfaces:**
- Produces: `YearRecap` gains `monthsRidden: number; title: TitleId | null` (title from `titleFor` over the year's rides only); `recap.tsx` shows the title line and a `campfire` Pillion above the stats.

- [ ] **Step 1: Failing tests** in `yearRecap.test.ts`: a year with rides in 3 months has `monthsRidden` 3; a year with only the sample ride keeps `rides: 0` and `title: null`; existing assertions unchanged.
- [ ] **Step 2: Run** `npx vitest run src/lib/yearRecap.test.ts` → FAIL. **Step 3: Implement.** The share card gets the title but no place names. **Step 4: Run** → PASS. **Step 5: Commit** `feat(mobile): year in rides shows your title`.

### Task 6: Standing, pure domain

**Files:** Create `packages/domain/src/standing.ts`, `standing.test.ts`; export from `packages/domain/src/index.ts`.

**Interfaces:**
- Produces: `STANDING_METRICS = ['distance_km', 'rides', 'longest_ride_km'] as const`; `type StandingMetric`; `MIN_COHORT = 20`; `parseStandingMetric(raw: unknown): { ok: true; metric: StandingMetric } | { ok: false; reason: 'refused' | 'unknown' }` (speed, top_speed, fast, pace refused); `type CohortRow = { n: number; deciles: number[] }` (9 cut points, ascending); `percentileBelow(value: number, row: CohortRow): number | null` (whole percent of riders at or below `value`; `null` when `row.n < MIN_COHORT`); `cellOf(lat: number, lng: number): string` (1° cell id `"<floor lat>:<floor lng>"`, my call: avoids shipping state boundaries; revisit when districts have 20 riders); `bandOf(percent: number): string` (`"top 10%"`, `"top 25%"`, `"top half"`, else `"riding along"`, never a negative label).

- [ ] **Step 1: Failing tests:** `n: 19` → `null`, `n: 20` → number; value below the first decile → 10 or less, above the last → 100; ties (equal to a decile) count as at-or-below; `parseStandingMetric('top_speed')` is refused, `'karma'` unknown, `'distance_km'` ok; `cellOf(11.4, 76.2)` is `"11:76"`; `bandOf(0)` is `"riding along"`.
- [ ] **Step 2: Run** `cd packages/domain && npx vitest run src/standing.test.ts` → FAIL. **Step 3: Implement. Step 4: Run** → PASS. **Step 5: Commit** `feat(domain): standing percentiles`.

### Task 7: Server, upload, cohort tables and routes

**Files:**
- Create: `apps/web/db/migrations/0048_ride_summary.sql`, `apps/web/src/server/standing/standing.ts`, `apps/web/src/server/api/standing-routes.ts`, `apps/web/src/server/api/standing-routes.test.ts`, `apps/web/src/app/api/cron/cohort/route.ts`
- Modify: `apps/web/src/server/api/routes.ts` (add `...standingRoutes` next to `...trailmarkRoutes`), `apps/web/vercel.json` (one daily cron), account-deletion path (cascade check).

**Interfaces:**
- Consumes: `parseStandingMetric`, `MIN_COHORT`, `CohortRow` (Task 6); route and test patterns from `trailmark-routes.ts`/`trailmark-routes.test.ts`.
- Produces: tables `ride_summary(id uuid pk, user_id uuid fk app_user on delete cascade, ride_ref text, day date, distance_km numeric, duration_s int, cell text, bike_class text, unique(user_id, ride_ref))`, `rider_standing_pref(user_id pk, opt_in boolean default false)`, `cohort_stat(cell text, period text, metric text, n int, deciles numeric[], primary key (cell, period, metric))`, RLS on and `revoke all from anon, authenticated` as in 0047; SQL function `rollup_cohort_stats()` (periods `YYYY-MM`, current and previous month; riders counted only if opted in). Routes (all `access: "write:submission"` except cohort which is `"public"`, `cache: "none"`): `PUT /me/standing-opt-in` body `{ optIn: boolean }` (turning off deletes that rider's `ride_summary` rows); `PUT /me/ride-summaries` body `{ rides: { ref: string; day: string; distanceKm: number; durationSec: number; cell: string; bikeClass?: string }[] }` (max 200; 409 `not_opted_in` when off; rejects any extra key such as `lat`, `route`, `startedAt` with 400); `GET /cohort?cell=&period=&metric=` → `{ n, deciles }` or 404 when the cell has no row; metric through `parseStandingMetric` (422 `refused` / `unknown_metric`).

- [ ] **Step 1: Failing route tests** (mock `../standing/standing`, `sql` proxy that throws): speed metric 422 before any SQL; upload with an extra `lat` key 400; upload when not opted in 409; opt-in with a non-boolean 400; `GET /cohort` with bad `period` (not `YYYY-MM`) 400; `buildOpenApi` still includes the new paths.
- [ ] **Step 2: Run** `cd apps/web && npx vitest run src/server/api/standing-routes.test.ts` → FAIL.
- [ ] **Step 3: Implement** migration, `standing.ts` (`setOptIn`, `upsertSummaries`, `getCohort`), routes, and the cron route (`GET`, requires `Authorization: Bearer ${process.env.CRON_SECRET}`, calls `select rollup_cohort_stats()`; add `CRON_SECRET` to dev-setup env list). Check account deletion removes the rows by the cascade (note it in the commit if so).
- [ ] **Step 4: Run** the route test and `npx vitest run src/server/api` → PASS. Apply the migration to Supabase per `docs/runbooks/dev-setup.md`. **Step 5: Commit** `feat(web): opt-in ride summaries and cohort stats`.

### Task 8: Phone opt-in, upload and Standing moment

**Files:** Create `apps/mobile/src/api/standing.ts`, `apps/mobile/src/lib/story/standing.ts`, `standing.test.ts`, `apps/mobile/src/store/standingPref.ts`. Modify the You → Privacy screen (`grep -rn "Privacy" apps/mobile/app/(tabs)` to find it), `recap.tsx`, ride-finish path (`lib/finishRide.ts`).

**Interfaces:**
- Consumes: `cellOf`, `percentileBelow`, `bandOf`, `StandingMetric` (Task 6); routes from Task 7; `useAuth` token; `Ride` (`waypoints` give the start point).
- Produces: `summaryOf(r: Ride): { ref: string; day: string; distanceKm: number; durationSec: number; cell: string } | undefined` (`undefined` for sample rides or rides with no waypoint); `standingMoment(i: { metric: StandingMetric; value: number; row: CohortRow | undefined; region: string }): Moment | undefined` (copy `"You rode further than <n>% of riders near <region> this month."`; undefined when `percentileBelow` is null or below 50; `pose: 'standing-up'`); `useStandingPref` store `{ optIn: boolean; queue: string[]; set(optIn: boolean): void }`; `api/standing.ts`: `setStandingOptIn(token, optIn)`, `uploadSummaries(token, rides)`, `getCohort(token?, cell, period, metric)`.

- [ ] **Step 1: Failing tests:** `summaryOf` drops the sample ride and a ride without waypoints, and the object has exactly the keys `ref, day, distanceKm, durationSec, cell` (no coordinates, no time); `standingMoment` with `row.n = 19` is `undefined`; with a 70th-percentile value returns the copy with `70%`; below 50 returns `undefined` (nobody is shown a poor standing); after `set(false)` the queue is empty and nothing is uploaded.
- [ ] **Step 2: Run** `npx vitest run src/lib/story/standing.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Privacy switch copy: title "Compare with riders near you", body "Share each ride's date, distance and a rough area (about 100 km wide). Never your route. Turn off any time and it is deleted." Default off; first-ever prompt appears once on the Year in Rides screen, never as a modal. Upload runs after a finished ride and on app open, retries from the queue, stops and clears the queue on opt-out. `recap.tsx` shows the standing line (only when a Moment exists).
- [ ] **Step 4: Run** the test and `npm run typecheck` (repo root) → PASS. **Step 5: Commit** `feat(mobile): opt-in standing`.

### Task 9: The `standing` nudge kind

**Files:** Modify `apps/mobile/src/lib/nudge/{types,candidates,copy}.ts`, `apps/mobile/src/nudgeWorld.ts`, `apps/mobile/src/lib/nudge/testWorld.ts`, `nudge.test.ts`, `simulation.test.ts`; `app/notifications/nudges.tsx` (switch row comes from `NUDGE_META`).

**Interfaces:**
- Consumes: `NudgeWorld` gains `standing?: { aheadOf: number; nextGap?: number; region: string }` (filled from the cached cohort row, opted-in riders only); `NUDGE_META.standing = { label: 'Standing', hint: 'How you compare near home, if you chose that', cls: 'ride' }`.
- Produces: candidate `standing` (Monday 09:30, score 0.5, route `/ride`, key `standing:<YYYY-Www>`), emitted only when `standing.aheadOf >= 50` and never when `nextGap` is the only thing known; copy `"You are ahead of <n>% of riders near <region>"` / body `"<nextGap> km more this month moves you up a band. A short loop does it."` (omit the body's second half when `nextGap` is undefined).

- [ ] **Step 1: Failing tests:** `standing` candidate absent when `world.standing` is undefined or `aheadOf` is 49; present at 50 with the weekly key; the six-month simulation still holds (one a day, gaps, window) with the new kind switched on; the new kind is off when the rider's level is `off`.
- [ ] **Step 2: Run** `npx vitest run src/lib/nudge` → FAIL. **Step 3: Implement** (kind class `ride`, so the 7-day gap and ignore-doubling apply). **Step 4: Run** → PASS. **Step 5: Commit** `feat(mobile): standing nudge`.

### Task 10: Local challenges by ride, and docs

**Files:** Modify `packages/domain/src/challenges.ts` (header comment and kinds), `challenges.test.ts`; `apps/web/src/server/trailmarks/trailmarks.ts` (events for the new kinds from `ride_summary`); docs listed below.

**Interfaces:**
- Produces: `ChallengeKind` adds `"rides"` and `"longest_ride"`; two new `CHALLENGES` rows: `{ id: "rides-in-region", title: "Ride 4 times this month", kind: "rides", target: 4, scope: "district", monthly: true }` and `{ id: "longest-ride-region", title: "Beat your longest ride this month", kind: "longest_ride", target: 1, scope: "district", monthly: true }` (own best only, no ranking by distance; the header comment changes from "none is about speed, distance or a streak" to "none is about speed or a streak; a distance challenge is only ever against your own best"); events come from the rider's own `ride_summary` rows when opted in, otherwise the challenge reads "Turn on ride comparison to count rides".

- [ ] **Step 1: Failing tests:** four events of kind `rides` inside the month complete `rides-in-region`; a `longest_ride` event only counts when its distance exceeds the rider's previous best passed in `events`; riders not joined show `not_joined`; no challenge `id` contains `speed` or `streak`.
- [ ] **Step 2: Run** `cd packages/domain && npx vitest run src/challenges.test.ts` → FAIL. **Step 3: Implement. Step 4: Run** → PASS.
- [ ] **Step 5: Docs (same commit, about 5 lines each):** `docs/ride-nudges.md` (the `standing` row); `docs/11-security-and-moderation.md` (Marks are the one visible system, Trailmarks are the internal ledger; ride summaries, opt-in, deletion); `docs/16-myto-app-ui.md` (replace the "leaderboards" non-goal with "no public speed or distance rankings"; where Moments appear); `docs/15-myto-app-architecture.md` line 49 (same wording change); privacy page and `docs/superpowers/specs/2026-11-12-legal-pages-design.md` text for the new upload; `docs/todo.md` (Pillion artwork pending; cell to district when ≥20 riders).
- [ ] **Step 6: Commit** `feat: local ride challenges and docs`.
- [ ] **Step 7: Run once** `npm test`, `npm run lint`, `npm run typecheck`, `npm run check:tokens` from the repo root.
