# Myto Rider OS — Phase Definition

Date: 2026-10-30 · Source: [rider-ops audit](2026-10-30-rider-ops-audit.md) (gap IDs G01–G32 refer to its register)

**Position.** Myto is a Rider OS. The trail directory is one module of it: the *Discover* module and the public face that feeds the rest. The Ride is the central object. Every other module either leads into a ride, happens during one, or comes out of one.

**This is a large, reversible version change** ([ADR 0008](../adr/0008-rider-os-change-and-reversibility.md)).
- The product as it stands is frozen as the **0.8 line**: git tag `snapshot/pre-rider-os` and branch `legacy/0.8-companion` (local, not pushed). The Rider OS ships as the **0.9 line**, beta builds first.
- The new navigation and Home sit behind one `riderOs` flag. Off = today's app.
- Data changes are additive and dual-written (`rideId` next to `rideKey`); the old structure is removed only in a later "contract" release after the exit rule in the ADR is met.
- Testing is judged against criteria written down before building, with today's step counts recorded as the baseline (Phase 0).

**Constraints carried through every phase**
- Free tier only (Vercel Hobby, Supabase free, R2). Any phase that adds cost needs an explicit owner decision first (see [[project-free-tier-constraint]]).
- Local-first: recording and personal data keep working with no network. Sync is additive.
- Privacy by default: ride data, journals, media and location are private unless the rider publishes a trimmed copy.
- Connect before build: prefer joining existing modules over adding new ones.
- Rider safety over convenience: nothing that needs reading or typing while moving.

## Module map (what the OS is made of)

| Module | Question it answers | Exists today | Main change |
|---|---|---|---|
| **Discover** (trail directory) | Where can I ride? | Strong (web + mobile) | Add waypoints, rider reports, "open in app", edit-a-trail |
| **Plan** | What's my trip? | Weak (trips, route builder, split) | One plan object: stops, ETA, invite |
| **Prepare** | Am I ready? | Local to-dos | Ride-linked checklist + readiness |
| **Ride** (record) | Record and stay safe | Strong recorder | Wake lock, SOS, crash recovery, Add moment |
| **Moments** (journal/media) | What happened? | Local, no location | Located moments, ride timeline |
| **Group** | Who's riding? | Separate code-join session | Linked to plan and ride; publishable |
| **Safety** | Help if it goes wrong | Local SOS, check-in, beta crash | Reliable check-in, validated detection |
| **Garage** | My bike | Two unlinked bikes | One bike, linked to rides and service |
| **Contribute** | Give back | Form, no photos/queue/outcome | Ride → trail pipeline with outcome |
| **Community** | Who do I ride with? | Clubs (server) | Clubs ↔ group rides ↔ shared plans |
| **Platform** | Everything works together | Local stores, no sync | rideId, sync, offline cache, docs, tests |

## Phase overview

| Phase | Name | Outcome in one line | Ships to riders? |
|---|---|---|---|
| 0 | Reframe and stabilise | Docs, scope and CI match the product; known breaks fixed | Yes (fixes) |
| 1 | The Ride becomes an object | One `rideId` links plan, record, journal, to-dos, check-in | Mostly invisible |
| 2 | One plan, one ride workspace | Trail → plan → ride is one flow; Rides tab replaces scattered screens | Yes (big) |
| 3 | Moments and memory | Located moments, ride timeline, recap | Yes |
| 4 | Safety and group that you can trust | Reliable check-in, linked group rides, validated detection | Yes |
| 5 | Cloud: sync, garage, contribution loop | Rides survive a lost phone; ride → trail with outcome | Yes |
| 6 | Community and intelligence | Clubs run recurring rides; trails improve from rider data | Yes |

Phases are ordered by dependency, not by size. Phases 0 and 1 are the foundation: nothing after them is cheap without them.

---

## Phase 0 — Reframe and stabilise

**Goal.** Make the repository tell the truth, and remove what is broken or risky today, before building on it.

