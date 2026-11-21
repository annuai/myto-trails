# Change the destination during a ride: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A search button on the ride screen sets or changes the destination mid-ride (personal, or the group's for a leader), with the lead hand-over keeping the destination and the control.

**Architecture:** Reuse `DestinationSheet`, `useGuideTarget` and `useGroupSession().pin`. Pure rules (priority, role from sync, destination change, lead notice) live in `src/lib` with unit tests; the screen and `CompanionHost` only wire them. No server change.

**Tech Stack:** Expo / React Native, zustand, vitest.

**Spec:** [2026-11-20-ride-destination-search-design.md](../specs/2026-11-20-ride-destination-search-design.md)

## Global Constraints

- Tokens only: no raw spacing, colour or type values; run `npm run check:tokens` after UI work.
- No new server endpoint, table or migration.
- Typing is disabled while moving; "Choose on the map" and Home stay available at any speed.
- Only the leader's "Remove the destination" or ending the group clears the group destination.
- Docs: about 5 lines in the one owning doc, no new doc file.

## Review Focus

- Joining a group that already has a destination must not fire "leader changed the destination" (first look has no earlier riders).
- Hand-over with the same destination: no notice, no personal destination dropped.
- A rider who is passed the lead gains the control; a leader whose lead was taken loses it.
- A destination chosen while a trail is loaded must not buzz "off the trail" on the way there.
- Leader removes the destination: followers are told, and nothing else clears it.

---

### Task 1: Pure rules

**Files:**
- Modify: `apps/mobile/src/lib/leadCore.ts`, `apps/mobile/src/lib/leadCore.test.ts`
- Create: `apps/mobile/src/lib/guideRoad.ts`, `apps/mobile/src/lib/guideRoad.test.ts`

