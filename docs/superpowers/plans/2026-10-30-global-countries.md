# Global Countries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Moto Trails operate in any country, opened by adding data (a `region` row plus its states and a flag), while India keeps working unchanged.

**Architecture:** Countries become data on `region` (`iso2`, `enabled`, `config`), trails get a `country_id` filled from a `country_boundary` table, and URLs gain a country segment with 301s from the old paths. Display concerns (locale, units, currency, time zone, phone format, emergency number) stop assuming India and come from per-country config bundled in `packages/domain` plus per-entity time zones. Mobile talks to `/api/v1`, so every API change is additive.

**Tech Stack:** Next.js (web, `use cache`), Postgres + PostGIS on Supabase, `postgres` client, Vitest (`npm run test`, `npm run test:db` in `apps/web`), Expo (mobile), `packages/domain`.

**Spec:** `docs/superpowers/specs/2026-10-30-global-countries-design.md`

## Global Constraints

- Scope is P0 to P3. Every country except India stays `enabled = false`; opening one (P4) is out of scope.
- Distances and elevations stay metric in the database; units are display only.
- Slugs stay ASCII (`isValidSlug`).
- Free tier only: Vercel Hobby, Supabase free, R2. No paid tiles, geocoding or APIs; no planet tile file.
- API changes are additive within `/api/v1` (`docs/14-platform-contract.md`); no v2, no DB shims for old clients.
- `state` and `district` region kinds are kept and treated as admin levels 1 and 2; do not rename.
- Existing India trails are backfilled to India as a blanket assignment, not by polygon test.
- India's outline in `country_boundary` comes from the official Survey of India boundary; Natural Earth supplies all other countries. The builder sources the data and checks its licence. A point matching no polygon is flagged for a moderator, never rejected.
- `access_class` decides the "may I ride it" verdict; `restrictions` are informational tags. Add only `local_ordinance` and `public_land_closure`.
- Emergency number follows current GPS position and must work offline; the SOS sheet always shows the number being dialled with an edit control. Fall back to `112` only when position and device region are both unknown, and say so.
- `admin` covers all countries; existing moderators get India scope.
- Tokenize everything on mobile (no raw spacing, colour or type values; run `npm run check:tokens`). Match surrounding comment density and naming.
- Terms and Privacy stay `draft: true` until a lawyer reviews them.

## Review Focus

1. A GPX or trail point exactly on a border, or in the sea / a polygon gap: expected result is "flag for a moderator", not a crash or silent mis-assignment (Task 3, 4).
2. Old India URLs with trailing slashes, unknown state slugs and a state slug that exists in two countries: old URL redirects to `/regions/in/...`, unknown stays 404 (Task 6).
3. A rider with no signal and no GPS fix at crash time: SOS shows the device-region number or `112` with "couldn't tell where you are", editable (Task 11).
4. Dates for a ride in a time zone other than the viewer's, including across midnight: shown in the ride's own zone (Task 8).
5. Phone numbers typed without `+` in a non-India home country, and Indian numbers typed with `0` or `91` prefixes by an India home-country user: both still normalise (Task 10).

---

## Phase P0: Foundations (no visible change)

### Task 1: Country config in the domain package

