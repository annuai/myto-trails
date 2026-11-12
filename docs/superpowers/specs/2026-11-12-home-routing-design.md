# Home routing

Set a home place once; the app offers "Ride home" at the moments a rider is likely to want it, and starts guidance with one tap.

## Why

After a trail ride, or when leaving the office, the rider has to type a destination into a place search. Home is the one destination that never changes, and the app already knows when a ride has just ended.

## Goals

- One saved Home place and one optional Work place, set from the current location, a place search or a map pin.
- Optional: the recording stops by itself on arriving at Home or Work, decided from how the rider is moving, not from distance alone.
- Longer battery: less GPS work while riding when the battery is low or the bike is standing still, and none at all after arrival.
- "Ride home" offered after a ride ends, when away from home at a usual riding time, and when daylight is running out.
- One tap starts the existing guidance. Arrival is detected.
- Everything on the phone: no server, no paid service, no new permission (Phases 1 and 2).

## Non-goals

- Several saved places beyond Home and one optional Work place.
- A new tab or screen layout (ADR 0009: four tabs stay).
- Remote push (waits for a paid Apple account, see `docs/todo.md`).
- Detecting a commute with no ride running (Phase 3 only, opt-in).

## Anti-goals

- Home leaking off the phone: not to the server, not in a shared or published route.
- A prompt every time the app opens. Ignoring it must make it quieter.
- Offering "home" while the rider is already home, on a multi-day trip, or in a group ride.

## Decisions

Taken from the recommendations in the design discussion; the owner has not yet overruled them.

- **Scope:** Phases 1 and 2 now. Phase 3 (office geofence) is parked behind an ADR.
- **Going home is guidance only** (`/navigate`), not a new recording. "Record this leg" is a switch that uses the ride screen with `autostart`.
- **One optional Work place**, in scope now because auto-end needs it.
- **Auto-end is opt-in** (off by default, like auto-pause). When on, it warns for 30 seconds, then saves the ride through the same path as Stop. Work, and any place the rider has cancelled twice, asks instead of ending. Never in group rides or multi-day trips, and never for rides under 1 km or 5 minutes.
- **Battery:** three sampling profiles (full as today, saver at 20 % or below, idle after 2 minutes standing still); "Save battery on long rides" is on by default and can read distance and top speed slightly low. The home offer takes one Balanced reading at most every 5 minutes and never starts a continuous watch.
- **Privacy:** Home is stored on the phone, included in the encrypted device backup, never sent to the API, and the first and last 500 m of any shared or published route are trimmed.

## Rules (the offer)

Constants (builder's calls, tunable): at home within 300 m; "away" is more than 1,500 m; a ride counts as just ended for 30 minutes; usual-time window is 45 minutes either side of a learned start time; dusk means 60 minutes or less to sunset.

Offer when no suppression applies and one reason holds: `ride-ended`, `usual-time`, `dusk`. Suppress when: no home, a ride is recording, a group ride is on, a multi-day trip is active, within 300 m of home, or the rider dismissed the offer (quiet 3 hours; three dismissals in 14 days quiet it for 14 days). Reason priority: `dusk`, then `ride-ended`, then `usual-time`.

## Auto-end rules

The ride must first have been 1,000 m or more from the place. Inside 200 m with a fresh fix and the bike standing still for 60 seconds gives a warning (20 seconds when the rider is being guided to that place); 30 seconds later it ends. Riding off resets everything. Keep recording adds a strike for that place; two strikes turn it into a question.

## Battery profiles

| Profile | GPS | When |
|---|---|---|
| full | best for navigation, every second (today) | default |
| saver | high accuracy, every 3 s | 20 % or less and not charging, or 10 % or less while navigating |
| idle | balanced, every 10 s | standing still for 2 minutes; full again at 5 km/h |

## Surfaces

Ride finish and story, "Ready to ride?", the first card on Dash, the navigate-choice sheet, and (Phase 2) one local notification "Heading home?" under the nudge governor as an `after` kind. Settings: You → Settings → Home.

## Phase 3 (parked)

An OS geofence on Work (the OS wakes the app, so it costs far less than polling): leaving it fires a local notification that opens guidance. Needs Always-location, a consent screen and an ADR revising the location rule in `docs/15-myto-app-architecture.md` §10.
