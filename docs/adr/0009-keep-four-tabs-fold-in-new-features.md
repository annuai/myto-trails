# ADR 0009: Keep the four-tab interface; fold the new capabilities into it

**Status:** accepted (2026-10-30). Supersedes the navigation part of [ADR 0008](0008-rider-os-change-and-reversibility.md).

**Context.** The Rider OS work added capabilities (trip stops, ride ids, located moments, a ride timeline, group rides from a trip, moderation answers, rider reports, offline cache) and, behind a build flag, a new navigation: Home, Explore, Record, Rides, Community with Profile behind the header. After using it on a phone the owner wants the 0.8 interface back: **four tabs (Dash, Trails, Clubs, You) and the raised Ride button**, with every new capability kept.

**Decision.** One rule: *navigation, labels and screen layout return to 0.8; capabilities stay.* Each new capability lives on a screen the old app already had.

| Capability | Where it lives now |
|---|---|
| Stops on a trip day, reorder, time estimate | Trip day sheet (Trips, a trip, a day) |
| Plan this trip again | Trip screen |
| Ride this together (group ride named after the trip) | Trip screen |
| Route and pack list rows in the pre-ride check | "Ready to ride?" (the Ride button) |
| Ride timeline | Ride story, under the ride's time |
| Moment places (lat, lng) and `rideId` | Journal entries; no screen change |
| Group ride and check-in noted on a finished ride | Stored on the ride; no screen change |
| Moderators' answer on a ride sent for review | Ride story, in the "Share it" card |
| Repeat a club ride plan a week later | Club screen, on a ride plan |
| Just-finished ride | Dash's first card shows the latest ride (name, time, distance, top speed, View ride story) for 24 hours after a ride. Before that, and after, it is the 0.8 card: planned trip, next ride or Plan your next ride. The Start trip / Start ride / Plan a trip buttons below it never change |
| SOS hold, keep-awake, request timeout, offline cache | Behaviour only |
| Rider reports on trail pages, "Open in the app" | Website |

**Removed.** The `riderOs` flag and `src/lib/flags.ts`; the Rides tab (`(tabs)/my-rides.tsx`); the header Profile button; the tab and button renames (Home, Explore, Record, Rides, Community, Profile, Garage); the Home focus card and `homeFocus` (the first Dash card is unchanged except for the just-finished case above); the "Add moment" label (the live-ride link is "Journal" again, still tagging location).

**Consequences.**
- One interface to test and maintain; no build flag.
- The "Rides" idea (what is on, coming up, ridden in one place) is not built as a tab. Today that is You → Keep track (Ride log, Trips, Journal, To-do list).
- The exit rule in ADR 0008 about finding Profile and Garage unaided no longer applies; the others still do.
- Reversibility is the snapshot (`snapshot/pre-rider-os`, `legacy/0.8-companion`) and the additive data design, not a flag.
- If a Rides tab is wanted later, the removed screen is in the git history of `feat/rider-os` (commit `122efa5`).