**Files:**
- Create: `packages/domain/src/countries.ts`, `packages/domain/src/countries.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Produces:
  - `type CountryConfig = { iso2: string; name: string; emergency: { primary: string; others: { label: string; number: string }[] }; dialCode: string; currency: string; distanceUnit: "km" | "mi"; timeZone: string; adminLabels: { level1: string; level2: string } }`
  - `COUNTRY_CONFIGS: Record<string, CountryConfig>` containing only `IN` (primary `112`, `+91`, `INR`, `km`, `Asia/Kolkata`, labels "state" / "district")
  - `countryConfig(iso2: string | null | undefined): CountryConfig | null` (case-insensitive)
  - `parseCountryConfig(raw: unknown): CountryConfig | null` for the `region.config` JSON

- [ ] **Step 1: Write failing tests** in `countries.test.ts`: `countryConfig("in")?.emergency.primary === "112"`; `countryConfig("ZZ") === null`; `parseCountryConfig({})` is null; `parseCountryConfig(COUNTRY_CONFIGS.IN)` round-trips.
- [ ] **Step 2: Run** `npm run test --workspace packages/domain -- countries` and confirm FAIL.
- [ ] **Step 3: Implement** the type, table and two functions in `countries.ts`; export from `index.ts`.
- [ ] **Step 4: Run** the same command and confirm PASS.
- [ ] **Step 5: Commit** `feat(domain): per-country config with India as the only entry`.

### Task 2: Countries migration

**Files:**
- Create: `apps/web/db/migrations/0024_countries.sql`
- Modify: `apps/web/src/server/db/schema.db.test.ts` (or add `countries.db.test.ts` beside it)

**Interfaces:**
- Produces (schema): `region.iso2 text` (unique where `kind = 'country'`, uppercase 2 letters), `region.enabled boolean not null default false`, `region.config jsonb not null default '{}'`; `trail.country_id uuid not null references region(id)`; table `country_boundary (country_id uuid primary key references region(id), geom geometry(multipolygon, 4326) not null)` with a GiST index; a flag column `trail_revision.country_unmatched boolean not null default false`. The two India bounding-box `CHECK`s (`trail_revision.start_point` in `0002`, `place.point` in `0006`) are replaced with a valid lat/lon check. The latest definitions of `public_trails`, `public_trail_detail`, `public_trail_search` and `public_regions` are recreated with `country_iso2` appended as the last column.
- Consumes: India's `region` row seeded by `seedRegions`.

- [ ] **Step 1: Write failing DB tests**: India row has `iso2 = 'IN'`, `enabled = true`, `config` parseable by `parseCountryConfig`; inserting a trail revision with start point (lon -122, lat 37) now succeeds, (lon 200, lat 0) fails; every existing trail has `country_id` pointing at India; a second country row with `iso2 = 'IN'` is rejected; `public_trails` exposes `country_iso2`.
- [ ] **Step 2: Run** `npm run test:db --workspace apps/web -- countries` and confirm FAIL.
- [ ] **Step 3: Write `0024_countries.sql`.** Backfill: set India's `iso2`, `enabled`, `config` (from `COUNTRY_CONFIGS.IN` serialised), add `trail.country_id` nullable, backfill to India, then set not null. Add new view columns only at the end so API consumers stay compatible.
- [ ] **Step 4: Run** `npm run db:migrate` against the test DB, then the test command again; confirm PASS and that `npm run test:db --workspace apps/web` is still green.
- [ ] **Step 5: Commit** `feat(db): countries on region, trail.country_id, boundary table, global coordinates`.

### Task 3: Boundary loader and `countryAt`

**Files:**
- Create: `apps/web/scripts/db-seed-boundaries.mts`, `apps/web/src/server/db/boundaries.ts`, `apps/web/src/server/db/boundaries.db.test.ts`, `apps/web/data/boundaries/README.md` (source, licence, date, how to refresh)
- Modify: `apps/web/package.json` (script `db:seed:boundaries`)

**Interfaces:**
- Produces:
  - `loadBoundaries(sql: Sql, features: { iso2: string; geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon }[]): Promise<{ loaded: number }>` (idempotent upsert into `country_boundary`, skips iso2 with no `region` row)
  - `countryAt(sql: Sql, point: { lat: number; lon: number }): Promise<{ countryId: string; iso2: string } | null>` (null when no polygon contains the point)
  - `openCountryAt(sql, point): Promise<boolean>` (true only when the matching country is `enabled`)

- [ ] **Step 1: Write failing DB tests** with two small square polygons (country A enabled, country B disabled): a point inside A returns A; inside B returns B and `openCountryAt` is false; in the gap returns null; loading twice leaves one row per country.
- [ ] **Step 2: Run** `npm run test:db --workspace apps/web -- boundaries` and confirm FAIL.
- [ ] **Step 3: Implement** `loadBoundaries`, `countryAt` (`ST_Contains` on the GiST index) and `openCountryAt`; write the script to read GeoJSON files from `apps/web/data/boundaries/` and call `loadBoundaries`.
- [ ] **Step 4: Source the data.** Natural Earth admin-0 for every country except India; the Survey of India boundary for India. Confirm each licence allows redistribution in the repo and write the finding in the README. If the Survey of India data cannot be redistributed, stop and report to the owner before continuing.
- [ ] **Step 5: Run** the tests (PASS), then `npm run db:seed:boundaries` and confirm one row per country that has a `region` row.
- [ ] **Step 6: Commit** `feat(web): country boundaries and point lookup`.

### Task 4: GPX and submissions use "inside an open country"

**Files:**
- Modify: `apps/web/src/server/gpx/analyze.ts` (`analyzeTrack`, the `INDIA` box and `outside_india` error), `apps/web/src/server/submissions/service.ts` and `schema.ts`, and their tests
- Modify: the callers of `analyzeTrack` (find with `grep -rn analyzeTrack apps/web/src`)

**Interfaces:**
- Consumes: `openCountryAt`, `countryAt` from Task 3.
- Produces: `analyzeTrack(segments: TrackPoint[][]): AnalyzeResult` keeps its signature and stays pure; the India box check becomes a plain valid lat/lon check, and `AnalyzeError` renames `"outside_india"` to `"invalid_coordinates"`. A new async `checkOpenCountry(sql: Sql, start: LatLon): Promise<{ ok: true; countryId: string } | { ok: false; error: "country_not_open" | "country_unknown"; message: string }>` in `apps/web/src/server/submissions/country.ts`, called by the upload and submit flows. `country_unknown` (no polygon) lets the submission proceed with `trail_revision.country_unmatched = true` for moderators; `country_not_open` blocks with "Moto Trails isn't open in <country> yet" and the notify-me hint.

- [ ] **Step 1: Write failing tests**: `analyzeTrack` with a US track no longer errors; latitude 95 returns `invalid_coordinates`; `checkOpenCountry` returns `country_not_open` for a disabled country, ok for India, and ok-with-flag path for a point in the sea.
- [ ] **Step 2: Run** `npm run test --workspace apps/web -- analyze` and `npm run test:db --workspace apps/web -- submissions`; confirm FAIL.
- [ ] **Step 3: Implement** the changes above; set `trail.country_id` from `countryAt` at submission time, falling back to the nearest enabled country when unmatched and marking `country_unmatched`.
- [ ] **Step 4: Run** the full web unit and DB suites; confirm PASS.
- [ ] **Step 5: Commit** `feat(web): trails are accepted by open country, not an India box`.

### Task 5: Seed any country

**Files:**
- Modify: `apps/web/src/server/db/seed-regions.ts`, `apps/web/scripts/db-seed-regions.mts`, `apps/web/src/server/db/seed-regions.db.test.ts`
- Modify: `packages/domain/src/regions.ts` (keep `INDIA_STATES`)

**Interfaces:**
- Produces: `type CountrySeed = { iso2: string; name: string; slug: string; enabled: boolean; config: CountryConfig; admin1: { name: string; slug: string }[] }`; `seedCountry(sql: Sql, seed: CountrySeed): Promise<{ inserted: number }>` (idempotent); `seedRegions(sql)` remains and calls `seedCountry` with India, returning the same shape as today.

- [ ] **Step 1: Write failing tests**: `seedRegions` still inserts 37 rows first run and 0 second run (existing test must keep passing); `seedCountry` for a two-state country inserts 3 rows, sets `enabled = false`, and is idempotent; state slugs may repeat across two countries without conflict.
- [ ] **Step 2: Run** `npm run test:db --workspace apps/web -- seed-regions` and confirm FAIL.
- [ ] **Step 3: Implement** `seedCountry` and make `seedRegions` delegate to it.
- [ ] **Step 4: Run** the test and confirm PASS.
- [ ] **Step 5: Commit** `feat(web): seedCountry for any country, India via the same path`.

### Task 6: Country in URLs, queries, SEO and API

**Files:**
- Move: `apps/web/src/app/regions/[state]/**` to `apps/web/src/app/regions/[country]/[state]/**`
- Modify: `apps/web/src/server/queries/regions.ts`, `regions.sql.ts`, `types.ts` (`RegionDto`), `apps/web/src/app/regions/page.tsx`, `apps/web/src/app/regions/seo.ts`, `apps/web/src/app/sitemap-data.ts`, `apps/web/src/features/trail/seo.ts`, `apps/web/next.config.*`, `apps/web/src/server/api/routes.ts`, `apps/web/src/server/api/openapi.ts`, and their tests

**Interfaces:**
- Produces: `RegionDto` gains `countryIso2: string` (additive). `getRegion(countrySlug: string, stateSlug: string, districtSlug?: string): Promise<RegionDto | null>`, `getDistricts(countrySlug: string, stateSlug: string): Promise<RegionDto[]>`, and `getTrailsInRegion` takes the country slug first. Cache tags become `region:<country>:<state>`. A static redirect `/regions/:state` and `/regions/:state/:district` to `/regions/in/:state[/:district]` (permanent, 301) that only matches slugs not equal to an enabled country slug. `seo.ts` `addressCountry` comes from the trail's `country_iso2` instead of `"IN"`. API trail and region payloads add `country`/`countryIso2` fields and document them in the OpenAPI file.

- [ ] **Step 1: Write failing tests**: `regionMetadata`/sitemap include `/regions/in/karnataka`; a redirect test (config-level, mirroring how existing redirects are tested, or a route test) maps `/regions/karnataka/mysuru` to `/regions/in/karnataka/mysuru`; `getRegion("in","karnataka")` resolves while `getRegion("zz","karnataka")` is null; a trail's JSON-LD has `addressCountry` from its country; two countries each with state slug `punjab` resolve to different regions.
- [ ] **Step 2: Run** `npm run test --workspace apps/web -- regions seo sitemap` and `npm run test:db --workspace apps/web -- queries`; confirm FAIL.
- [ ] **Step 3: Implement** the move, query changes, redirects, sitemap and API additions. Keep every existing API field unchanged.
- [ ] **Step 4: Run** `npm run typecheck --workspace apps/web` and the full web suites; confirm PASS. Start the dev server and open `/regions/karnataka` (expect a redirect) and `/regions/in/karnataka` (expect the page).
- [ ] **Step 5: Commit** `feat(web): regions are addressed by country, old URLs redirect`.

### Task 7: Widen restrictions

**Files:**
- Create: `apps/web/db/migrations/0025_restrictions_global.sql`
- Modify: `packages/domain/src/enums.ts` (`RESTRICTIONS`), `packages/domain/src/enums.test.ts`, `apps/web/src/features/trail/labels.ts`, `labels.test.ts`

**Interfaces:**
- Produces: `RESTRICTIONS` gains `"local_ordinance"` and `"public_land_closure"` (existing six unchanged); labels "Local ordinance" and "Public land closure"; the `access_assessment.restrictions` `CHECK` allows all eight.

- [ ] **Step 1: Write failing tests**: `RESTRICTIONS` includes both new values; `restrictionLabel("local_ordinance") === "Local ordinance"`; a DB insert with `restrictions = '{local_ordinance}'` succeeds and `'{bogus}'` fails; the verdict computed for an assessment with `access_class = 'public'` and a `local_ordinance` tag is unchanged from today's `public` verdict.
- [ ] **Step 2: Run** the domain, web and DB tests for `enums`, `labels`, `schema`; confirm FAIL.
- [ ] **Step 3: Implement** the enum, labels and migration (drop and recreate the `CHECK`).
- [ ] **Step 4: Run** the same tests and confirm PASS.
- [ ] **Step 5: Commit** `feat: local_ordinance and public_land_closure restriction tags`.

## Phase P1: Formatting

### Task 8: Per-entity time zones

**Files:**
- Create: `apps/web/db/migrations/0026_time_zones.sql`, `apps/web/src/server/geo/time-zone.ts`, `time-zone.test.ts`
- Modify: `apps/web/src/app/club/[id]/page.tsx:25-26`, `apps/web/src/app/track/[token]/page.tsx:11`, `apps/web/src/layout/ride-message.ts:1`, `apps/web/src/server/rides/checkins.ts:178`, the club-ride and group-ride creation paths, and their tests

**Interfaces:**
- Produces: `timeZoneAt(lat: number, lon: number): string` (IANA name, offline, library choice is yours) in `time-zone.ts`; `time_zone text not null default 'Asia/Kolkata'` on `ride_checkin`, `group_ride` and the table behind club rides (find it in `0018_clubs.sql`); the formatters take the entity's `timeZone` instead of a constant.

- [ ] **Step 1: Write failing tests**: `timeZoneAt(12.97, 77.59) === "Asia/Kolkata"`; `timeZoneAt(51.5, -0.12) === "Europe/London"`; the check-in email for a London ride expecting 23:30 local renders "23:30" and the next-day date for a viewer in India; the ride-message helper no longer references `IST`.
- [ ] **Step 2: Run** `npm run test --workspace apps/web -- time-zone ride-message checkins`; confirm FAIL.
- [ ] **Step 3: Implement** the lookup, migration, creation paths (set the zone from the ride's start point) and the four formatters.
- [ ] **Step 4: Run** the web unit and DB suites; confirm PASS and `grep -rn "Asia/Kolkata" apps/web/src` shows only the default-zone fallback and the India config.
- [ ] **Step 5: Commit** `feat(web): rides and clubs carry their own time zone`.

### Task 9: Mobile locale, units and currency

**Files:**
- Create: `apps/mobile/src/lib/locale.ts`, `locale.test.ts`; `apps/mobile/src/store/region.ts` (home country, distance unit override)
- Modify: `apps/mobile/src/lib/units.ts`, `fuelCost.ts`, `daylight.ts`, `rideCard.ts`, `apps/mobile/app/passport.tsx`, `apps/mobile/src/features/RouteCheck.tsx`, `FuelSettingsSheet.tsx`, and their tests

**Interfaces:**
- Produces:
  - `deviceLocale(): string` and `deviceRegion(): string | null` (from `expo-localization`)
  - `homeCountry` store value defaulting to `deviceRegion()`, plus `distanceUnit: "km" | "mi"` defaulting from `countryConfig(homeCountry)?.distanceUnit ?? "km"` and user-overridable
  - `distanceKm(km: number): Quantity` in `units.ts` now converts to miles when the unit is `mi` (unit string `"mi"`); `speedKmh` likewise (`"mph"`); `elevationM` stays metric unless `mi`, then feet (`"ft"`)
  - `formatMoney(n: number, currency: string): string` replacing `formatRupees` (keep `formatRupees` as a thin call with `"INR"` until all call sites move, then delete it)
  - fuel settings label uses the currency symbol and per-litre wording from config

- [ ] **Step 1: Write failing tests**: with unit `mi`, `distanceKm(16.09)` is `{ value: "10", unit: "mi" }`; with `km` it matches today's output; `formatMoney(1234, "INR")` equals today's `formatRupees(1234)` output in an `en-IN` locale; `formatMoney(1234, "USD")` contains `$`; every date formatter uses `deviceLocale()` (test by injecting a locale).
- [ ] **Step 2: Run** `npm run test --workspace apps/mobile -- units fuelCost locale`; confirm FAIL.
- [ ] **Step 3: Implement** the locale helpers, store, unit conversion and `formatMoney`; replace each hard-coded `'en-IN'`.
- [ ] **Step 4: Run** the mobile tests and `npm run check:tokens`; confirm PASS. Add a unit toggle row to the existing settings screen using existing tokens.
- [ ] **Step 5: Commit** `feat(mobile): locale, km/mi and currency follow the rider's home country`.

### Task 10: Phone numbers by home country

**Files:**
- Modify: `apps/web/src/server/community/questions.ts:12` and its tests; the mobile contact-entry code that validates phones (`grep -rn phone apps/mobile/src`); `apps/web/package.json` and `apps/mobile/package.json` (add `libphonenumber-js`)

**Interfaces:**
- Produces: `normalizePhone(raw: string, defaultRegion: string = "IN"): string | null` (E.164 or null); a mobile `normalizePhone` with the same behaviour in `apps/mobile/src/lib/phone.ts`.

- [ ] **Step 1: Write failing tests**: all existing `normalizePhone` cases still return the same values with the default region; `normalizePhone("(415) 555-2671", "US") === "+14155552671"`; `normalizePhone("07911 123456", "GB") === "+447911123456"`; `normalizePhone("+919812345678", "US") === "+919812345678"`; garbage returns null.
- [ ] **Step 2: Run** `npm run test --workspace apps/web -- questions` and the mobile phone test; confirm FAIL.
- [ ] **Step 3: Implement** with `libphonenumber-js` (parse with default region, require `isValid()`).
- [ ] **Step 4: Run** both suites; confirm PASS.
- [ ] **Step 5: Commit** `feat: phone numbers parse by country`.

## Phase P2: Safety

### Task 11: Country-aware emergency number

**Files:**
- Create: `apps/mobile/assets/countries/boundaries.json` (simplified polygons for countries in `COUNTRY_CONFIGS`), `apps/mobile/src/lib/emergencyNumber.ts`, `emergencyNumber.test.ts`, `apps/web/scripts/build-mobile-boundaries.mts`
- Modify: `apps/mobile/src/lib/crashAlert.ts` (`EMERGENCY_NUMBER`, `callTargets`), `crashAlert.test.ts`, the SOS sheet (find with `grep -rn "SOS" apps/mobile/src apps/mobile/app`)

**Interfaces:**
- Consumes: `countryConfig` (Task 1), `deviceRegion` (Task 9).
- Produces:
  - `emergencyNumberFor(position: { lat: number; lon: number } | null, deviceRegion: string | null): { number: string; source: "position" | "device_region" | "fallback"; iso2: string | null; others: { label: string; number: string }[] }`
  - `callTargets(contacts, emergency: string): CallTarget[]` (second parameter replaces the constant); `EMERGENCY_NUMBER` is removed
  - the SOS sheet and the crash countdown show the number being dialled with an edit control (persisted for the session) and, when `source === "fallback"`, the text "Couldn't tell where you are, so this is the general emergency number."

- [ ] **Step 1: Write failing tests**: a position inside India returns `{ number: "112", source: "position", iso2: "IN" }`; null position with device region `IN` returns `source: "device_region"`; null position and null region returns `{ number: "112", source: "fallback" }`; a position in a country with no config returns `fallback`; `callTargets` uses the passed number in its label and phone; an edited number overrides the lookup.
- [ ] **Step 2: Run** `npm run test --workspace apps/mobile -- emergencyNumber crashAlert`; confirm FAIL.
- [ ] **Step 3: Implement** the script that exports simplified polygons (tolerance chosen so the JSON stays under 1 MB) from `country_boundary` for configured countries, the offline point-in-polygon lookup (no network), and the UI changes using existing tokens.
- [ ] **Step 4: Run** the mobile tests and `npm run check:tokens`; confirm PASS. Run the app and trigger the SOS sheet in airplane mode; confirm the number and edit control show.
- [ ] **Step 5: Commit** `feat(mobile): emergency number follows position, works offline, always editable`.

## Phase P3: Content, filter, moderation

### Task 12: Browsing country chip, filter and map centre

**Files:**
- Create: `apps/web/src/features/country/CountryChip.tsx` and test; `apps/mobile/src/ui/CountryChip.tsx` and test; `apps/web/src/server/geo/detect-country.ts` and test
- Modify: `apps/web/src/layout/place-from-headers.ts` (reuse the header parsing), list queries in `apps/web/src/server/queries/trails.ts` and `nearby.ts`, `apps/web/src/server/api/routes.ts` (optional `country` query parameter, additive), club and ride list queries, `apps/web/src/features/map/TrailMap.tsx:9`, `apps/mobile/src/ui/map/OsmMap.web.tsx`, `apps/mobile/src/ui/map/OsmMap.tsx`

**Interfaces:**
- Produces:
  - `detectCountry(h: { get(name: string): string | null }): string | null` (ISO2 from `x-vercel-ip-country`, upper-cased, null if absent or invalid)
  - web: browsing country stored in a cookie `mt_country`; lists filter by it when set and when the country is enabled; the chip shows "Showing: <Country> · change" and lists enabled countries
  - API `GET` list endpoints accept `country=<iso2>`; absent means all enabled countries (today's behaviour for India-only data)
  - maps: `INDIA_CENTER` is removed; centre order is rider position, browsing country bounding box (from `country_boundary` or config), then a world view (`[0, 20]`, zoom 1.5)
  - direct links to any trail, club or ride open regardless of the filter

- [ ] **Step 1: Write failing tests**: `detectCountry` with header `in` returns `"IN"`, with `xx1` or none returns null; a trail list with country `IN` excludes a trail in another enabled country; a direct trail URL in another country still renders; the chip lists only enabled countries; the map centre helper returns the position first, then the country box, then the world view.
- [ ] **Step 2: Run** `npm run test --workspace apps/web -- country detect-country trails` and the mobile chip test; confirm FAIL.
- [ ] **Step 3: Implement** detection, cookie, filters, chip on both platforms (existing tokens only) and the map centre helper.
- [ ] **Step 4: Run** the suites, then the dev server: confirm the chip appears on `/trails`, switching it filters, and `grep -rn INDIA_CENTER apps` returns nothing.
- [ ] **Step 5: Commit** `feat: browsing-country chip, filter and map centre`.

### Task 13: Gazetteer per country

**Files:**
- Modify: `apps/web/src/server/db/seed-places.ts`, `apps/web/scripts/db-seed-places.mts`, `apps/web/src/server/db/places.db.test.ts`, `ARCHITECTURE.md` (the gazetteer sentence)
- Create: `apps/web/data/places/README.md` (GeoNames CC-BY attribution and refresh steps)

**Interfaces:**
- Produces: `PlaceSeed` gains `country: string` (ISO2); `seedPlaces(sql, places)` resolves the state by `(country, state slug)` and still throws `Unknown state` for a missing one; existing India data is treated as `country: "IN"` by default; the app credits screen lists GeoNames attribution (find the existing credits copy and add it).

- [ ] **Step 1: Write failing tests**: seeding a place with `country: "IN"` works as today; two countries with the same state slug each get their own place; an unknown country or state throws `Unknown state`; a place search for an alternate name still finds India results.
- [ ] **Step 2: Run** `npm run test:db --workspace apps/web -- places` and confirm FAIL.
- [ ] **Step 3: Implement** the changes. Do not import GeoNames data for any country yet; only the loader and README ship.
- [ ] **Step 4: Run** the test and confirm PASS.
- [ ] **Step 5: Commit** `feat(web): gazetteer is country-aware`.

### Task 14: Country-scoped moderators

**Files:**
- Create: `apps/web/db/migrations/0027_moderator_country_scope.sql`
- Modify: the moderation decision and queue code in `apps/web/src/server/moderation/` (see `decisions.ts:178`), `apps/web/src/server/account/` role helpers, their tests

**Interfaces:**
- Consumes: existing `user_role (user_id, role, region_id)` where `region_id` becomes the country region for moderators.
- Produces: `canModerate(sql: Sql, userId: string, trailCountryId: string): Promise<boolean>` (true for `admin`; true for a `moderator` whose `region_id` equals the trail's country; false otherwise); the migration backfills every existing moderator's `region_id` to India; the queue lists only trails the moderator can act on; trails with `country_unmatched = true` appear to admins and to moderators of the nearest country.

- [ ] **Step 1: Write failing DB tests**: a moderator scoped to India can decide an India trail and cannot decide a trail in another country; an `admin` can decide both; existing moderator rows have `region_id` = India after migration; the queue omits other countries' trails for a scoped moderator; an unmatched trail shows for admins.
- [ ] **Step 2: Run** `npm run test:db --workspace apps/web -- moderation` and confirm FAIL.
- [ ] **Step 3: Implement** the migration, `canModerate`, and apply it in each decision entry point and the queue query.
- [ ] **Step 4: Run** the moderation and full DB suites; confirm PASS.
- [ ] **Step 5: Commit** `feat(web): moderators act within their country`.

### Task 15: Country-neutral copy and legal draft

**Files:**
- Modify: `packages/domain/src/legal.ts`, `packages/domain/src/legal.test.ts`, `PRODUCT.md:5`, mobile and web copy that says "India" (find with `grep -rIn "in India\|Proudly made in India\|outside India" apps packages --include=*.ts --include=*.tsx --exclude-dir=node_modules`; keep "Proudly made in India" if the owner still wants it, since it describes the maker)

**Interfaces:**
- Produces: About, Terms and Privacy describe a global directory; Privacy names GDPR / UK GDPR and CCPA rights alongside the existing India language and describes the existing account-deletion flow; Terms gain a jurisdiction section stating governing law as a clearly marked placeholder for the lawyer; `draft: true` on Terms and Privacy; `UPDATED` date set to the change date.

- [ ] **Step 1: Write failing tests** in `legal.test.ts`: About text no longer contains "trails in India"; Privacy mentions "GDPR" and "CCPA"; Terms has a heading "Governing law"; `legalDocs.terms.draft` and `legalDocs.privacy.draft` are `true`; every claim about data still matches the code (keep the existing consistency tests green).
- [ ] **Step 2: Run** `npm run test --workspace packages/domain -- legal` and confirm FAIL.
- [ ] **Step 3: Edit** the copy and `PRODUCT.md`; keep the writing plain and match the existing voice.
- [ ] **Step 4: Run** the domain, web and mobile suites plus `npm run typecheck`; confirm PASS.
- [ ] **Step 5: Commit** `docs: country-neutral copy and global legal draft`.

---

## Final verification (after Task 15)

- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run check:tokens` at the repo root, and `npm run test:db --workspace apps/web`, all green.
- [ ] On the dev server: old `/regions/<state>` URLs redirect; `/regions/in/<state>` renders; submitting a GPX in a disabled country is blocked with the "not open yet" message; the chip filters lists.
- [ ] In the app with airplane mode on: the SOS sheet shows the editable emergency number.
- [ ] Nothing besides India has `enabled = true`.
