# Ride companion features: design

Status: approved by the user's instruction to build everything ("lets implement all of them in the existing clean ui", 2026-10-28). Decisions marked **(my call)** were not discussed and are open to change.

## 1. Intent

Make Myto the one app a rider uses from planning to the story afterwards, without making the screens busier. A trust-first trail directory (Moto Trails) plus a ride companion: plan and share a route, ride it alone or in a group, tell someone when you have not arrived, report what the trail is like, and share a card of the ride.

**Non-goals.** Anything that depends on kilometres driven over time (service-by-km, mileage log, odometer): the phone cannot measure it correctly, so those are out (decision from the user). Turn-by-turn navigation, voice intercom, chat, a social feed, automatic crash detection, SMS sending.

**Anti-goals.** A busier Ride screen. A feature that shares a rider's location without them having chosen to, or shares their home address on a card or route. A condition report that changes a trail's published access without moderation.

## 2. UX rules

- Tab bar unchanged: Dash, Trails, **Ride**, Clubs, You.
- **Ride ready** (`app/ride/index.tsx`) keeps one big Start. New optional rows, all off by default and remembering the last choice: Route, Group, Check-in.
- **Live ride** keeps Pause, Waypoint, Hold to stop, SOS. New: a Report button, and Group and route layers that appear only when switched on.
- **Story** is the hub after a ride: card, share, report conditions, journal.
- Nothing asks for typing while moving (existing typing gate applies).

## 3. Features and where they live

| # | Feature | Server | Mobile |
|---|---|---|---|
| 1 | Ride card (Instagram story, post, square; Myto badge; stat toggles) | none | `ui/RideCard`, `lib/rideCard`, share sheet |
| 2 | Share a route (link, GPX) | `shared_route`, `/route/[id]` page | `lib/shareRoute`, Story and Plan |
| 3 | Privacy trim of start and end on anything shared | server rounds and caps | `lib/privacy` |
| 4 | "I haven't arrived" check-in + manual SOS share | `ride_checkin`, `/track/[token]` page | `lib/checkinCore`, Ride ready row, Live |
| 5 | Emergency card (blood group, allergies) | carried in check-in, shown only when overdue | profile store, SOS sheet |
| 6 | Condition reports, confirm "still true?", queue offline | `condition_report` | `lib/conditions`, Live and Story |
| 7 | Route-following with off-route alert | none | `lib/routeFollow`, Live |
| 8 | Group rides (code, live map, leader, regroup pin, quick signals) | `group_ride`, `group_ride_member` | `lib/groupCore`, Ride ready, Live |
| 9 | Fuel stops and "no fuel for N km" | none (Overpass from the phone) | `lib/fuel` |
| 10 | Weather and season on a trail or route | none (Open-Meteo from the phone) | `lib/weather` |
| 11 | Plan a route (tap to build, import GPX), elevation profile | none | `lib/routePlan`, `lib/gpxImport`, `lib/elevation` |
| 12 | Offline trail packs (map tiles + route + access info) | none | MapLibre OfflineManager, trails store |
| 13 | Trip mode (several days, one story) | none | trips store |
| 14 | "Are you OK?" prompt after a long unexplained stop | none | `lib/stoppedPrompt`, NotificationHost |
| 15 | Waypoint types (fuel, water, hazard, photo) | none | recorder, GPX |

**(my call)** Group rides and check-ins use polling (a request every 10 to 20 seconds while a ride is on), not websockets: it works on the existing Next.js on Vercel and Postgres, tolerates bad signal, and needs no new service.

**(my call)** No SMS. The rider shares the check-in link from their own phone (WhatsApp, SMS, anything) through the share sheet. A contact email is optional; if given, the server emails when the check-in becomes overdue. The tracking page itself works out "overdue" when opened, so it is right even if no scheduled job runs.

**(my call)** The tracking page shows the rider's last known position only when the check-in is overdue, or when the rider ticked "share live position". Default is private.

## 4. API contract (`/api/v1`, bearer device token unless stated)

Mirror the style of `apps/web/src/server/api/routes.ts` and `community-routes.ts`: `RouteDef`, `Reasons` maps, error shape `{ error: { code, message } }`, `no-store`.

### 4.1 Check-ins
- `POST /checkins` body `{ rideName?: string, expectedAt: ISO, contactName: string, contactEmail?: string, shareLive?: boolean, position?: {lat,lng,at}, emergency?: { riderName?, bloodGroup?, allergies?, bikeName? } }` → `201 { id, token, url }`. `token` is random, 32 bytes, shown once, only its hash is stored; `url` = `${siteUrl}/track/${token}`. `expectedAt` must be in the future and within 7 days.
- `POST /checkins/:id/ping` `{ lat, lng, at, batteryPct? }` → 204. Only while active. At most one accepted per 20 s.
- `POST /checkins/:id/extend` `{ expectedAt }` → 204 (later than now, within 7 days of start).
- `POST /checkins/:id/arrive` → 204 (marks arrived; wipes the position).
- `GET /checkins/:id` → `{ id, status, expectedAt, arrivedAt|null, lastPingAt|null }`.
- Status: `active | overdue | arrived | expired`. Computed from `expectedAt`, `arrivedAt`, now (grace 0). `expired` = 24 h after the end.
- Page `GET /track/[token]` (public, `noindex`, no-store): arrived, on the way, overdue (says who, expected time, last seen, last position map if allowed, emergency card, "Call 112"), or not found. Never exposes the contact email or ids.
- Cron `GET /api/cron/checkins` (cron auth): emails the contact once when a check-in turns overdue; wipes positions and emergency data 24 h after arrival or expiry. **Not added to `vercel.json`**: a schedule shorter than daily needs a paid plan (open question for the user).

