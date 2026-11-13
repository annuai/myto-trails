# Offline Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rider downloads Indian states separately and gets the map and place search with no signal.

**Architecture:** A laptop pipeline builds, per state, one PMTiles map file (OpenMapTiles schema, so the existing OpenFreeMap "liberty" style works unchanged) and one SQLite FTS5 place file, and uploads them with a manifest to R2. The phone downloads them to disk, composes a local MapLibre style that reads `pmtiles://file://` sources, and searches the local SQLite files before falling back to Photon.

**Tech Stack:** MapLibre RN 11.5.0, expo-sqlite, expo-file-system, expo-crypto, vitest; build side: Planetiler (OpenMapTiles profile), osmium-tool, better-sqlite3, Geofabrik India extract, R2.

**Spec:** [docs/superpowers/specs/2026-11-13-offline-regions-design.md](../specs/2026-11-13-offline-regions-design.md)

**Deviation from the spec (decided here):** the spec said cut maps from the Protomaps build. Protomaps uses its own tile schema, so the "liberty" style would not draw it and the offline map would look different. Build the map with Planetiler's OpenMapTiles profile instead (same schema as OpenFreeMap). Update the spec's pipeline step 1 in Task 1.

## Global Constraints

- Free tier only: hosting is the existing R2 bucket under a `regions/` prefix; no Worker, no server, no paid service.
- No raw spacing, colour or type values in UI: use tokens; run `npm run check:tokens` after UI work (CLAUDE.md).
- No new doc files; fold facts into `docs/runbooks/self-hosted-map-tiles.md` and `docs/todo.md` (CLAUDE.md lean-docs rule).
- Attribution "© OpenStreetMap contributors" stays visible on the map.
- Hand-made native setup: never run `expo prebuild --clean`.
- Offline fonts and sprite are bundled in the app; labels use `name:latin` (English).
- Online behaviour is unchanged: OpenFreeMap style and Photon search remain the online path.
- Regions are device-local: no server table, no sync.
- Run only the affected test per task, not the whole suite.

## Review Focus

- Download killed mid-way (app killed, signal lost): the partial file must never count as installed, and the next attempt resumes.
- Not enough free space: refuse in plain words before writing anything.
- Search text with FTS special characters (`"`, `*`, `-`, `:`, `(`), empty text, or Kannada/Devanagari script: never throws, returns local results or none.
- An installed region whose file is missing or corrupt (user cleared storage): the map falls back to the online style and the region shows as needing re-download; no crash.
- Malformed or newer-format manifest, or manifest fetch failing offline: keep the cached one, show the cached list.

---

### Task 0: Device spike (gates all other tasks)

**Files:**
- Create (throwaway, not committed): `apps/mobile/app/dev/pmtiles-spike.tsx`

**Interfaces:**
- Produces: a written result in the spec's "Spike first" section: pass or fail for iOS and Android.

- [ ] **Step 1:** On a laptop, build a small PMTiles file in OpenMapTiles schema for one district (Planetiler `--download --area=...` is not needed; run the Planetiler openmaptiles profile on a Geofabrik extract clipped to a district bbox with `osmium extract -b`, output `district.pmtiles`).
- [ ] **Step 2:** Fetch `https://tiles.openfreemap.org/styles/liberty`, save as `spike-style.json`. Replace the vector source `openmaptiles` `url` with `pmtiles://file://<documentDirectory>/district.pmtiles`, and point `glyphs` and `sprite` at local files (`file://` paths in the document directory, copied from the OpenFreeMap font and sprite URLs for the fonts the style uses).
- [ ] **Step 3:** In the spike screen, copy the three files into `FileSystem.documentDirectory` and render `<Map mapStyle={JSON.stringify(style)} />` centred on the district. Put the phone in airplane mode.
- [ ] **Step 4: Verify** on a real iPhone and an Android device: roads, water and English labels draw; zoom 8 to 13 works. Record pass or fail per platform in the spec. If iOS fails, stop and replace Task 5's style step with the in-app tile server (approach B) for iOS, and tell the user before continuing.

---

### Task 1: Region list and build pipeline (laptop)

