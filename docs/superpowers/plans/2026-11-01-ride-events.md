# Ride events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ride events (RSVP, location check-in, roster, decline, roles, stretch alert) that turn into group rides, plus crash-detection presets.

**Architecture:** New `ride_event` and `ride_event_rsvp` tables beside `group_ride`; server logic in one `events.ts` with pure helpers; thin routes; phone gets an api module, pure libs, an event screen, and sections on the club page and Clubs tab. Events start a group ride through the existing `createGroupRide`/`joinGroupRide`.

**Tech Stack:** Postgres via `postgres` (`Sql`), Next.js route table (`RouteDef`), Expo/React Native, zustand, Vitest, `@moto-trails/domain` wire types.

**Spec:** [docs/superpowers/specs/2026-11-01-ride-events-design.md](../specs/2026-11-01-ride-events-design.md)

## Global Constraints

- Migrations: `apps/web/db/migrations/0029_ride_events.sql`; RLS enabled, `revoke all ... from anon, authenticated`; client-visible ids are `public_id`.
- Rider ids on the wire are `app_user.public_id`, never account ids.
- Mobile: no literal numbers or colours in styles; `npm run check:tokens` and `npm run check:colors` pass; sizes local to one component go in `<Component>.tokens.ts`.
- Any new export in a native file with a `.web.ts` twin is mirrored (`platformParity.test.ts`).
- Free tier only: no new paid service, no push, no cron additions.
- Sentence case copy; Lucide icons through `Icon`; nothing typed while moving.
- New POST-creates go in `openapi.ts` CREATES, 204s in NO_CONTENT.
- Work on branch `feat/ride-events`; commit only files this plan touches (the working tree has unrelated edits). Never push.

## Review Focus

- Event starting in the past or more than 366 days away is refused.
- Two riders race for the last seat: capacity is never exceeded.
- Check-in with poor GPS (accuracy over the radius) is refused with a clear reason, not silently accepted.
- Non-member reads a members-only event by id: 404, not 403 (existence not leaked).
- Host deletes account or leaves club: events must not become orphans readable by the wrong audience.
- Declined rider with note: note never appears to anyone but the host.
- Waitlisted rider tries to check in: refused.

---

### Task 1: Migration and schema

**Files:** Create `apps/web/db/migrations/0029_ride_events.sql`; modify `apps/web/src/server/db/schema.db.test.ts` and `rls.db.test.ts` if they list tables.

**Interfaces:** Produces tables `ride_event`, `ride_event_rsvp`; columns `group_ride.event_id uuid null references ride_event`, `group_ride.stretch_km int not null default 3 check (1..10)`, `group_ride_member.event_role text null check in (captain,marshal,medic,sweep)`.

- [ ] Write the migration per spec section 4, with checks: audience `members` requires `club_id`; `radius_m` 100-500; `capacity` null or 2-200; response and reason enums; `on delete cascade` from `app_user`.
- [ ] Add the new tables to the schema and RLS tests.
- [ ] Run `npm run db:start` then `npm run db:migrate -w apps/web` and `npm run test:db -w apps/web -- schema rls`. Expected: PASS.
- [ ] Commit `feat(db): ride events tables`.

### Task 2: Event rules (pure)

**Files:** Create `apps/web/src/server/community/eventRules.ts`, test `eventRules.test.ts`.

**Interfaces:** Produces
`distanceM(a:{lat:number;lng:number}, b:{lat:number;lng:number}): number`
`checkInWindow(startsAt: Date, now: Date): 'early'|'open'|'closed'`
`checkInVerdict(ev:{lat,lng,radiusM,startsAt}, at:{lat,lng,accuracyM}, now: Date): {ok:true}|{ok:false;reason:'early'|'closed'|'far'|'inaccurate'}`
`seatDecision(goingCount:number, capacity:number|null): 'going'|'waitlisted'`
`validStart(startsAt: Date, now: Date): boolean` (future, under 366 days).

- [ ] Tests: distance of two known points within 1 m; window edges at -60 min and +6 h; `inaccurate` when accuracyM > radiusM; `far` beyond radius; seat decision at capacity-1, capacity, null; `validStart` past, now, 366 days, 365 days.
- [ ] Run, expect FAIL; implement; run, expect PASS; commit.

### Task 3: Event service