### 4.2 Group rides
- `POST /group-rides` `{ name, clubId?: string }` → `201 { id, code, name, expiresAt }`. Code: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Caller becomes leader.
- `POST /group-rides/join` `{ code, displayName }` → `200 { id, name, role }`. Idempotent for the same user. At most 30 riders.
- `POST /group-rides/:id/sync` `{ lat?, lng?, at?, status?: 'ok'|'wait_up'|'fuel'|'break'|'help' }` → `{ riders: [{ id, name, role, lat|null, lng|null, at|null, status }], regroup: { lat, lng, note|null } | null, ended: boolean }`. One round trip: store mine, return everyone's. A rider not seen for 5 minutes has `lat`/`lng` null. At most one accepted write per 5 s (reads are never refused).
- `POST /group-rides/:id/regroup` `{ lat, lng, note? }` (leader) → 204. `{ clear: true }` removes it.
- `POST /group-rides/:id/leave` → 204. `POST /group-rides/:id/end` (leader) → 204: wipes all positions.
- Expires 12 hours after the last activity, hard cap 72 hours. Members only; nothing public. Position columns are wiped on end, leave and expiry.
- If `clubId` is given the caller must be a member of that club.

### 4.3 Condition reports
- `POST /trails/:slug/condition-reports` `{ clientId, kind: 'clear'|'muddy'|'blocked'|'washed_out'|'closed', note?, at: ISO, lat?, lng?, mediaId? }` → `201 { id }`. Idempotent on `(user, clientId)`. **Must fit the existing trust model** (read migrations 0003 and 0005 and the moderation code first): a report is evidence that expires and shows as "reported by a rider on <date>", it never edits published access or condition without moderation.
- `POST /condition-reports/:id/confirm` `{ still: boolean }` → 204 (one vote per user).
- `GET /trails/:slug/condition-reports` (public) → recent reports with `kind`, `at`, `confirmations`, `disputes`, and a computed `fresh: boolean` (14 days).

### 4.4 Shared routes
- `POST /shared-routes` `{ name, points: [[lat,lng],...] (2..2000), waypoints?: [{name,lat,lng}] (max 50), distanceKm, elevationGainM? }` → `201 { id, url }`. Coordinates rounded to 5 decimals. Names stripped of web addresses.
- `GET /shared-routes/:id` (public) → `{ name, points, waypoints, distanceKm, elevationGainM }`.
- `DELETE /shared-routes/:id` (owner) → 204.
- Page `/route/[id]`: map, stats, "Open in Myto" (`myto://route/<id>`), GPX download, `noindex`.

## 5. Data (migration `0023_ride_companion.sql`)
`ride_checkin`, `group_ride`, `group_ride_member`, `condition_report`, `condition_report_vote`, `shared_route`. All private (RLS on, revoked from `anon`, `authenticated`), like `app_auth_code`. Personal rows cascade on `app_user` deletion, and the account-deletion code must cover them (`apps/web/src/server/account/delete.ts`).

## 6. Mobile pure logic (new files in `apps/mobile/src/lib`, each with a vitest file)
`privacy`, `routeFollow`, `fuel`, `weather`, `gpxImport`, `elevation`, `routePlan`, `shareRoute`, `rideCard`, `checkinCore`, `groupCore`, `conditions` (outbox queue core), `stoppedPrompt`, plus API clients `src/api/checkins.ts`, `groups.ts`, `conditionReports.ts`, `sharedRoutes.ts` that use `api()` from `src/api/client.ts` exactly as the contract above says.

## 7. Decisions from the user (2026-10-28) and what is still open
1. Overdue emails: **link only for now.** No schedule shorter than daily; the tracking page works out "overdue" when opened.
2. Instagram Stories direct sharing: **still open** (needs a Meta app id). The card uses the system share sheet.
3. Map tiles for offline packs: **a recommendation was asked for.** Plain PMTiles cannot be saved by MapLibre's offline packs, so a z/x/y tile service is needed (see the chat summary). Offline maps stay off until `EXPO_PUBLIC_MAP_STYLE_URL` is set.
4. Contact SMS: **no.** The rider shares the check-in link.
5. Moderation: **only "Report a problem" is moderated.** Rider condition reports and trail comments show straight away; moderators can still hide one afterwards.