**Files:**
- Create: `tooling/offline-regions/regions.json` (states and union territories: `id`, `name`, `bbox` [west, south, east, north] including a 5 km margin)
- Create: `tooling/offline-regions/places.ts` (pure place classification and row building)
- Create: `tooling/offline-regions/places.test.ts`
- Create: `tooling/offline-regions/build.mjs` (orchestrates osmium, Planetiler, SQLite writing, hashing, upload, manifest)
- Modify: `docs/superpowers/specs/2026-11-13-offline-regions-design.md` (pipeline step 1: Planetiler OpenMapTiles profile)

**Interfaces:**
- Produces (used by Tasks 2 and 3, as the file formats):
  - Search file `<id>.places.sqlite`: table `places(id INTEGER PRIMARY KEY, name TEXT, alt TEXT, kind TEXT, detail TEXT, lat REAL, lng REAL, rank INTEGER)` and virtual table `places_fts` using FTS5 over `name, alt` with `content='places'`, `tokenize='unicode61 remove_diacritics 2'`, `prefix='2 3 4'`.
  - Manifest `regions/manifest.json`: `{ "format": 1, "regions": [{ "id", "name", "bbox", "version", "map": {"url","bytes","sha256"}, "search": {"url","bytes","sha256"} }] }`.
  - `classifyPlace(tags: Record<string,string>): { kind: PlaceKind; rank: number } | null` where `PlaceKind = 'city'|'town'|'village'|'hamlet'|'district'|'pass'|'peak'|'landmark'`.
  - `buildRow(tags, lat, lng, stateName): PlaceRow | null`.

- [ ] **Step 1: Write the failing tests** in `places.test.ts`:
  - `classifyPlace({place:'city'})` is `{kind:'city', rank:100}`; town 80; village 50; hamlet 30; `{natural:'saddle'}` is `pass` rank 60; `{natural:'peak'}` is `peak` rank 55; `{tourism:'attraction'}` is `landmark` rank 40; `{highway:'residential'}` is `null`.
  - `buildRow({place:'village', name:'Hampi', 'name:en':'Hampi', 'is_in:district':'Vijayanagara'}, 15.33, 76.46, 'Karnataka')` has `detail: 'Vijayanagara, Karnataka'`; a feature with no `name` returns `null`; `alt` joins `name:en`, `name:kn`, `alt_name` without duplicates.
- [ ] **Step 2:** Run `npx vitest run tooling/offline-regions/places.test.ts` from the repo root. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `classifyPlace` and `buildRow` in `places.ts` using the ranks above (landmarks include `tourism=attraction|viewpoint` and `natural=beach|water` only when named).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Implement `build.mjs <regionId> [--maxzoom 13] [--upload]`**: (a) `osmium extract` of the region bbox from the cached Geofabrik India extract; (b) Planetiler OpenMapTiles profile to `<id>.pmtiles` at the given max zoom; (c) `osmium tags-filter` for the place tags, export as geojsonseq, write SQLite through `buildRow` with `better-sqlite3` (insert, then `INSERT INTO places_fts(places_fts) VALUES('rebuild')`); (d) SHA-256 and sizes; (e) with `--upload`, put both files to R2 (`regions/<id>/<version>/`) and rewrite that region's entry in `regions/manifest.json`. `version` is the build date (`YYYY-MM-DD`). Document the required CLIs at the top of the file, not in a new doc.
- [ ] **Step 6: Verify:** run `node tooling/offline-regions/build.mjs goa` (no `--upload`); expected: `goa.pmtiles` and `goa.places.sqlite` written; `sqlite3 goa.places.sqlite "select name from places_fts where places_fts match 'pana*' limit 3"` returns Panaji.
- [ ] **Step 7: Commit** `feat(tooling): offline region build pipeline`.

---

### Task 2: Manifest and installed-region records (phone)

**Files:**
- Create: `apps/mobile/src/lib/offlineRegions/manifest.ts`
- Create: `apps/mobile/src/lib/offlineRegions/manifest.test.ts`

**Interfaces:**
- Produces:
  - `type Region = { id: string; name: string; bbox: [number, number, number, number]; version: string; map: FileRef; search: FileRef }` and `type FileRef = { url: string; bytes: number; sha256: string }`.
  - `parseManifest(json: unknown): Region[] | null` (null when `format !== 1` or malformed; drops a region with a bad bbox or missing field).
  - `type Installed = { id: string; version: string; bbox: Region['bbox']; mapPath: string; searchPath: string }`.
  - `updateAvailable(region: Region, installed: Installed | undefined): boolean`.
  - `regionTotalBytes(r: Region): number`.

