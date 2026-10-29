# Self-hosted map tiles (for offline maps)

Status: **not needed for now.** The app's maps and offline downloads use OpenFreeMap (free, no key; offline downloads allowed up to 3,000 tiles or 50 MB each), see `apps/mobile/src/ui/map/style.ts`. This runbook stays as the fallback if OpenFreeMap is ever unavailable or its terms change: set `EXPO_PUBLIC_MAP_STYLE_URL` to the style it describes.

Original plan, not run: Nothing here has been deployed or tested; steps marked *(unverified)* are from the tools' documentation and need checking on the first real try.

## Why
The phone's offline map download (MapLibre `OfflineManager`) cannot save tiles from a single PMTiles file. It needs a normal tile service at `https://…/{z}/{x}/{y}`. OpenStreetMap's own servers forbid bulk downloads. So we serve our own: the map data sits in our R2 bucket as one PMTiles file, and a small Cloudflare Worker turns it into `{z}/{x}/{y}` tiles.

The app turns offline maps on by itself as soon as `EXPO_PUBLIC_MAP_STYLE_URL` is set (`apps/mobile/src/lib/offlineTiles.ts`, `apps/mobile/src/ui/map/style.ts`). Until then the "Save for offline" button saves trail details, access and route only.

## Parts
1. **A map file for India** (`india.pmtiles`, a few GB at most). Cut it from the Protomaps daily planet build with the `pmtiles extract` command and a bounding box around India (about 68,6,98,36). *(unverified: check the current command and the planet build's address on protomaps.com)*
2. **R2 bucket.** Upload it to a bucket separate from trail photos, with no public listing. Range requests must work.
3. **A Worker** that answers `/{z}/{x}/{y}.mvt` by reading the file from R2 with the `pmtiles` npm package. Protomaps publishes a ready Cloudflare Worker for this. *(unverified: use its current template rather than copying from here)* Add a cache header so each tile is cached at Cloudflare's edge.
4. **A style file** (JSON) that points at the Worker's tiles. Protomaps publishes a basemap style generator (`@protomaps/basemaps`). The style also needs fonts (glyphs) and, if icons are used, a sprite. Host both next to the style, since the style's `glyphs` address must be a normal URL. *(unverified)*
5. **The app setting.** Set `EXPO_PUBLIC_MAP_STYLE_URL` to the style file's address, for the mobile app and, if wanted, the website (`apps/web/src/features/map/osm-style.ts` already reads a style address).

## Checks before relying on it
- Open the style URL in the app's web build; the map should draw with no calls to `tile.openstreetmap.org`.
- On a phone, download a trail's offline pack and turn on airplane mode; the map must still draw around the trail.
- Look at the Worker's request count and R2 reads after a day, to confirm the edge cache is working.
- Keep the attribution: "© OpenStreetMap contributors" and Protomaps, as their terms ask.

## Costs
R2 storage is cheap and R2 has no egress fees. Workers have a free daily allowance and then a small per-request price. *(unverified: check Cloudflare's current pricing)*

## Not decided
Who builds it, and which minimum and maximum zoom levels the download should use. The app currently asks for zoom 8 to 15 around the route with 3 km of margin.
