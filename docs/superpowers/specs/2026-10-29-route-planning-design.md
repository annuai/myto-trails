# Route planning: design

Status: **built, not yet committed, not run on a device.** Scope: `apps/mobile` only. No server work, no new database table.

## 1. What it does

Plan a route from stops instead of tapping a bare line on the map. The rider searches for places ("Mysuru", "Nandi Hills") or taps the map, puts the stops in order, and the app joins them along roads a motorcycle can ride. The result is saved to My routes and can be followed, shared and exported like any other route.

It lives on the Plan screen under "Build a route" (`app/plan.tsx`), which now only hosts `RouteBuilder`. Before this, the screen joined tapped points with straight lines.

## 2. Parts

| File (`apps/mobile/src`) | Job |
|---|---|
| `features/route/RouteBuilder.tsx` | The screen section: search, map, ordered stop list, distance and time, name, save |
| `features/route/PlaceSearch.tsx` | Search box with a result list; picking a place adds it as a stop |
| `lib/placeSearch.ts` | Looks places up by name; `parsePlaces` turns the answer into `Place[]` |
| `lib/roadRoute.ts` | Asks a routing service for the road route through the stops |
| `lib/waypoints.ts` | `Waypoint` type, `moveWaypoint` (reorder), `routeNameFor` ("A to B") |
| `lib/routePlan.ts` (existing) | Straight-line fallback (`planRoute`) and `simplify` |

Each `lib` file has a vitest file beside it (`placeSearch`, `roadRoute`, `waypoints`).

## 3. Decisions

**Both services are free, keyless OpenStreetMap services, so nothing costs money or carries a secret** (see the free-tier constraint in the project notes).

- **Place search: Photon** (`photon.komoot.io`). Up to 6 results, English. When the rider already has stops, the last one is passed as `near` so results lean towards where they are planning. Results with no name or position, and repeats of the same name and area, are dropped.
- **Road route: Valhalla** on the public OpenStreetMap server (`valhalla1.openstreetmap.de`), costing `motorcycle`. Stops that are off a road are moved to the nearest one (`type: break`).
- **More than 20 stops.** The public server refuses more than 20 locations per request, so `chunkStops` splits the stops into runs of 20 that share their joining stop, and the legs are stitched back together without a repeated point.
- **Saved size.** Road geometry is dense, so `simplify` drops points within 5 m of the line. The shape holds and a saved or shared route stays small.
- **Distance and time** come from the routing answer (`summary.length`, `summary.time`), summed across runs. The time is riding time at the road's speeds, not a promise; the label says "about".

## 4. Behaviour

- The route is recomputed 400 ms after the stops' positions change. Reordering or moving a stop reruns it; renaming never does (the effect depends on the stops' positions only). A request still in flight is aborted when the stops change again.
- **Until the road route arrives, and if it cannot** (offline, server down, no road found), the stops are joined by straight lines and the label says "in straight lines. The road service could not be reached." Saving is disabled only while a request is running, so a rider with no signal can still save the straight-line route.
- Naming: the rider's own name wins. Otherwise two named places give "Bengaluru to Mysuru". Otherwise "My route". A stop dropped on the map has no name.
- The existing `RouteCheck` runs on the planned line as before.

## 5. Privacy and limits

- Search text and the stops' coordinates are sent to two third-party public servers (Photon and Valhalla). No account or device id is sent. Say so in the privacy text if it does not already.
- Both are shared public servers with no guarantee of uptime and a fair-use expectation. This is acceptable for light use. If rider numbers grow, move to a self-hosted Valhalla or a paid tier; the only code that changes is `lib/roadRoute.ts` and `lib/placeSearch.ts`.
- Routing is for motorcycles on roads. It does not know about trail access class or closures from the trails database, so a planned road route is not a statement that the way is open.

## 6. Not done

- Not run on a phone; the web build is what has been exercised.
- No turn-by-turn navigation; the route is followed on the map as before.
- No "avoid highways" or "prefer unpaved" options (Valhalla supports them; not requested).
- No drag-to-reorder; reordering uses the up and down buttons.