- [ ] **Step 1: Write the failing tests:** `parseManifest` returns null for `{format: 2, regions: []}`, for `null`, and for a string; accepts a valid one and drops a region whose bbox has west >= east; `updateAvailable` is true when versions differ, false when equal or not installed; `regionTotalBytes` sums map and search.
- [ ] **Step 2:** Run `npx vitest run src/lib/offlineRegions/manifest.test.ts` in `apps/mobile`. Expected: FAIL.
- [ ] **Step 3:** Implement in `manifest.ts`.
- [ ] **Step 4:** Run it again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): offline region manifest parser`.

---

### Task 3: Offline place search

**Files:**
- Create: `apps/mobile/src/lib/offlineRegions/searchIndex.ts`
- Create: `apps/mobile/src/lib/offlineRegions/searchIndex.test.ts`
- Modify: `apps/mobile/src/lib/placeSearch.ts` (add local-first search)
- Modify: `apps/mobile/src/lib/placeSearch.test.ts`

**Interfaces:**
- Consumes: `Installed` from Task 2; the `places` / `places_fts` schema from Task 1; `Place`, `searchPlaces` in `placeSearch.ts`.
- Produces:
  - `ftsQuery(text: string): string | null` (null for text with no letters or digits).
  - `searchLocal(text: string, installed: Installed[], near?: LatLng, limit?: number): Promise<Place[]>` (default limit 6).
  - `mergePlaces(local: Place[], online: Place[], limit: number): Place[]`.
  - `searchPlaces` keeps its signature; new behaviour: local results first, then Photon when it succeeds; when Photon throws and local has results, return the local ones.

- [ ] **Step 1: Write the failing tests:**
  - `ftsQuery('mys')` is `'"mys"*'`; `ftsQuery('coorg  hills')` is `'"coorg" "hills"*'`; `ftsQuery('a"b*(c)-d:e')` returns a string containing no unescaped `"` `*` `(` `)` `-` `:` outside the wrapping quotes and prefix star; `ftsQuery('   ')` and `ftsQuery('"*')` are `null`; `ftsQuery('ಮೈಸೂರು')` is a non-null string.
  - `mergePlaces` drops an online place with the same name and a point within 0.01 degrees of a local one, keeps local first, and truncates to `limit`.
