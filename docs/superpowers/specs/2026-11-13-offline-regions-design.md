# Offline regions: map and place search, by state

Date: 2026-11-13 · Status: draft, awaiting approval · Size: project

## Intent
A rider downloads a state (Karnataka, Kerala, Goa, …) once, on wifi, and then has the map and place search with no signal. Today only a single trail's map can be saved (`apps/mobile/src/lib/offlineTiles.ts`, capped at about 2,800 tiles by OpenFreeMap's download limit), and place search (`placeSearch.ts`, Photon) needs the network. Riding in the Western Ghats or Ladakh means no signal exactly where the map matters.

## Goals
- Download and delete regions separately, one per Indian state or union territory.
- Offline map at street level inside a region, with the same look as the online map.
- Offline place search: cities, towns, villages, hamlets, districts, mountain passes and peaks, major tourist and natural landmarks.
- Resumable downloads, visible size before downloading, "update available" per region.
- Costs nothing to run (free tier: R2 storage only, no egress fees; no server, no Worker).

## Non-goals
- Offline routing or turn-by-turn directions.
- Fuel, food or other street-level points in search (can be added to the index later).
- Replacing OpenFreeMap for the online map. It stays the online source.
- Regions outside India, or whole-country/continent downloads.
- Replacing the per-trail "Save for offline" pack straight away (see Open items).

## Anti-goals
- A rider on a 4 GB phone downloads a state and the app runs out of space or memory without warning.
- Labels or icons vanish offline because fonts or sprites were left online.
- A half-finished download is treated as a usable region.

## Constraints
- Free tier only (CLAUDE.md). Hosting is the existing R2 bucket, in a separate prefix from trail photos.
- MapLibre React Native 11.5.0 (Android SDK 13.6.1). Hand-made native setup, so no `expo prebuild --clean`.
- `expo-sqlite` and `expo-file-system` are already dependencies.
- Data is OpenStreetMap: attribution "© OpenStreetMap contributors" and OpenMapTiles must stay visible.

## Approaches considered
- **A. One PMTiles file per region read from disk (chosen).** Phone downloads the file; the map style uses a `pmtiles://file://` source. No server, no per-tile requests, resumable, delete is one file. Risk: local PMTiles support in the iOS MapLibre build is unverified.
- **B. Tiny tile server inside the app** serving `{z}/{x}/{y}` from the PMTiles file. Works regardless of native PMTiles support, but adds a native dependency and a failure point. Kept as the fallback if A fails on iOS.
- **C. Extend `OfflineManager` packs to regions** through a self-hosted tile Worker. A state is hundreds of thousands of tiles and requests: slow, uses Worker quota, fragile. Rejected.

Chosen by the user on 2026-11-13: A, with a device test first.

## Design (A)

**Build pipeline (laptop, run per region and about monthly; script in `tooling/`)**
1. Map: cut the region's bounding box (with a small margin) from the Geofabrik India extract with `osmium extract`, then build tiles with Planetiler's OpenMapTiles profile to a chosen max zoom (not Protomaps; the OpenMapTiles schema matches the existing OpenFreeMap style).
2. Search: from the Geofabrik India extract, keep `place=city|town|village|hamlet|suburb`, district boundaries' names, `natural=peak|saddle` (passes) and major `tourism=attraction|viewpoint` and `natural=water|beach` features that have a name. Write one SQLite file per region with an FTS5 table (`name`, `alt_names`, `kind`, `detail` such as "Mysuru, Karnataka", lat, lng, a rank so cities beat hamlets).
3. Upload both files to R2 under a `regions/` prefix, then update `regions/manifest.json`: per region `id`, name, bbox, map and search file URLs, sizes in bytes, a version string (build date), and a SHA-256 for each file.

**Phone**
- `regions` screen (folds into an existing tab, per ADR 0009; no new tab): list from the manifest, size shown, Download / Update / Delete. Manifest is cached on the phone so the list shows offline.
- Download with `expo-file-system` resumable download to a `.part` file, verify size and hash, then rename. A region is usable only after the rename. Check free space before starting and refuse with plain words.
- Fonts and icon sprite: bundled in the app (small) and referenced by the offline style, so labels never need the network.
- Map style: a local style JSON with `pmtiles://` sources for each downloaded region, composed at app start. Outside any downloaded region, or online, the style falls back to OpenFreeMap so behaviour online does not change.
- Search: `searchPlaces` queries the SQLite FTS files of downloaded regions first (prefix match, ranked), then Photon when online. Offline it returns local results only. Same `Place` result type, so `PlaceSearch.tsx`, `RouteBuilder`, `DestinationSheet`, `CreateEventSheet`, `home-place` need no change.
- State kept in the existing local store; no server table and no sync (regions are device-local).

**Sizes (unchecked estimates):** a state about 100 to 400 MB for the map at street level, a few MB for search. Real numbers come from the first built states; the max zoom is set from them (zoom 14 street detail vs 12 to 13 roads and towns).

## Spike first (gates everything else)
Before building the screen: load one small PMTiles file (a district) from local disk in the app's MapLibre on a real iPhone and an Android device, offline, with fonts and sprite local. If both draw, proceed with A. If iOS fails, switch to B for iOS only and say so here.

## Open items and calls I made
- **Max zoom and margin:** my call is to decide after real sizes; default proposal zoom 13, 5 km margin.
- **Regions list:** states and union territories by bounding box, so neighbours overlap by a few MB at borders (my call; polygon clipping is not worth it).
- **Search scope:** my proposal from the conversation; the user said "town and village names, major locations".
- **Per-trail pack:** keep for now; if a downloaded region covers the trail, the trail screen should say the map is already saved. Retiring `offlineTiles.ts` is a later decision.
- **Updates:** manual, per region, with a prompt only when a newer version exists (no background downloads, to save data and battery).
- **Docs on build:** fold a short paragraph into `docs/runbooks/self-hosted-map-tiles.md` (it currently says Worker-based plan; update it to this design) and add a line to `docs/todo.md`; no further new doc files.