**Files:** Create `apps/web/src/server/community/events.ts`, test `events.db.test.ts`.

**Interfaces:** Consumes `isMember`, `findClub`/`roleIn` patterns from `clubs.ts`, `createGroupRide`, `joinGroupRide`. Produces, each returning `{ok:true,...}|{ok:false,reason}`:
`createEvent(sql,{userId,input:EventInput,now})`, `listEvents(sql,{userId,scope:'discover'|'club'|'mine',clubId?,cursor?,limit,now})`, `getEvent(sql,{userId,eventId,now})`, `respond(sql,{userId,eventId,response:'going'|'maybe'|'declined',reason?,note?,now})`, `checkIn(sql,{userId,eventId,lat,lng,accuracyM,now})`, `markArrived(sql,{hostId,eventId,riderId,now})`, `setRole(sql,{hostId,eventId,riderId,role|null})`, `startEvent(sql,{hostId,eventId,now,stretchKm?})`, `joinEventRide(sql,{userId,eventId,displayName,now})`, `cancelEvent(sql,{hostId,eventId,now})`, `endEvent` is done by ending the group ride.
Wire types `RideEvent`, `RideEventDetail`, `RosterRow`, `EventInput` go in `packages/domain/src/api.ts`.

- [ ] DB tests: seat race (two concurrent `respond` at capacity 1 leaves one going, one waitlisted); decline promotes oldest waitlisted; members-only event invisible to non-member (`getEvent` returns `not_found`); non-host sees counts only and no notes; `checkIn` refuses waitlisted, early, far; `startEvent` creates a `group_ride` with `event_id` and sets status `live`; `setRole` mirrors into `group_ride_member.event_role` when live.
- [ ] Run, expect FAIL.
- [ ] Implement; use `select ... for update` on the event row inside `respond` to serialize seats; rate limit via `rate_limit_hit('event:'||userId, 5, 86400)`.
- [ ] Run `npm run test:db -w apps/web -- events`, expect PASS; commit.

### Task 4: Group ride carries roles and stretch distance

**Files:** Modify `apps/web/src/server/rides/group-rides.ts` and `ride-routes.ts`; extend its tests.

**Interfaces:** `Rider` gains `eventRole: 'captain'|'marshal'|'medic'|'sweep'|null`; `SyncResult` gains `stretchKm: number`.

- [ ] Test: sync returns `eventRole` and `stretchKm`; ride without an event returns `null` and 3.
- [ ] Implement; run web unit and db tests for group rides; commit.

### Task 5: Routes and OpenAPI

**Files:** Create `apps/web/src/server/api/event-routes.ts`; modify `routes.ts`, `openapi.ts`; test `event-routes.test.ts`.

**Interfaces:** `eventRoutes: RouteDef[]`: `GET /events`, `POST /events`, `GET /events/{id}`, `PUT /events/{id}/response`, `POST /events/{id}/check-in`, `POST /events/{id}/arrived/{riderId}`, `PUT /events/{id}/roles/{riderId}`, `POST /events/{id}/start`, `POST /events/{id}/join-ride`, `POST /events/{id}/cancel`. Writes use `write:submission`; reads `token`. Reason maps use `failWith`.

- [ ] Route tests with mocked `verifyToken`: each route's success status, 401 without token, 404 for members-only non-member, 422 bad body.
- [ ] Implement, register, update CREATES/NO_CONTENT; run `npm test -w apps/web`; commit.

### Task 6: Public web page

**Files:** Create `apps/web/src/app/event/[id]/page.tsx`.

- [ ] Server-render open events only (title, local time, place, going count, "Open in the app" link using `APP_DOWNLOAD_URL`); `notFound()` otherwise. Check with a web build or the dev server in the browser pane.
- [ ] Commit.

### Task 7: Phone libs (pure)

**Files:** Create `apps/mobile/src/lib/eventCore.ts` and test; modify `lib/groupCore.ts` test file.

**Interfaces:** Produces
`canCheckIn(ev:{lat,lng,radiusM,startsAt}, here:{lat,lng,accuracyM}|null, now:number): 'yes'|'early'|'closed'|'far'|'no_fix'`
`stretchAlert(riders: GroupRiderView[], meId:string, stretchKm:number, now:number): {names:string[]}|null` (ignores stale riders, only for the leader)
`roleLabel(role): string`, `ROLES` ordered list.
`primaryAction(ev: RideEventDetail, nearEnough:boolean): 'going'|'check_in'|'join_ride'|'request_club'|'none'`.