- [ ] **Step 2:** Run `npx vitest run src/lib/offlineRegions/searchIndex.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `ftsQuery` (split on whitespace, strip all but letters, digits and marks per token using Unicode property escapes, quote each token, star on the last) and `mergePlaces`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Implement `searchLocal`** with `expo-sqlite` (`openDatabaseAsync(searchPath, {}, dir)` readonly), querying `places_fts` joined to `places`, ordered by `rank DESC, bm25(places_fts)`; when `near` is given, add a small distance tiebreak. A region whose file fails to open is skipped (Review Focus: corrupt file). Wrap each region in try/catch.
- [ ] **Step 6: Wire `searchPlaces`:** read installed regions from the store (Task 4 `listInstalled()`), run `searchLocal` and Photon in parallel, `mergePlaces`. Add a test in `placeSearch.test.ts` for the pure merge-on-error helper you extract (`combine(local, onlineResult | Error)`): with an Error and local results returns local; with an Error and no local results rethrows.
- [ ] **Step 7:** Run `npx vitest run src/lib/placeSearch.test.ts src/lib/offlineRegions`. Expected: PASS.
- [ ] **Step 8: Commit** `feat(mobile): offline place search`.

---

### Task 4: Download manager and installed store

**Files:**
- Create: `apps/mobile/src/lib/offlineRegions/store.ts`
- Create: `apps/mobile/src/lib/offlineRegions/download.ts`
- Create: `apps/mobile/src/lib/offlineRegions/download.test.ts`
- Modify: `apps/mobile/package.json` (add `expo-crypto` at the version `npx expo install expo-crypto` picks)

**Interfaces:**
- Consumes: `Region`, `Installed`, `parseManifest`, `regionTotalBytes` (Task 2).
- Produces:
  - `MANIFEST_URL` (R2 `regions/manifest.json`, from `EXPO_PUBLIC_REGIONS_BASE_URL`).
  - `loadManifest(): Promise<Region[]>` (fetch, validate with `parseManifest`, cache to disk; on failure or null return the cached list, or `[]`).
  - `listInstalled(): Promise<Installed[]>` (reads `regions/index.json` in `documentDirectory`; drops entries whose files are missing).
  - `downloadRegion(region: Region, onProgress: (pct: number) => void): Promise<void>`.
  - `deleteRegion(id: string): Promise<void>`.
  - `checkSpace(freeBytes: number, region: Region): { ok: true } | { ok: false; message: string }` (needs total bytes plus a 10 percent margin; message is plain words with the size in MB).

- [ ] **Step 1: Write the failing tests** for `checkSpace`: ok when free is above total times 1.1; not ok below, with a message containing the megabytes needed; exactly at the boundary is not ok.
- [ ] **Step 2:** Run `npx vitest run src/lib/offlineRegions/download.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `checkSpace` in `download.ts`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Implement `downloadRegion`:** check space with `FileSystem.getFreeDiskStorageAsync`; download map and search with `FileSystem.createDownloadResumable` to `<id>.<version>.map.part` and `.search.part` (persist resume data so a retry resumes); verify byte size and SHA-256 (`expo-crypto` digest of the file) against the manifest; on mismatch delete the part and throw "The download was damaged, try again"; rename both parts to final names; only then write the entry in `regions/index.json` (last, so a killed download leaves nothing installed); finally delete files of the older version. `deleteRegion` removes files and the entry.
- [ ] **Step 6: Verify on device** (Task 0 devices): download Goa, kill the app at about 50 percent, reopen, download again: it resumes and `listInstalled()` shows nothing until complete.
- [ ] **Step 7: Commit** `feat(mobile): offline region download manager`.

---

### Task 5: Local map style

**Files:**
- Create: `tooling/offline-regions/bundle-style.mjs` (fetches liberty, writes the bundled assets)
- Create: `apps/mobile/assets/offline-map/liberty.json`, `sprite*`, `fonts/**` (generated; latin glyph ranges 0-255 and 8192-8447 only)
- Create: `apps/mobile/src/lib/offlineRegions/style.ts`
- Create: `apps/mobile/src/lib/offlineRegions/style.test.ts`
- Modify: `apps/mobile/src/ui/map/OsmMap.tsx` (the `mapStyle` prop at line 145 only)
- Modify: `apps/mobile/src/ui/map/OsmMap.web.tsx` only if it imports `mapStyleUrl` in a way the change breaks (web keeps the online style)

**Interfaces:**
- Consumes: `Installed` (Task 2), `listInstalled` (Task 4), `mapStyleUrl` in `ui/map/style.ts`.
- Produces:
  - `regionAt(point: LatLng, installed: Installed[]): Installed | undefined` (first region whose bbox contains the point).
  - `composeLocalStyle(base: StyleSpec, installed: Installed[]): StyleSpec` (one `vector` source per region with `url: 'pmtiles://file://' + mapPath`; every base layer cloned per region as `<layerId>@<regionId>` with its `source` swapped; the base `openmaptiles` source removed; `glyphs` and `sprite` set to local file paths).
  - `useMapStyle(dark: boolean, center?: LatLng): string | StyleSpec` hook returning the local style when `regionAt(center, installed)` is defined at mount, else `mapStyleUrl(dark)`.

