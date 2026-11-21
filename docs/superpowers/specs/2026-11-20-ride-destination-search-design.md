# Change the destination during a ride: design

Date: 2026-11-20 · Status: awaiting approval · Scope: `apps/mobile` (ride screen, group session, sync); no server change.

## Intent

A rider on the ride screen cannot add or change a destination. The guidance machinery already exists and works; the ride screen has no way to open it. The rider wants one search button on the ride recording screen that sets or changes the destination mid-ride, with the same search and "choose on the map" interface everywhere. On a group ride the leader's change is the group's and reaches everyone. When the lead passes to someone else, the destination and the control to change it pass with it.

## Goals

- A search button on the ride screen opens `DestinationSheet` (search as you type, offline index, choose on the map).
- Solo ride: the choice is the rider's own destination.
- Group ride, leader: the choice is the group destination, shared with every rider through the existing sync.
- Group ride, follower: the choice is a personal destination, labelled "Only for you".
- Handing over the lead keeps the group destination until the new leader explicitly sets or removes one.
- Followers are told when the leader changes the destination.

## Non-goals and anti-goals

- No new server endpoint, table or migration. `POST /group-rides/:id/regroup` and the sync already carry the group destination.
- Not a way for a follower to change the group's destination. A follower's search never writes to the group.
- No typing while the bike is moving. A change that works but invites typing at speed is a failure.
- Not multi-stop routing or a destination queue. One destination at a time.
- The leader's "Remove the destination" is the only way to clear it besides ending the group. Handing over the lead, leaving, or time passing never clears it.

## Current state (what the code does today)

- `useGuideTarget` ([guideTarget.ts](../../../apps/mobile/src/store/guideTarget.ts)) holds the personal destination `to`, a `rescue`, and a `paused` place. "Navigate with Myto" and Go home set it; the turn card, voice guidance, map pin and rerouting all follow it.
- On the ride screen `destination = rescue ?? to ?? regroup` ([live.tsx:134](../../../apps/mobile/app/ride/live.tsx)), where `regroup` is the group destination from sync.
- With a trail loaded, `roadTo` ignores `to` except on the way to the start ([live.tsx:222](../../../apps/mobile/app/ride/live.tsx)).
- A leader can set the group destination only from the Destination row in the Group sheet ([GroupSheet.tsx:100](../../../apps/mobile/src/features/GroupSheet.tsx)), through `pin()` in `useGroupSession`, which calls `setRegroup` and updates the store at once. The server rejects non-leaders (`not_leader`).
- `transferLead` on the server changes only `leader_id` and roles, so the destination already survives every kind of hand-over.
- Trail guidance to the start and then along the GPX already exists (`to_start` then `on_trail`, [trailGuide.ts](../../../apps/mobile/src/lib/trailGuide.ts)).

## Approaches

One sensible shape, so none were weighed against it. Reuse `DestinationSheet`, `useGuideTarget` and `pin()` rather than building a second destination mechanism. The alternative of a separate ride-screen destination store was rejected: it would duplicate `useGuideTarget` and drift from it.

## Design

1. **The button.** An `IconButton` (search icon) on the map's top-right corner, stacked under the existing hide/show-details button, in both portrait and landscape layouts. It opens `DestinationSheet` as an overlay on the ride screen.
2. **Role decides the meaning.**
   - Leader: title "Group destination"; `onSet` calls `pin(point, name)`. The sheet also holds "Remove the destination" (moved from the Group sheet, which keeps a read-only row for followers).
   - Solo or follower: title "Your destination, only for you" on a group ride; `onSet` calls `useGuideTarget.set(point)`.
3. **Stopped-only typing.** While the bike is moving the search field is disabled with "Stop to search". "Choose on the map" and Home stay available at any speed. Same gate as the journal note's `canType`.
4. **Explicit destination overrides a trail.** A personal destination takes over guidance while set, as a rescue does: the trail stays on the map and recording continues. "Stop guiding" returns to rejoining the trail. The priority is a small pure function (rescue, then personal destination, then trail, then group destination) so it can be unit tested.
5. **Leader change reaches followers.** When synced `regroup` changes by coordinates, a follower's personal destination is dropped and they switch to the group's. They get a buzz, a voice line and a turn-card prompt: "Leader changed the destination to X". The comparison is on coordinates, so a hand-over with an unchanged destination produces no notice and drops nothing.
6. **Hand-over (the bug).** The sync handler ([CompanionHost.tsx:166](../../../apps/mobile/src/CompanionHost.tsx)) never updates `group.role`; only the acting phone does, through `showLead`. Fix: on each sync, set `group.role` from this phone's own rider entry (the one whose id equals `me`). Effects: a rider who is passed the lead gets the control; a leader whose lead was taken loses it before the server has to answer `not_leader`. The optimistic `showLead` swap stays for instant feedback. The existing lead notice also tells the new leader what they now control: "You're leading now. The destination is X, and you can change it", or says none is set.
7. **Optional, same change:** a cue on arriving at a trail's start ("At the start. Following the trail."): a buzz, a voice line, and the card heading changes. Today the switch from `to_start` to `on_trail` is silent. Include only if approved.

## Constraints

- Free tier only: no new paid service or endpoint.
- Tokens only, no raw spacing, colour or type values. Run `npm run check:tokens` after the UI work.
- Next.js is not touched.
- Group syncing and its cadence are unchanged.

## Tests

- Store: replacing a personal destination; the priority function in all combinations of rescue, destination, trail and group destination.
- Sync: `group.role` follows the rider entry in both directions (gain and loss of the lead).
- Notice: fires on a coordinate change, not on a role change or an identical point.
- Server: passing the lead keeps `regroup`, in `group-rides.db.test.ts` (needs local PostGIS; not run routinely).

## Docs

About 5 lines in the one doc that owns ride guidance or group rides, stating the rule (leader's change is the group's; hand-over keeps it; followers' search is personal) and why. No new doc file.

## Left to the builder

- Exact placement and spacing of the search button in landscape, where the right column holds four large buttons.
- Wording of the voice line and the notice, within the examples above.
- Whether the speed gate uses the existing stopped flag or a speed threshold, as the journal note does.
- How a personal destination is shown on a group map next to the group's.
