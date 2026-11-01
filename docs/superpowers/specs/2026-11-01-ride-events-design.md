# Ride events: design

Status: decisions agreed with the owner in chat on 2026-11-01. Items marked **(my call)** were not discussed.
Background: [docs/competitive/2026-11-01-ridingverse-analysis.md](../../competitive/2026-11-01-ridingverse-analysis.md).

## 1. Intent

Let a rider or a club announce a dated ride, collect yes/no replies, see who actually turned up, and turn the event into a live group ride when it starts. Riding Verse has this; we do it with fewer taps and without QR codes.

**Non-goals.** Payments, split expenses, hazard pins, ride chat, turn-by-turn, a social feed, real push notifications (none exist; see 5).
**Anti-goals.** Exposing a rider's location before they choose to check in. Showing members-only events to non-members. A second place to do the same thing (see 3).

## 2. What was decided

1. One object, the **event**. Host is a rider or a club. Audience is **open** (anyone) or **members** (club members only; clubs only).
2. Club events are created from a new **Events section on the club page**. Rider-hosted events and all open events appear in **Discover** (a section at the top of the Clubs tab; no new tab, ADR 0009).
3. A non-member who finds a members-only event sees "Members only. Ask to join the club." Existing join-request flow; no new approval path.
4. **Check-in is by location, not QR.** Inside the meeting-point radius and the time window the rider is asked "You're here, check in?". The host can also mark someone arrived.
5. When the host taps **Start**, the event becomes a group ride (existing `group_ride`). Checked-in riders join it. Open events accept walk-up check-ins; members-only events accept only members.
6. **Roles** (Captain, Marshal, Medic, Sweep) are optional, set by the host per event. A group ride with no roles behaves as today.
7. **Stretch alert**: the leader's phone warns when any rider is more than a set distance from the leader.
8. **Decline**: a rider can reply "can't make it" with a reason and an optional note that only the host sees.
9. **Crash-detection presets**: Road, Mixed, Off-road.

## 3. My calls

- **Events replace ride-plan posts for new rides.** The club composer's "ride" option creates an event; old `club_post` ride plans stay readable and keep their Going/Maybe. Avoids two ways to announce a ride.
- **Crash preset is one setting per account**, not per bike: each rider has exactly one bike (`rider_bike` is keyed by user).
- **Meeting point:** place search result plus a radius of 150 m (host can pick 100 to 500 m). Check-in window opens 60 minutes before the start and closes 6 hours after it.
- **Capacity and waitlist:** optional rider limit 2 to 200. When full, new "going" replies become `waitlisted`; when a going rider declines, the oldest waitlisted rider is promoted.
- **Who sees the roster:** the host sees every reply, reason and note. Everyone else sees counts. Names of going riders are not shown to others.
- **Notifications:** none pushed. The host gets no email per RSVP. The event page is the source of truth; riders see their events in Discover. No local reminders in this release.
- **Start rule:** only the host, from 60 minutes before the start.
- **Rate limits:** 5 events created per rider per day; open events from accounts that have not finished the welcome step are refused (reuses `isMember`).
- **Public web page** `/event/{id}` for open events: title, time, place, rider count, "Open in the app". Read-only. Members-only events 404.
- **Stretch distance:** 3 km default, host-adjustable per ride from 1 to 10 km.
- **Event cancelled:** status `cancelled`, visible with a banner to those who replied; no deletion.

## 4. Data

`ride_event`: id, public_id, host_id, club_id?, title (3-80), description (<=500), starts_at, time_zone, place_name (<=120), lat, lng, radius_m (100-500), audience (open|members; members needs club_id), capacity?, status (scheduled|live|ended|cancelled), group_ride_id?, created_at.

`ride_event_rsvp` (PK event_id, user_id): response (going|maybe|declined|waitlisted), reason? (work|bike|distance|other), note? (<=200), checked_in_at?, role? (captain|marshal|medic|sweep), created_at, updated_at.

`group_ride`: add `event_id`, `stretch_km`. `group_ride_member`: add `event_role`. Existing `role leader|member` unchanged.

## 5. UX rules

Follow docs/16-myto-app-ui.md and docs/design-tokens.md: no raw numbers or colours, sentence case, 48 px targets, status as glyph plus word plus colour, nothing typed while moving, Lucide icons through `Icon`. Role badges reuse the rider colours; a role adds a letter and a word, not a new colour.
The event page has one primary action at a time: Going, Check in, Join ride. Decline is a secondary button that opens a sheet with four reason chips.
