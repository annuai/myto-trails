# Rider story: Marks, standing, titles, Year in Rides and Pillion

Status: **draft for approval** (2026-11-12). Nothing here is built yet. Decided by the owner: comparison with other riders is allowed **only as an opt-in upload of ride summaries**.

## Intent

Riders should feel their riding adds up and want to come back, without the app turning into a game. One engine turns what the rider has done into a few well-timed **Moments**, shown where the rider already is. Pillion, the dog, is how a Moment is delivered. Not a new tab, not a feed.

**Goals:** rewarding, natural, returnable; free to run; honest (nothing shown that is not computed).
**Non-goals:** public leaderboards, rankings by speed, streaks that punish a missed week, XP or levels, a store checkout, a second achievements system.
**Anti-goals (a failure even if it works):** a rider is ever called a beginner or "noob"; the app interrupts a ride; a number shown is a guess.

## What already exists (reuse, do not rebuild)

| Piece | Where | Decision |
|---|---|---|
| 9 local Marks | `apps/mobile/src/lib/marks.ts`, `app/marks.tsx` | Becomes the one registry; keeps the name **Marks** |
| 8 badges, evaluate/byCategory | `packages/domain/src/achievements.ts`, `lib/badges.ts` | Merged into Marks as categories; the file stays the pure evaluator |
| Trailmarks ledger | `apps/web/src/server/trailmarks/`, migration 0047 | Internal contributor ledger only; not a second thing riders see |
| Challenges, contribution leaderboard | `packages/domain/src/{challenges,leaderboard}.ts` | Challenges reused for local competitions; the public leaderboard stays contribution-only |
| Nudges + governor | `apps/mobile/src/lib/nudge/`, [ride-nudges](../../ride-nudges.md) | One new kind, `standing`; same governor |
| Year recap + share card | `app/recap.tsx`, `lib/yearRecap.ts`, `ui/RecapCard.tsx` | Extended with titles and comparison |
| Shop | `app/shop/*`, `lib/shop.ts` | Unchanged: a link-out, no cart (see below) |

## Architecture

```
ride finished / app opened / weekly refresh
        │
 ProgressSnapshot  (phone metrics + server metrics + cohort stats)   ← one input
        │
 Registry (data):  Marks · Standing · Challenges · Titles            ← pure evaluators, tested
        │
     Moment { kind, subject, copy, pose }                            ← one object
        │
 Governor (existing nudge rules + "at most one Moment per session")
        │
 Surfaces:  ride-end sheet · Dash card (one) · nudge notification · Year in Rides
```

1. **Marks** (what you did): first-time and milestone stamps, places ridden, weekends ridden, contributions. Never speed, never a streak.
2. **Standing** (how you compare, opt-in): "You rode further than 68% of riders in Kerala this month." Computed from a cohort table, shown only to riders who opted in. Metrics allowed: distance, rides, new trails, new districts, longest single ride. **Speed and top speed are refused**, as in the leaderboard.
3. **Challenges** (local competitions): time-boxed and scoped to a region (state or district cell), e.g. "Longest ride in Coorg this month" or "Most new trails in the monsoon". Opt-in, rider sees their own rank band and the top few by chosen display name; "ahead of 12 riders, 3 to go" is the nudge text. Uses `challenge_enrolment`.
4. **Titles** (who you are, from places and consistency, never speed): *Day-tripper → Trail regular → Ghat rider → Long hauler → Road veteran* (draft names, owner to confirm). A title is earned by distinct trails, districts and months ridden; it only ever goes up. Nobody is ever given a lower or "new" label: a rider with no rides yet has no title, and the first is the first rung.
5. **Moments** are the only thing the rider sees. A Moment is chosen by the governor, not scored against others; max one a session, never during a ride or navigation, never on an error screen.

### Data and privacy (free tier)

