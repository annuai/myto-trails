# M2 discovery Implementation Plan (condensed)

> Executed inline, test-first, with one fresh whole-branch review at the end of the milestone. Autonomous run: decisions are recorded as rulings in the final report.

**Goal:** Search, filters, place search ("Bangalore"), near me with approximate travel time, list + map views with URL state.

**Spec:** docs/02 (D-1…D-14), docs/03, docs/05 §10 and §13, docs/07 §2–3, docs/09.

## Global constraints
- Public data only through views under role `anon`. Filter state lives in the URL; near-me coordinates never enter the URL or logs.
- "Hide closed" is on by default (closed = permanently closed, or temporarily closed and not overdue).
- Sensitive trails use only their public point for distance and map position.
- Gazetteer: a curated built-in list (no download, no licence issue); a full dataset is a later, licence-checked import.
- Map: MapLibre GL, style from `NEXT_PUBLIC_MAP_STYLE_URL` (default MapLibre demo style), attribution always visible, list is always available.
- Travel time is an estimate: `straight-line km × 1.4 ÷ 40 km/h`, always labelled "≈".

## Tasks
1. **Schema (0006):** `place` table + `public_places` view; generated `search_tsv` on `trail_revision` + GIN; `public_trail_search` view (adds `lon`, `lat`, `geog`, `search_tsv`, suitability, months, effective-closed flag). Seed `data/places.json` (about 100 Indian cities and hill stations with alternate names) via `db:seed:places`. DB tests: anon can read only the views; sensitive trails have no exact point; alias search finds "Bangalore" and "Bengaluru".
2. **Domain:** `haversineKm`, `estimateTravel`, `isClosed` (condition + expected date) with tests.
3. **Search params:** Zod schema `SearchParams` with parse/serialise round-trip (`parseSearchParams`, `toSearchString`), defaults, bounds, unknown values ignored.
4. **Queries (DB-tested):** `searchTrails(sql, params, now)` (text, filters, near place or point, sort, pagination), `suggest(sql, q)` (trails, places, regions), `findPlace(sql, slug)`; hostile input safe; hide-closed default; sort modes.
5. **Pages/components:** `/trails` (list and map views), `SearchCombobox` (client), `NearMeButton` (client, no coordinates in URL), `RadiusChips`, `FilterPanel`, `ActiveFilterList`, `Pagination`, `ViewToggle`, `TravelTime`; header navigation (Explore, Regions); home search box. API routes `/api/suggest` and `/api/near`.
6. **Map:** `TrailMap` client component (lazy-loaded), GeoJSON builder (tested), cluster layer, status-shaped markers, selected-trail card, controls with labels.
7. **Verification:** browser checks at 375 and 1280, keyboard path, sitemap includes `/trails`, CI green, fresh review.

## Review focus
1. Sensitive trails never expose exact coordinates through search, suggest, map or near-me responses.
2. Hostile `q`, filter values, `page`, `lat/lon`, radius: bounded, parameterised, no 500s.
3. Near-me coordinates absent from URLs, logs and cache keys.
4. Hide-closed default and overdue-closure handling are correct on boundaries.
5. Search remains correct and bounded for empty query, one-character query, huge pages and negative values.
