# Going global: Moto Trails beyond India

Status: draft for approval. Date: 2026-10-30.

## Intent

Moto Trails lists trails, rides and clubs only in India. We want a rider anywhere in the world to browse trails, submit them, and use the ride companion safely. The product promise stays the same: a trustworthy, moderated answer to "may I ride it, can I ride it now, and how do we know."

Success: a new country can be opened by adding data (a row and its states), not by changing code, and a rider in that country sees the right units, emergency number, phone format, time zone and legal text.

## Goals

- Countries are data. Opening one means inserting rows and flipping a flag.
- Country is a filter on what a rider sees, not an identity they must declare.
- Everything safety-related (emergency number, crash alert, check-in times) is correct for where the rider actually is.
- Existing India URLs keep working and keep their search ranking.
- Everything stays inside the free-tier constraint (Vercel Hobby, Supabase free, R2).

## Non-goals

- Translating the app. Launch in English; structure strings so translation can follow.
- Real routing, paid map tiles, paid geocoding.
- Opening every country at once.

## Anti-goals (a failure even if it works)

- Asking every new user to pick a country before they see anything.
- A wrong emergency number shown in a crash.
- Trails listed in a country with nobody able to judge whether riding there is allowed.
- Breaking existing India links.

## Constraints

- Distances and elevations stay metric in the database; units are a display choice.
- Slugs stay ASCII.
- The database is Supabase (not local Postgres); tiles and media stay on R2 or a free hosted style.
- Terms and Privacy text needs a lawyer's review before any non-India country is opened (`legal.ts` already has a `draft` flag for this).

## Decisions made (the owner approved the hybrid approach in chat)

1. **Country choice is hybrid.** Detect automatically (web: `x-vercel-ip-country` header, already read in `place-from-headers.ts`; mobile: GPS, then device region). Show a chip "Showing: India · change". The rider can override it. It is persisted per device, and on the profile when signed in.
2. **Two separate settings.** *Browsing country* (a filter, may change when travelling). *Home country* (units, phone format, currency; defaults from device locale).
3. **The emergency number follows current GPS position**, not the home country, and the rider can edit it.
4. **Countries are gated by a database flag** (`enabled`). Submissions are accepted only in enabled countries; others show "coming soon, notify me".

## Design

### Data model (new migration after `0023`)

- `region`: add `iso2 text` (ISO 3166-1 alpha-2, unique where `kind = 'country'`), `enabled boolean not null default false`, and a per-country config (`config jsonb`: emergency number, dial code, currency, distance unit, default time zone, state label such as "state"/"province"/"county"). Seed India as `iso2 = 'IN'`, `enabled = true`.
- Keep the `state` and `district` kinds as generic admin levels 1 and 2. Do not rename; label them per country in the UI.
- `trail`: add `country_id uuid references region`, backfilled to India, filled for new trails by point-in-polygon against a `country_boundary` table loaded from Natural Earth admin-0 (public domain). The same table replaces the "outside India" GPX check.
- Replace the two India bounding-box `CHECK`s (`trail_revision.start_point`, `place.point`) with a plain valid-lat/lon check.
- `place`: unchanged shape; seeded per enabled country from GeoNames (CC-BY, populated places above a threshold). Attribution goes in the app's credits.
- `access_assessment.restrictions`: widen the allowed set beyond `forest_dept` (for example `national_park`, `public_land_closure`, `local_ordinance`) and keep `forest_dept`. Meaning of each value is documented per country by moderators.
- Ride, club and check-in tables: add `time_zone text` (IANA), derived from the start point with an offline lookup at creation.
- Moderation: a moderator is scoped to one or more countries; they can only decide trails in those countries.

### URLs and SEO