- **Opt-in upload** of a *ride summary*: date, distance, duration, coarse region cell (district or ~11 km grid, same rounding as nudge weather), bike class. **Never** a route, start point or time of day beyond date. Table `ride_summary` (one row per ride, keyed to the rider); a weekly Supabase job rolls it into `cohort_stat` (region × period × metric histogram). The app downloads only the cohort row for its region and computes the percentile locally, so the server never sends other riders' data.
- Off by default; switch in You → Privacy; turning it off deletes the rider's summaries. Covered by the account-deletion flow and the privacy page (update both).
- Small cohorts (<20 riders) show no percentile, only "you are among the first in <region>".
- The sync design ([sync-design](../../sync-design.md)) is not built; this is a deliberately smaller upload and does not depend on it.

### Pillion (delight, not a mascot campaign)

Pillion is a **presentational component** `<Pillion pose />` plus a copy line, delivered only as the face of a Moment, an empty state or the Year in Rides. Reviewed against the brief:

- **Identity:** Indian Indie dog, upright ears, one tilted; **goggles on head and brick-red bandana only**. Everything else (helmet, jacket, backpack) is a situational prop, never permanent.
- **Never:** on ride, navigation or tracking screens; on errors; as a guide that explains features; with guilt or countdowns.
- **P0 poses (8, static, same halftone style as Fix-it):** hello (onboarding), waiting beside the bike (empty rides), map (empty trails), mark earned (paw up), standing up (a standing Moment), tired and happy (ride finished), campfire at sunset (Year in Rides), asleep (offline or empty after a long gap). Facial variation by swapping eyes/mouth layers on one base, not new drawings.
- **P1:** chai stall, helmet-on for the pre-ride check, rain. **P2:** seasonal. **Do not build:** 50 scenes, a pose per use case, Pillion in error or GPS states.
- **Animation:** none in v1 beyond a blink and a tail wag if cheap. Prefer Rive over Lottie later (one file, state machine, small), only after the static set proves useful.
- **Assets** live under `apps/mobile/assets/pillion/` with one `poses.ts` registry; illustrations come from the owner's generated references, not code. Prompts follow `apps/mobile/assets/fixit/PROMPTS.md`.

### Year in Rides additions

Extend `yearRecap` with: title reached, trails/districts new this year, your longest ride, and (opted in) "you rode further than X% of riders in <region>". Pillion on the campfire pose. Share card keeps no rider-identifying location.

### Shop (decided, not new work)

Keep the link-out catalogue. No cart, checkout or orders in the app (Apple 3.1.3(e) is satisfied by an external physical-goods shop; one-identity sign-in is doc 15 §4.5, unbuilt). Shop appears only as trip suggestions and one Dash row, which is already the case. Work left: verify it on a device and point `SHOP_BASE` at the real shop host when it exists.

## Build order (each step shippable alone)

1. **Merge Marks and badges** into one registry; one Marks screen; titles ladder (all on-device). Remove duplicate naming in the UI.
2. **Moment object + governor hook**; ride-end sheet and Dash card consume it. Pillion P0 poses wired as static images.
3. **Year in Rides** additions (on-device parts first).
4. **Opt-in upload + cohort stats + Standing**; privacy switch, deletion path, `standing` nudge kind and copy.
5. **Local Challenges** surface (region-scoped, opt-in) reusing the existing domain code.

## Constraints and tests

Free tier only; no raw values (tokens, run `check:tokens`); pure evaluators with unit tests, plus a simulation test like the nudge one for Moments (never more than one a session, never on ride screens, never repeats a Moment). Upload and cohort code get API route tests; `*.db.test.ts` are not run routinely.

## Left to the builder / owner

Owner to confirm: title names; whether the cohort region is district or state at launch (builder's call: a 1° grid cell, about 100 km, which stands in for a state without shipping boundary data; move to districts once one has 20 riders); copy for Standing. Builder's calls (mine, marked): weekly rollup not realtime; no ranking list outside Challenges; Pillion static first.

## Docs to touch when built (about 5 lines each, same commit as code)

`docs/ride-nudges.md` (the `standing` kind), `docs/11-security-and-moderation.md` (merge note on Marks/Trailmarks), `docs/16-myto-app-ui.md` (Moment surfaces, replaces the "no leaderboards" non-goal with "no public speed or distance rankings"), privacy and deletion pages, `docs/todo.md`.