- [ ] **Step 1: Write the failing tests:** `regionAt` returns a region when the point is inside its bbox and undefined outside; with two installed regions whose boxes overlap it returns the first; `composeLocalStyle` with two regions yields two sources, `layers.length` equal to twice the base layer count, every layer id unique and ending in `@<id>`, no layer still referencing the removed source, and `glyphs` starting with `file://`.
- [ ] **Step 2:** Run `npx vitest run src/lib/offlineRegions/style.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `regionAt` and `composeLocalStyle`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Implement `bundle-style.mjs`** (fetch liberty JSON, collect the fonts its layers use, download only the latin glyph ranges and the sprite, write them under `assets/offline-map/`) and run it. At app start, copy the bundled glyph and sprite assets into `documentDirectory/offline-map/` once (so `file://` paths exist; version the copy by a constant). Keep the bundled size under 6 MB; if over, drop fonts only used by rare layers and say so in the commit.
- [ ] **Step 6:** Implement `useMapStyle` and use it in `OsmMap.tsx` in place of `mapStyleUrl(dark)`; the centre is the map's initial `center` or the fitted route's centre. A style that fails to load (`onDidFailLoadingMap`) falls back to `mapStyleUrl(dark)` once (Review Focus: corrupt file).
- [ ] **Step 7: Verify on device in airplane mode:** with Goa installed, the home map and a route in Goa draw with labels; a route outside Goa shows the online style when online. Confirm "© OpenStreetMap contributors" shows.
- [ ] **Step 8: Commit** `feat(mobile): draw offline regions on the map`.

---

### Task 6: Regions screen and entry points

**Files:**
- Create: `apps/mobile/app/offline-maps.tsx` (not `region.tsx`: that is the country and units screen)
- Create: `apps/mobile/src/features/offlineMaps/RegionRow.tsx`, `RegionRow.tokens.ts`
- Modify: `apps/mobile/app/profile.tsx` (one row linking to the screen; if the profile has no fitting section, add it under the existing maps or data section)
- Modify: `apps/mobile/app/trail/[id].tsx:19-92` (when `regionAt(trail start, installed)` is defined, the "Save for offline" map step says the map is already saved by region and skips `downloadTiles`)

**Interfaces:**
- Consumes: `loadManifest`, `listInstalled`, `downloadRegion`, `deleteRegion` (Task 4); `updateAvailable`, `regionTotalBytes` (Task 2); `regionAt` (Task 5).
- Produces: a screen listing regions with name, size in MB, and one action per state: Download (with percent), Update, Delete (with confirm); shows "Not downloaded yet, connect to see the list" when the manifest is empty and offline.

- [ ] **Step 1: Write the failing test** for a pure helper `rowState(region, installed, progress): 'download' | 'downloading' | 'update' | 'installed'` in `RegionRow.tokens.ts`'s sibling `rowState.ts` with `rowState.test.ts`: installed same version is `installed`; installed older version is `update`; progress number set is `downloading`; not installed is `download`.
- [ ] **Step 2:** Run `npx vitest run src/features/offlineMaps/rowState.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `rowState`, then the row and the screen using existing `BackHeader`, `PageTitle`, `SectionTitle` and tokens from `@/theme/tokens`. Plain words for errors (space, damaged file, no signal).
- [ ] **Step 4:** Run the test. Expected: PASS. Then `npm run check:tokens` and `npm run typecheck` from the repo root. Expected: no errors.
- [ ] **Step 5: Verify on device:** download Goa from the screen, see size and percent, delete it, re-download; the trail screen in Goa says the map is saved.
- [ ] **Step 6: Commit** `feat(mobile): offline maps screen`.

---

### Task 7: Build and publish the first states, docs

**Files:**
- Modify: `docs/runbooks/self-hosted-map-tiles.md` (replace the Worker plan by this design in about 5 lines: R2 `regions/` files plus manifest, build command, attribution)
- Modify: `docs/todo.md` (one line: remaining states, monthly refresh)
- Modify: `docs/superpowers/specs/2026-11-13-offline-regions-design.md` (set Status to built; record real file sizes and the chosen max zoom)

- [ ] **Step 1:** Run `node tooling/offline-regions/build.mjs <id> --upload` for Goa, Kerala and Karnataka. Record each map and search size.
- [ ] **Step 2:** If any map is over 400 MB, rebuild with `--maxzoom 12` and compare; choose the zoom the user approves (ask with the sizes in hand).
- [ ] **Step 3:** Set `EXPO_PUBLIC_REGIONS_BASE_URL` in `apps/mobile/.env` (never committed). Verify the full flow on a real device from a clean install: list, download, airplane mode, map, search "Hampi" and "Agumbe".
- [ ] **Step 4:** Update the three docs. Run `npm run typecheck` and `npm run check:tokens`.
- [ ] **Step 5: Commit** `docs: offline regions built`.