- New routes: `/regions/[country]/[state]/[district]`. Country segment is the lower-case ISO code.
- 301 redirects from `/regions/[state]/...` to `/regions/in/[state]/...`. Update `sitemap`, `seo.ts` (`addressCountry` from the trail's country), and canonical tags.

### Formatting and units (web and mobile)

- Replace hard-coded `en-IN` with the device or browser locale via `Intl`.
- Replace `formatRupees` with `Intl.NumberFormat` using the home country's currency; fuel price field label follows.
- Add a km/mi display toggle defaulting from home country.
- Replace every `Asia/Kolkata` with the entity's stored time zone (club page, track page, ride messages, check-in emails).
- Replace the `+91` regex with `libphonenumber-js` using the home country as the default region.

### Safety

- Per-country emergency number comes from the country config, chosen by the country containing the rider's current position. The crash alert and SOS sheet show the number they will dial and let the rider change it.
- Fall back to `112` only when position and device region are both unknown, and say so.

### Maps

- Remove `INDIA_CENTER`; centre on the rider's position, else the browsing country's bounding box, else a world view.
- No planet tile file (about 120 GB, over the free tier). Use the current free raster or hosted style for low traffic, and per-country `pmtiles` extracts as countries open (follow `docs/runbooks/self-hosted-map-tiles.md`).

### Content, legal and moderation

- Rewrite `legal.ts` copy to be country-neutral where possible, with a jurisdiction section and GDPR/UK GDPR/CCPA language; mark `draft: true` until reviewed.
- Change "trails in India" copy in About, PRODUCT.md and app text.
- Opening a country requires: a moderator scoped to it, seeded states, gazetteer, tile coverage, and at least a handful of seed trails.

## Calls made by the builder check (author's calls, change any you disagree with)

- **Restrictions are informational tags.** The "may I ride it" verdict comes from `access_class`, not from `restrictions`. `protected_area` already covers national parks, so no `national_park` value is added. Add only `local_ordinance` and `public_land_closure`, with labels in `labels.ts`, the domain enum, the `CHECK`, and test fixtures updated together.
- **Mobile compatibility.** The apps talk to `/api/v1` (`docs/14-platform-contract.md`: additive changes within v1). Schema changes stay behind the API; new fields (`country`, `iso2`) are additive and no v2 or DB shims are needed.
- **Emergency number offline.** Bundle simplified country polygons and the per-country numbers in the app so the lookup works with no signal. Near a border, or when position is unknown, the SOS sheet shows the number with an edit control and says how it was chosen. The country `config` holds one primary number plus an optional list of others (ambulance, mountain rescue). The owner confirms a country's numbers before enabling it.
- **Browsing country scope.** It filters trail, club and ride lists, search and the map. A direct link to anything always opens, whatever the filter says.
- **Build scope.** P0 to P3 now, with every country except India disabled. P4 is a later task.
- **Moderator scope.** Existing moderators get India scope by default. `admin` covers all countries.

## Phasing (each phase ships on its own)

- **P0 (invisible):** schema changes, country config, backfill, new URLs with redirects.
- **P1 (formatting):** locale, units, currency, per-entity time zones, phone parsing.
- **P2 (safety):** country-aware emergency number, crash alert, SOS.
- **P3 (content):** gazetteer loader, legal copy, restrictions vocabulary, scoped moderators, copy changes.
- **P4 (launch):** enable neighbouring countries first (Nepal, Bhutan, Sri Lanka are the owner's to confirm), one at a time.

## Pros and cons

Country selection:

| | Ask the user | Auto-detect only | Hybrid (chosen) |
|---|---|---|---|
| Pros | Always right for them | No friction | No friction; one tap to fix |
| Cons | Extra step, drop-off | Wrong for travellers and VPNs; no fix | A small extra piece of UI |

Going global:

| Pros | Cons |
|---|---|
| Larger audience and SEO surface | Moderation cannot judge legality in countries it doesn't know |
| `region` hierarchy and PostGIS already fit | Legal exposure differs by country (GDPR, CCPA, land-access law) |
| Detection and formatting are free | Each new country starts empty |
| Gating by a flag allows safe expansion | Wrong emergency number is a safety bug |
| | Free-tier limits: tiles, DB latency far from the Supabase region, egress |

## Left to the builder

- Exact column names, migration split, and the offline time-zone library.
- Whether to build the country chip as a shared component or per platform.
- The point-in-polygon implementation (trigger or application code).
- Test strategy; existing `*.db.test.ts` suites show the pattern.

## Open items for the owner

1. Staged rollout (recommended) or all countries at once?
2. Which countries open first?
3. Who reviews Terms and Privacy for non-India markets?
4. English-only at launch acceptable?

5. Disputed borders: decided by the owner. India's official boundary (Survey of India) is the source for India's outline in `country_boundary`; Natural Earth supplies every other country. Existing India trails stay in India by blanket backfill. Builder sources and licence-checks the official boundary data; a submission matching no polygon (sea, gap) is flagged for a moderator, not rejected.

## Not yet verified

This design comes from a grep of the repo, not a full audit. Not checked: how mobile place search is implemented, whether club and ride tables already store a time zone, and Supabase's current region (affects latency for distant users).

## Implementation decisions (made while building, 2026-10-30)

- **Boundaries:** Natural Earth's India point-of-view edition (public domain) supplies every outline, so India's outline
  matches its official map. The Survey of India's own data was not sourced; swap it in later if the owner obtains a
  redistributable copy (`apps/web/data/boundaries/README.md`).
- **Trail country:** a trail's `country_id` follows its state's country (trigger). Outlines decide whether a submission
  is accepted and flag unplaceable points; they do not reassign a trail.
- **Coming soon:** all 236 other countries are seeded disabled, with the usual English names. `enabled` is only ever
  changed on purpose, in the database. Opening one also needs its config (emergency number, currency, ...) in
  `COUNTRY_CONFIGS` and a scoped moderator.
- **Notify me:** one email per country is stored with a plain consent line. No sender was built; the list is for the owner.
- **Time zones:** the client sends its IANA zone for check-ins and club ride plans (no offline lookup library). Mobile club
  ride plans still compose India time.
- **Phones:** libphonenumber validity, so valid landlines are accepted too.
- **Emergency numbers:** only India is configured. Elsewhere the SOS sheet says the number isn't known and asks the rider
  to check it; the rider can always edit it.
- **Moderators:** granted per country (`grantRole(..., country)`, India by default); one granted no country acts nowhere.
- **Redirects:** old `/regions/<state>` URLs redirect permanently (HTTP 308) to `/regions/india/<state>`.
- **Clubs:** not filtered by country yet; clubs carry no country.
- **Not run:** the `*.db.test.ts` suites (they need a throwaway local database); migrations were dry-run in a rolled-back
  transaction on Supabase and then applied.
