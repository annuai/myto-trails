# Country boundaries

`countries.geojson` holds one simplified outline per country (ISO 3166-1 alpha-2 in `properties.iso2`). It decides which
country a trail or ride is in, and whether Moto Trails is open there yet (see `region.enabled`).

**Source:** Natural Earth 1:10m Admin 0 Countries, **India point-of-view** edition (`ne_10m_admin_0_countries_ind`),
https://www.naturalearthdata.com/ (nvkelso/natural-earth-vector). Natural Earth is in the public domain, so it may be
redistributed here without conditions. The India edition draws India's boundary as India's own official map does, so
India's outline here matches the boundary shown by the Survey of India. Other countries follow Natural Earth's de facto lines.
Retrieved 2026-10-30. ISO codes come from `ISO_A2_EH` (it fixes the `-99` codes Natural Earth gives France and Norway).

**Processing:** `scripts/build-boundaries.mjs` simplifies outlines to about 1 km and drops islets under about 4 km².
Because of that a point very close to a coastline can fall in "no country"; such trails are flagged for a moderator, never rejected.

**Refresh:** download the `_ind` GeoJSON, save it as `ne10_ind.geojson` next to the script, run
`node scripts/build-boundaries.mjs` (it merges duplicate `iso2` features), merge duplicate `iso2` features, and run `npm run db:seed:boundaries -w @moto-trails/web`.