**Scope**
- **Product docs:** rewrite `PRODUCT.md` (vision = Rider OS, directory = Discover module; replace non-goals that ride features now contradict), refresh `ARCHITECTURE.md`, mark docs/00 and docs/14 status, add an ADR for the Rider OS scope and an ADR for the free-tier rule (reconcile docs/05, D-6, ADR 0002).
- **Breaks (audit):** G01 join sign-in dead-end · G02 check-in email timing (interim: UI tells the rider timing isn't guaranteed; scheduler fix if free path exists) · G03 `data.sql` out of the tree · G13 `/trails` applies `applyNow` · G16 CI `check:colors` and `check:versions` · G09 SOS hold/confirm + native keep-awake · G10 crash recovery at app start.
- **Reversibility set-up:** verify the snapshot (`snapshot/pre-rider-os`) passes lint, typecheck and tests, or record what fails; add the `riderOs` flag (default off) and the pre-migration local copy; create the `feat/rider-os` branch.
- **UX baseline (so "better" can be measured):** record on a device the current step counts and screenshots for: trail → ready to ride, add a to-do, find an old ride, start a group ride, reach a document. Re-run the stuck "Loading…" states on Trails, Clubs and Near you (seen in the web build, cause undetermined) and add timeouts with an error and retry.
- **Release hygiene:** remove "Simulated (testing)" chip and "motion trace" toggle from release builds; hide `/design` in production; fill the iOS privacy manifest (G24).

**Out of scope.** New features, schema changes.

**Exit criteria.** CI green on a clean checkout · every journey in the audit's §6 table that was "breaks" now completes (verified on a device or simulator, not by code reading) · docs describe what exists · `PRODUCT.md` states the Rider OS scope.

**Risks.** G02 may have no free fix; decision needed. Device verification is the first time anyone runs the flows end to end.

---

## Phase 1 — The Ride becomes an object

**Goal.** Give a ride a stable identity and link the existing modules to it, on-device first. This is mostly connecting, not building.

**Scope**
- **`rideId`:** a stable id created when a plan or recording starts, not `startedAt`. **Dual-write:** `rideId` is added alongside `rideKey` and both are written for the whole test period; nothing is deleted or renamed (ADR 0008). A one-time local migration fills `rideId` on old records and first writes a dated copy of the local stores.
- **Ride fields** (on-device): `status` (draft · planned · active · completed · contributed), `bikeId?`, `trailSlug?`, `tripDayId?`, `groupId?`, `checkinId?`, `submissionId?`.
- **Link existing records by id:** journal entries, trip days, to-dos, check-in, group session, submission all carry `rideId` (G04).
- **Collapse the three "next ride" stores** (`trailStore.nextTrip`, `useMyRoutes.followId`, `trips[].days[].route`) into the plan that will become the ride.
- **One Bike:** merge local `vehicle` and server `rider_bike` into a single `bike` and add `bikeId` to rides (G20, local part).
- **Contract:** a short `docs/` spec of the Ride, its states and transitions (draft → planned → active → completed → contributed), what triggers each, and what is recoverable.

**Out of scope.** Server sync, new UI beyond what the links need.

**Exit criteria.** Any ride can list its trip day, to-dos, journal entries, check-in, group session and submission by id · old journals still open · tests cover the migration and each link (this is where the first stateful store tests are added) · no screen reads the retired stores.

**Dependencies.** Phase 0 docs (the ride contract). **Risk.** Migration of existing on-device data; test with a seeded old-format backup.

---

## Phase 2 — One plan, one ride workspace

**Goal.** A rider goes from "I found a trail" to "I'm ready to ride" without re-entering anything, and finds everything about a ride in one place.

**Scope**
- **Plan object:** days, stops (start, destination, fuel, food, stay, custom), reorder, ETA, total distance/time, departure time. Reuse `RouteBuilder` inside trips instead of a separate `/plan` (G07).
- **From trail:** "Plan this" pre-fills route, stops from trail waypoints, and a pack list. Needs trail waypoints rendered and exposed (G31).
- **Duplicate / template** a past ride or trip.
- **Prepare:** ride-linked checklist with before / during / after sections, a reusable template, and a **Ride readiness** summary (route downloaded · checklist progress · bike docs valid · participants confirmed). The wording must not imply safety is guaranteed.
- **Build on what exists (from the UX review, 2026-10-30):** the "Ready to ride?" screen is already a readiness view (GPS, licence, insurance, PUC, emergency contact, to-dos; "never stops you from starting"), so readiness **extends** it with route downloaded, participants and bike documents rather than adding a new screen. The trip screen (Start trip, Days, Pack list) is the seed of the ride workspace, so the workspace **grows** it with Stops, People, Moments and Recap.
- **Navigation:** Home · Explore · **Rides** · Community, behind the `riderOs` flag. The existing floating bar and centre button stay. **Rename the centre button** from "Ride" to "Record" (or "Start") so it does not clash with the Rides tab. The Rides tab is assembled from what "You → Keep track" holds today (ride log, year, trips, journal, to-dos); each of those moves, none is rewritten. Profile moves behind an avatar beside the notification bell and keeps its footer (see below). The Rides tab lists Upcoming / Active / Completed, and opens one **ride workspace** with Overview · Route · Stops · Checklist · People · Moments · Recap.
- **Profile and footer:** Profile = Me (name, total distance, account) · Garage (bike, documents, fuel) · Safety (contacts, medical card, crash detection) · Preferences and data. The footer (share button, disclaimer, legal links, version, map and place-name credits, social links, pronunciation, mountain illustration) stays at the bottom of Profile. The credits and Terms/Privacy links must stay findable.
- **Home:** one primary action by state, not seven stacked blocks. Today "Start trip" and "Plan a trip" compete, the dark "Needs attention" card is the heaviest object on screen, and an in-progress or just-finished ride is not shown. Keep the contextual alert idea but lower its weight than the primary action.
- **Look and feel stays:** tokens, type (Michroma + Geist), the accent, the rounded cards and the floating bar are unchanged. Roughly five screens change materially (Home, trip → ride workspace, live ride, a new Rides list, a shorter Profile) and roughly eight are re-parented with the same content (ride log, journal, trips, to-dos, passport, fuel, documents). This is an estimate to be confirmed when screens are built.
- **Home** becomes contextual: active ride → resume; upcoming trip + readiness; just finished → recap prompt; new rider → plan/find; inactive → one suggestion. Remove the sample ride (G21). Make "Near you" actually use location.
- Regroup the "You" tab (G22).

**Out of scope.** Group publishing, cloud sync.

**Exit criteria.** Trail → ready-to-ride plan takes a measured number of steps (set the target from today's baseline measured on a device) with zero repeated data entry · every ride's data is reachable from its workspace · Home reflects each of the five rider states.

**Dependencies.** Phase 1. **Risk.** Largest UI change; ship behind a flag and migrate screens one at a time, keeping old routes redirecting.

---

## Phase 3 — Moments and memory

**Goal.** What happens on a ride becomes a located, chronological record the rider wants to revisit.

**Scope**
- **Add moment:** one action on the active ride (photo · voice · note · place), capturing time and location automatically (G08). Operation must be one-handed, large targets, and never require typing while moving (existing typing lock stays).
- **Ride timeline:** ride start, stops, moments, breaks, finish in one chronological view and on the map.
- **Recap:** replace the straight-to-story jump with a recap (distance, time, stops, best moments, share image). Keep trimmed sharing (300 m).
- **Media:** keep local-first; retry and recover for incomplete voice/photo capture; per-ride storage use shown.
- **Public vs private** is explicit per moment when contributing (Phase 5).

**Out of scope.** Cloud storage of media.

**Exit criteria.** A moment has coordinates and shows on the map · a finished ride opens a timeline with every kind of event · interrupted recordings are recoverable (tested) · outdoor use check on a real ride (glare, gloves) recorded as findings.

**Dependencies.** Phase 1 (ride id), Phase 2 (workspace). **Risk.** Battery and permission prompts; test background behaviour on real devices.

---

## Phase 4 — Safety and group you can trust

**Goal.** Safety features do what they say, and group riding is part of the plan, not a separate tool.

**Scope**
- **Check-in reliability:** deliver the overdue notice on time (G02, final fix), make the contact channel mandatory or clearly flagged, and show the rider the delivery state. Encrypt emergency details at rest (audit P5).
- **SOS/crash:** validate crash detection on real data (or keep it beta with the same honest wording); add a clear cancel flow and a record of what was shared. Keep "does not replace emergency services".
- **Link check-in to ride** and start it from the plan's departure time.
- **Group rides become plans:** "Make this a group ride" on a plan (date, meeting point, capacity, pace) → code/link, with the rider's plan shared to participants. Participant confirmations feed Ride readiness. Support leaving without ending your own recording (fix the surprise auto-removal).
- **Join flow:** universal links so invites open the app (G11); fix the join path for signed-out riders end to end.
- **Live location sharing** stays opt-in, time-boxed, and off by default.
- **Abuse limits:** rate-limit join-code attempts; make group visibility match who was invited (club-linked ride limited to club members).

**Out of scope.** Community "nearby help" requests (stay deferred, see Phase 6 gate), push to non-running apps unless a free path exists.

**Exit criteria.** Overdue notice arrives within a defined window in a test · a plan becomes a group ride in one step with no re-entry · group session and the recorded rides link by id.

**Dependencies.** Phases 1–2. **Risk.** Push/notifications and scheduling may collide with the free-tier rule; owner decision needed.

---

## Phase 5 — Cloud: sync, garage, contribution loop

**Goal.** Personal data survives a lost phone and works across devices; a ride can become a public trail with feedback.

**Scope**
- **Server model:** tables for ride, trip/plan day, stop, to-do, moment (metadata), bike, with owner-scoped queries (same pattern as today's), and device registration. Use the already-planned sync cursor idea; keep the phone authoritative when offline.
- **Sync:** push/pull of rides, plans, to-dos, moments; conflict rule (last-writer per field, or per-record with a visible conflict for edited completed rides); queue with retry and a visible "waiting to sync" state.
- **Media:** private object storage under R2 with signed URLs and quotas that fit the free tier; local copy stays until confirmed.
- **Wording that stops being true:** the Profile disclaimer "Your rides, journal and documents stay on this device" is false once sync exists. Reword it, and make sync an explicit opt-in the first time.
- **Privacy & retention:** retention purge jobs (G17), token expiry and scopes (G18), re-auth for deletion, deletion cascade extended to new tables, backup stays available.
- **Garage:** one bike linked to rides; service reminders by distance or date from that bike's rides; documents attached to the bike; encrypted at rest.
- **Contribute:** ride → trail pipeline with photos, waypoints, clean/trim, duplicate check, retry queue, and **outcome returned to the app** (G15). **Edit a published trail** from web and app (G14). Draft photos stay private until approval (G05).

**Out of scope.** Social feeds, public ride pages.

**Exit criteria.** Sign in on a second device and see rides and plans · airplane-mode ride syncs after reconnect without loss · a submission shows its moderation outcome in the app · retention jobs run and are tested · storage use stays inside the free tier at a stated user count.

**Dependencies.** Phases 1–3. **Risk.** Highest cost and risk phase: schema, conflicts, quotas. Split into 5a (sync core), 5b (media), 5c (garage + contribution) so each ships alone.

---

## Phase 6 — Community and intelligence

**Goal.** Clubs run recurring rides; trail information improves from what riders actually ride.

**Scope**
- **Clubs ↔ rides:** a club can publish a group ride from a plan, keep a shared trail/plan collection, and re-run a recurring ride from a template. Club ride history. Web club and rider pages become publicly viewable if the owner wants public SEO.
- **Public group-ride discovery** (web + app) with approval, capacity and request-to-join.
- **Trail intelligence:** show dated rider condition reports on the trail page, separate from moderator status; "recent rider data" flags; recorded rides contribute verification evidence, never raw private tracks. Merge the three condition vocabularies (audit F2).
- **Offline:** persistent API cache for saved trails, clubs and Near you; offline tile packs where the provider allows.
- **Insights:** personal stats from ride history (not leaderboards).
- **Optional, gated:** community help requests and expenses. Build only after a safety/abuse review and an explicit owner decision; they never share a code path with emergency features.

**Exit criteria.** A club leader can run a recurring ride without rebuilding it · a rider report on a trail is visible on the next visit and ages out · offline browse of saved content works from a cold start.

**Dependencies.** Phases 4–5.

---

## What is explicitly not planned
- Chat / messaging, followers, leaderboards, achievements feeds.
- Turn-by-turn navigation (off-route alerts and following a route stay).
- Paid services without an owner decision.
- Rewriting the web trail data model (it is sound; extend it).

## Cross-phase workstreams

| Workstream | Every phase |
|---|---|
| **Design system** | New screens use tokens; decide web direction once (DESIGN.md vs shipped) in Phase 0 and generate the mobile palette from the token package |
| **Testing** | Phase 1 adds store tests; add a record → finish → recover E2E before Phase 3; sync tests in Phase 5 |
| **Accessibility** | Large-text and screen-reader pass for each new screen; a real outdoor test before Phase 3 exit |
| **Privacy** | Each new data type gets: owner, retention, deletion path, public/private default |
| **Docs** | Update the ride contract and docs/16 status as each phase lands; tick the plan boxes |

## Decisions needed before each phase

| Before | Decision |
|---|---|
| 0 | Web design direction; free-tier ADR wording; whether G02 may use an external free scheduler |
| 0 | Version number for the Rider OS line (proposed 0.9, beta first; changeable with `Release-As:`); sign-off on the exit rule in ADR 0008 |
| 2 | Tab set (Home · Explore · Rides · Community) confirmed; centre button renamed (Record or Start) |
| 4 | Push notifications: free path or accepted limitation; crash detection stays beta or not |
| 5 | Storage quota per rider; conflict rule for completed rides; whether to stay on the free tier at launch |
| 6 | Public clubs/rider pages on the web; whether help requests are built at all |