- [ ] Tests for each branch including stale riders ignored and no alert when only me.
- [ ] Implement; run `npm test -w @moto-trails/mobile`; commit.

### Task 8: Phone API and hooks

**Files:** Create `apps/mobile/src/api/events.ts`; modify `api/useApi.ts`, `api/types.ts`; test `api/events.test.ts`.

**Interfaces:** `listEvents`, `getEvent`, `createEvent`, `respondToEvent(token,eventId,{response,reason?,note?})`, `checkInEvent`, `markArrived`, `setEventRole`, `startEvent`, `joinEventRide`, `cancelEvent`; hooks `useEvents(scope,clubId?)`, `useEvent(id)`.

- [ ] Test request paths and bodies with the mocked client pattern in `rideApi.test.ts`; implement; commit.

### Task 9: Event screen and sheets (use the `impeccable` design skill)

**Files:** Create `apps/mobile/app/event/[id].tsx`, `src/features/event/{EventCard,RsvpBar,DeclineSheet,RosterSheet,CreateEventSheet,RoleSheet}.tsx` plus `.tokens.ts` where needed.

- [ ] Design first with `impeccable` against docs/16 and docs/design-tokens.md: one primary action at a time (Going, Check in, Join ride); decline opens a sheet with four reason chips; host sees roster with role chips; waitlist and full states; cancelled banner.
- [ ] Implement; `check:tokens`, `check:colors`, typecheck pass.
- [ ] Verify in the browser pane or simulator with a screenshot of each state; commit.

### Task 10: Club Events section, Discover, create flow

**Files:** Modify `app/club/[id].tsx`, `app/(tabs)/clubs.tsx`, `src/features/community/PostSheet.tsx`.

- [ ] Club page: Events section between Posts and Members (members see all, non-members see open ones with "Members only" row for the rest of a club they cannot join); admins get an add button opening `CreateEventSheet` with audience choice.
- [ ] Clubs tab: "Events" section first, listing open events near the soonest dates; the PostSheet ride option now opens `CreateEventSheet`.
- [ ] Typecheck, token checks, screenshots; commit.

### Task 11: Check-in prompt, join ride, roles and stretch alert on the live ride

**Files:** Modify `src/CompanionHost.tsx`, `app/ride/live.tsx`, `features/group/RiderTiles.tsx`, `store/companion.ts`.

- [ ] Prompt "You're here, check in?" when `canCheckIn` is `yes` for a joined event (uses the location the phone already has); one tap calls `checkInEvent`, and if the event is live then `joinEventRide` and `setGroup`.
- [ ] Role chip on rider tiles and map marks (letter plus word); no role means unchanged display.
- [ ] Stretch alert via existing `announce()` for the leader only, at most once per five minutes.
- [ ] Run the mobile tests, typecheck, token checks; commit. Note `live.tsx` already has uncommitted edits: stage only hunks from this task (`git add -p`).

### Task 12: Crash presets

**Files:** Modify `lib/crashDetect.ts`, `store/crash.ts`, `app/safety.tsx`; extend `crashDetect.test.ts`, `store/crash.test.ts`.

**Interfaces:** `export type CrashPreset = 'road'|'mixed'|'offroad'`; `export function tuning(p: CrashPreset): {impactG:number; movingKmh:number}`; `stepCrash(s, e, t = tuning('mixed'))` keeps today's values for `mixed`; `useCrash` persists `{enabled, preset}` (default `mixed`).

- [ ] Tests: unchanged results at `mixed` for the current fixtures; `road` fires on an impact `mixed` ignores; `offroad` ignores it; preset persisted and defaults when absent from stored state.
- [ ] Implement; add three `ChoiceChip`s with a one-line description each to `safety.tsx`; commit.

### Task 13: Docs and full verification

- [ ] Update `docs/ride-contract.md` link table (event to group ride), `docs/16-myto-app-ui.md` feature list; note the competitive analysis follow-through.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:db -w apps/web`, `npm run check:tokens`, `npm run check:colors`, `npm run check:versions`. Expected: all pass or failures listed honestly.
- [ ] Commit.