**Interfaces:**
- Produces in `leadCore.ts`: `roleFromRiders(riders: GroupRiderView[], meId: string | undefined): 'leader' | 'member' | undefined`; `destinationChange(before: GroupRegroup | null, after: GroupRegroup | null, hadLook: boolean): 'set' | 'cleared' | null` (compares lat and lng only; `hadLook` false gives null); `leadNotice` gains an optional fifth parameter `regroup?: GroupRegroup | null` (undefined keeps today's text).
- Produces in `guideRoad.ts`: `roadToward(i: { rescue?: LatLng; target?: LatLng; sim: boolean; trail: boolean; toStart: boolean; start?: LatLng; rejoin?: LatLng; regroup?: LatLng }): LatLng | undefined` with priority rescue, then sim (undefined), then target, then trail (`toStart ? start : rejoin`), then regroup.

- [ ] **Step 1: Write failing tests.** `guideRoad.test.ts`: rescue beats target; with a trail loaded a target wins over start and rejoin; with a trail and no target `toStart` gives `start` else `rejoin`; with no trail, target then regroup; sim gives undefined. `leadCore.test.ts`: `roleFromRiders` gives `'leader'`/`'member'` from the entry whose id equals `me` and `undefined` for unknown or no `me`; `destinationChange` gives `'set'` for a moved point, `'cleared'` for point to null, null for the same coordinates with a different note, null when `hadLook` is false; `leadNotice(before, after, 'b', now, { lat: 1, lng: 2, note: 'Hampi' })` body is `You now lead the group. The destination is Hampi, and you can change it.`, with `null` it is `You now lead the group. No destination is set, and you can set one.`
- [ ] **Step 2:** Run `npx vitest run src/lib/guideRoad.test.ts src/lib/leadCore.test.ts` from `apps/mobile`; expect FAIL (not defined).
- [ ] **Step 3: Implement** the three functions above. The note falls back to "a spot on the map" in the notice text.
- [ ] **Step 4:** Re-run; expect PASS.
- [ ] **Step 5: Commit** `feat(mobile): pure rules for destination priority, role from sync and destination change`.

### Task 2: Role from sync, follower notice, lead notice

**Files:**
- Modify: `apps/mobile/src/CompanionHost.tsx` (sync handler, around line 165), `apps/mobile/src/store/guideTarget.ts`, `apps/mobile/src/store/guideTarget.test.ts`
- Create: `apps/mobile/src/store/destinationNotice.ts`, `apps/mobile/src/features/ride/sayAloud.ts`

**Interfaces:**
- Consumes: Task 1 functions.
- Produces: `useGuideTarget.dropPersonal(): void` (clears `to` and `paused`, leaves `rescue`); `useDestinationNotice` zustand store `{ text?: string; show(text: string): void; clear(): void }`; `sayAloud(text: string): void` (speaks through `expo-speech` only when `useRoutePrefs` voice is on, never throws).

- [ ] **Step 1: Write failing test** in `guideTarget.test.ts`: `dropPersonal` clears `to` and `paused` and keeps `rescue`; `set` over an existing `to` replaces it and clears `paused`.
- [ ] **Step 2:** Run it; expect FAIL for `dropPersonal`.
- [ ] **Step 3: Implement** `dropPersonal`, the notice store and `sayAloud`.
- [ ] **Step 4: Wire the sync handler.** After `setLive`: set `group.role` from `roleFromRiders(r.riders, r.me)` when it differs (`setGroupRole`). Compute `destinationChange(live.regroup before, r.regroup, before.length > 0)`; when not null and this phone is not the leader: `dropPersonal()`, `useDestinationNotice.show('Leader changed the destination to X')` (or "Leader removed the destination"), `buzz.reroute()`, `sayAloud(text)`, and `tellAboutLead({ title: 'Destination changed', body: text })` so a locked phone is told. Pass `r.regroup` as the fifth argument of `leadNotice`.
- [ ] **Step 5:** Run `npx vitest run src/store src/lib` and `npm run typecheck`; expect PASS.
- [ ] **Step 6: Commit** `feat(mobile): group role follows the server, followers are told when the destination changes`.

### Task 3: The search button and sheet

**Files:**
- Modify: `apps/mobile/src/features/group/DestinationSheet.tsx`, `apps/mobile/src/features/route/PlaceSearch.tsx`, `apps/mobile/src/features/GroupSheet.tsx`, `apps/mobile/app/ride/live.tsx`
- Create: `apps/mobile/src/features/ride/RideDestinationSheet.tsx`

**Interfaces:**
- `DestinationSheet` gains optional props `title?: string` (default "Destination"), `hint?: string`, `canType?: boolean` (default true), `onClear?: () => void` (shows "Remove the destination" when `current` is set). It also shows a Home row when `usePlaces` has a home, calling `onSet(home, 'Home')`.
- `PlaceSearch` gains `disabled?: boolean`: field not editable and a muted line "Stop to search".
- `RideDestinationSheet({ open, onClose, near }: { open: boolean; onClose: () => void; near?: LatLng })`: leader gets title "Group destination", `current = live.regroup`, `onSet = pin`, `onClear = pin(null)`; everyone else gets "Your destination" with hint "Only for you" on a group ride, `current = guideTarget.to`, `onSet = useGuideTarget.set`. `canType` comes from `canTypeNow` via the same inputs `useJournalActions` uses.

- [ ] **Step 1:** Extend `DestinationSheet` and `PlaceSearch`; move the leader's "Remove the destination" out of `GroupSheet` into `onClear`.
- [ ] **Step 2:** Add `RideDestinationSheet`; mount it in `live.tsx` overlay with `destOpen` state.
- [ ] **Step 3:** Add a search `IconButton` (`Search` icon, label "Set or change destination") under `quietBtn` in the map's top-right corner, in portrait and landscape.
- [ ] **Step 4:** Run `npm run typecheck && npm run lint && npm run check:tokens`; expect clean.
- [ ] **Step 5: Commit** `feat(mobile): search button on the ride screen sets the personal or group destination`.

### Task 4: Priority on the ride screen, follower prompt, arrival cue

**Files:**
- Modify: `apps/mobile/app/ride/live.tsx` (lines 125-140, 200-225, 241)

**Interfaces:**
- Consumes: `roadToward`, `useDestinationNotice`, `sayAloud`.

- [ ] **Step 1:** Replace the `roadTo` expression with `roadToward({...})`; `rejoining` becomes false while `target` is set; the eyebrow uses the target's name while it overrides a trail.
- [ ] **Step 2:** In the trail-monitor effect, skip the off-trail buzz and `setRejoinTo` while `target` is set (Review Focus 4).
- [ ] **Step 3:** Show the notice as a `TurnCard` `prompt` (`action: 'Got it'`, `onAction: clear`) in portrait and landscape, using `helpPrompt ?? noticePrompt`.
- [ ] **Step 4:** Arrival cue: where `before` and `g.state.phase` are compared, on `to_start` to `on_trail` call `buzz.confirm()` and `sayAloud('At the start. Following the trail.')`.
- [ ] **Step 5:** `npm run typecheck && npm run lint && npm test`; expect PASS.
- [ ] **Step 6: Commit** `feat(mobile): destination overrides a trail, followers see the change, cue at the trail start`.

### Task 5: Server test and docs

**Files:**
- Modify: `apps/web/src/server/rides/group-rides.db.test.ts`, the doc that owns group rides (find with `grep -n regroup docs/*.md`)

- [ ] **Step 1:** Add a db test: after `setRegroup` by the leader and `passLead` to a rider, `syncGroupRide` still returns the same `regroup`, the old leader gets `not_leader` from `setRegroup`, and the new leader's `setRegroup` succeeds. (Needs local PostGIS; written, not run routinely.)
- [ ] **Step 2:** About 5 lines in the owning doc: leader's change is the group's, hand-over keeps it, followers' search is personal.
- [ ] **Step 3:** Run `npm run typecheck`, `npm run check:tokens`, `npm run check:colors`; expect clean.
- [ ] **Step 4: Commit** `docs+test: group destination survives a hand-over`.
