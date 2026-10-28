# Myto app: parity with the website, bike catalogue, document photos, backup

Status: proposed, not approved. Nothing in this document is built yet.

## 1. What was asked

| # | Request | Section |
|---|---|---|
| 1 | Photo upload for Driving licence, PUC and Insurance, stored on the phone only | 5 |
| 2 | Export and import of the app's data, for switching phones | 6 |
| 3 | Preset bike images in "Your bike"; one image per bike; own upload still possible | 7 |
| 4 | Remove the "sample data" subtext about clubs | 9 |
| 5 | Clubs and every other website feature also in the app | 8 |
| 6 | "Your latest ride" shows the GPX route on OpenStreetMap tiles, like the trail page | 4 |
| 7 | No gap between a number and its unit ("37 km") in trails, rides and everywhere else | 3 |
| 8 | An extensive bike list; images in R2; the list editable in the database | 7 |
| 9 | Every change at component level, no hard-coded values, design tokens for everything | 2 |

Goal behind it: the app should be a complete companion, not a preview, and a rider's papers and bike should move with them.

Non-goals: moderation tools in the app, a bike marketplace, cloud sync of the documents (they stay on the phone by design), Android parity testing in this round.

## 2. Ground rules that apply to all of it

**Facts from the code today**
- The app has 45 hard-coded size, radius and opacity values and 145 hard-coded spacing numbers outside `src/theme/tokens.ts`. Colours are already enforced (`npm run check:colors`), sizes are not.
- Colours live in `packages/tokens/src/mobile.ts`; spacing, radius, type and font live in `apps/mobile/src/theme/tokens.ts`.
- Numbers with units are written by hand in about ten places (`${x} km`, `{km(...)} km`, `km/h`).
- The app types its API responses by hand (`src/api/types.ts`); the website defines them on the server.

**Rules, enforced rather than hoped for**
1. **Three tiers of tokens.** Primitives and colours in `packages/tokens` (shared with the website). Semantic tokens in `theme/tokens.ts`: `space`, `radius`, `type`, plus new `opacity`, `motion`, `media` (avatar, thumbnail, map and bike-card sizes) and `layout`. Component tokens live next to the component in `X.tokens.ts` and may only reference semantic tokens.
2. **`check:tokens`**, a new script next to `check:colors`. It fails on a numeric literal for `fontSize`, `padding*`, `margin*`, `gap`, `borderRadius`, `width`, `height`, `opacity` or an `rgba(...)` outside `theme/` and `*.tokens.ts` (0, 1 and percentages allowed). The 190 existing offenders go into a **ratchet baseline** file: the check fails if a file gets worse, so we migrate screen by screen without a big-bang rewrite, and new code is clean from the first commit.
3. **Screens compose components; they do not style.** Layout primitives `Stack` and `Inline` take token keys (`gap="3"`). New reusable components for this work: `Measure`, `Avatar`, `ClubCover`, `RideMap`, `BikeImage`, `BikePicker`, `DocumentPhotoField`, `PassphraseField`, `BackupSummary`. `PullQuote` (already built) gets its constants moved to `PullQuote.tokens.ts`.
4. **Native modules are batched into one rebuild.** Each of these needs a native build; we add them all together, once: `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-image-manipulator`, and (optional, section 5) `expo-local-authentication`.

## 3. Numbers and units: `Measure`

Cause of the gap: values are written as one string (`"37 km"`) in a monospaced font, where the space is as wide as a digit. It also looks inconsistent: sizes and styles differ between Dash, trail rows, You and the ride story.

Design:
- `lib/units.ts`: `formatDistance`, `formatSpeed`, `formatElevation`, `formatDuration`, each returning `{ value, unit }`. One place that decides decimals and Indian number grouping (it replaces `km()` in `lib/format.ts`).
- `Measure` component: `<Measure value unit size="data | dataLarge | live" tone />`. It renders the number and the unit as two `Text` elements in one `Inline` with baseline alignment and a single token-sized gap (`space.half`). The unit is one step smaller and muted. The accessibility label reads "37 kilometres".
- Replace every hand-written occurrence (the sites are in Dash, `rides`, `trail/[id]`, `you`, `story`, `RideBar`, `TrailRow` and `submit`). Text sentences with units inside them ("every 500 km") stay plain text, using a narrow no-break space so they cannot wrap between number and unit.
- Tests: formatting (rounding, grouping, 0, large values) and a render test that no stray space is present.

Open question (section 10, Q1): attached ("37km") or tight but separate ("37 km" with a small unit)? Default if you do not say: tight and separate.

## 4. "Your latest ride" with a real map

- New `RideMap` component wraps the existing `OsmMap` (native MapLibre / web OSM, already used on trail pages): `track` = the ride's points, fits the camera to the route, non-interactive (`scrollEnabled` off, touches pass through so the Dash still scrolls), height from `media.mapCard`.
- Replaces `RouteArt` on Dash and in the ride log and story. `RouteArt` stays for trails that have no route.
- Cost control: mount the native map lazily (only when on screen) and only for the newest ride; a ride with fewer than 2 points falls back to `RouteArt`.
- Risk: the public OpenStreetMap tile server's usage policy does not allow heavy production use. Before a public release the app needs its own tile source through `EXPO_PUBLIC_MAP_STYLE_URL` (the website already supports the same switch). Fine for testing.

## 5. Document photos, on the phone only

Scope: Driving licence (front and back), RC (registration), Insurance, PUC. One or more photos per document.

Design:
- `lib/localMedia/`: save, list, read and delete image files in the app's private documents directory (`expo-file-system`), after downscaling to 1600 px on the long side and JPEG 0.8 (`expo-image-manipulator`) so a backup stays small. Photos come from camera or library through `expo-image-picker` (already installed; the camera permission text is added to `app.json`).
- Metadata only (`{ id, docKind, side, width, height, addedAt }`) goes into the existing profile store. The file name is the id, never the user's file name.
- **Local only, provably:** `lib/localMedia` imports nothing from `api/`, and a unit test fails if it ever does. The upload helper used for trail photos cannot be called with a document file.
- UI: `DocumentPhotoField` (thumbnails, add, replace, delete) on the licence and vehicle screens; a full-screen viewer with pinch-zoom; the "Photos of documents are not supported yet" line is removed.
- "Erase all my data" also deletes the files.
- Optional (recommended): require Face ID / passcode to open a document photo (`expo-local-authentication`).
- Known limit: files in the app's documents directory are included in an iPhone backup (iCloud / computer) unless excluded; Expo has no setting for that. Decision Q4.

## 6. Export and import

What is exported: profile (licence, vehicle, contacts, medical), to-dos, rides with their tracks, document photos, chosen bike. **Never exported:** the sign-in token, offline trail packs (they can be downloaded again), the quote queue.

Format and safety:
- One file, `myto-backup-YYYY-MM-DD.myto`: a small JSON envelope `{ format, version, createdAt, ciphertext }`. The plaintext inside holds the data sections and the photos as base64.
- **Always encrypted** with a passphrase chosen at export (minimum length enforced). The file contains licence numbers, medical notes and document photos, and people will send it through WhatsApp, email or cloud drives. Key derivation scrypt, cipher XChaCha20-Poly1305, using the audited pure-JS `@noble/hashes` and `@noble/ciphers` packages (they run on Hermes; `expo-crypto` has no AES). We cannot recover a lost passphrase and the screen says so.
- A version number and one `migrate(vN → vN+1)` function per format change; a file from a newer app version is refused with a clear message.

Flow:
- You → **Export my data** → passphrase twice → file written to the cache → share sheet (`expo-sharing`: AirDrop, Files, any app).
- You → **Import data** → file picker (`expo-document-picker`) → passphrase → a summary ("14 rides, 3 documents, 2 contacts…", `BackupSummary`) → **Replace** or **Merge** (merge matches by id; on a clash the newer `updatedAt` wins) → applied atomically: photos are written to a temporary folder and swapped in only after everything validated; a failure leaves the phone untouched.
- Code in `lib/backup/{format,crypto,export,import,migrate}.ts`; screens `app/backup/export.tsx` and `import.tsx`.
- Tests: round trip, wrong passphrase, flipped byte (authentication fails), newer version, merge rules, an interrupted import.

## 7. Bike catalogue

### Data (migration `0021_bike_catalogue.sql`)
- `bike_make(id, slug, name, active)`.
- `bike_model(id, slug unique, make_id, model, variant null, category, engine_cc null, year_from null, year_to null, image_variants jsonb, image_updated_at, active, sort, created_at)`. `category` is one of commuter, retro, cruiser, adventure, scrambler, naked, sport, touring, offroad, scooter, electric. `slug` is the stable key and also the image file name.
- `rider_bike` gains `bike_model_id null references bike_model`. Display rule, "one image per bike": the rider's own photo if set, else the catalogue image, else the placeholder (`BikeImage` implements this once, for app and website). The name is copied from the model on selection and stays editable.
- Closed to the public roles like the other community tables; read through API/server queries only.

### Images in R2
- Stored as `public/bike/<slug>-<width>.webp` (400, 800, 1200), transparent background preserved; the public URL base is the existing `R2_PUBLIC_BASE_URL`.
- **Image spec** (matches the Scram 411 you made): transparent background, bike seen from its right side facing right, whole bike with equal margins, about 3:2, at least 1500 px wide, PNG or WebP, one file per bike named `<slug>.png`. Consistent framing matters more than resolution, because the picker shows them in a grid.
- Scripts in `apps/web/scripts`, same style as `upload-trail-media.mts`:
  - `bikes:import <csv>`: upserts makes and models by slug (idempotent). This is how new bikes are added.
  - `bikes:upload <folder>`: for each `<slug>.*` file, validates the slug exists, re-encodes with `sharp` (variants, metadata stripped), uploads to R2, writes `image_variants`. Safe to rerun.
  - `bikes:status`: lists models still without an image, grouped by make: your to-do list while you generate images.
- Phase 2 option: an admin page on the website (`/moderate/bikes`, admin role) to add or edit a model and upload its image, so no script is needed.

### API (public, cacheable)
- `GET /bikes?q=&make=&category=&page=`: models with `image` variants, by default only those that have an image. `?all=1` includes the rest.
- `GET /bikes/makes`: makes with model counts.
- `PUT /me/bike` accepts `bikeModelId`. Cache headers `s-maxage` so the list costs almost nothing; the app also stores the list with an ETag.

### In the app and on the website
- **Your bike** screen: a hero with the current image; **Choose a bike** opens `BikePicker` (search box, make chips, category filter, grid of cards, each card a `BikeImage`); **Upload my own photo** stays and overrides the preset. Selecting a preset pre-fills the name.
- Shown in the You tab, on club member rows (small), and in the website's account and club pages (the same `BikeImage` rule).
- The picker hides models without an image by default, so users never see empty cards while you add images slowly. When the image count is high enough we can show all.

### The list
`apps/web/data/bikes/catalogue.csv` has **363 models across 28 makes**: Royal Enfield, KTM, Husqvarna, Bajaj, TVS, Honda, Yamaha, Suzuki, Hero, Kawasaki, Triumph, Harley-Davidson, Jawa, Yezdi, BMW, Ducati, Benelli, Mahindra, Aprilia, Moto Morini, CFMoto, Keeway, Vespa, electric makes (Ola, Ather, Revolt, Ultraviolette, others) and a "Various" group of older classics. Columns: `slug, make, model, category, engine_cc, year_from, year_to`.
- The engine sizes and years are **indicative, from memory, not checked against manufacturers**. Please spot-check them before publishing; they are optional fields and easy to correct in the CSV.
- `apps/web/data/bikes/images/royal-enfield-scram-411.webp` is your first image, stored under its slug (it came through chat as WebP, 1538 × 1023 with transparency; if you still have the original PNG, use that).
- Suggested order for the rest: the 40 or so most common bikes first (Splendor Plus, Shine, Pulsar 150, Classic 350, Apache RTR 160, Activa 6G, Jupiter, Hunter 350, FZ-S, R15 V4, Duke 200/390, Himalayan 450, and so on), then by make.
- A consideration for you, not a blocker: the Scram illustration shows the Royal Enfield logo. Using brand names to identify bikes is normal, but illustrations that reproduce manufacturer logos are a trademark question if the app becomes commercial. Worth deciding on one house rule (keep logos, simplify them, or leave them off) before you generate hundreds.

## 8. Website features in the app

Audit of the website against the app (the website is the reference):

| Area | Website | App today | Needed API |
|---|---|---|---|
| Discover | search, filters (state, terrain, difficulty, access, suitable for, month, distance), near me, radius, sort, regions, map view | name search only | filter params on `/trails` exist; add `/regions`, `/suggest` |
| Trail page | access details, go/no-go, season, elevation profile, safety, photos, GPX, report, save | most of it; no go/no-go strip, elevation profile or season | none (data already returned) |
| Community on a trail | "I have ridden this", comments, questions to riders, riders list | none | `/trails/{slug}/ridden`, `/comments`, `/questions`, `/riders` |
| Rider profiles | public rider page | none | `/riders/{id}` |
| Clubs | create, join request with phone, withdraw, admin decide, members, roles, remove, leave, posts, replies, ride plans with going/maybe | read-only list and members | `POST /clubs`, join/withdraw/decide, leave, members admin, `/clubs/{id}/posts`, RSVP, hide |
| Account | name, privacy, bio, women-rider flag, first-sign-in declaration (18+, licence), contributions, questions inbox, connected devices | name only (read) | `/me/profile` PATCH, `/me/declaration`, `/me/contributions`, `/me/questions`, `/me/devices` |
| Submit a trail | six-step wizard with photos | uploads a recorded ride | step endpoints exist; add photos step |
| Static | about, responsible riding, privacy, terms, donate | none | open the website pages in the in-app browser |
| Moderation | queue, reports | none | **stays web-only** (decision Q3) |

Approach, so this does not become one huge change:
1. **Shared contract first.** Move the response types into `packages/domain` (or a new `packages/api-client`), generated from the same route table the server uses, so the website and the app cannot drift and the app stops hand-writing types.
2. **One vertical slice per feature**, each = API routes (thin wrappers over server functions that already exist and are tested) + app screens built from the new components + tests. The existing server functions in `server/community/*` already hold the rules (rate limits, women-only, phone retention); the API routes must not duplicate them.
3. **Order:** account and declaration (everything in the community needs the declaration) → clubs full → community on trails → discovery filters and regions → trail page extras → submit wizard parity.
4. Push notifications for join requests and replies are a separate follow-up (needs a push provider and a paid Apple account).

## 9. Subtext cleanup
- Dash: remove "Clubs are sample data" (`app/(tabs)/index.tsx:121`).
- Clubs tab: remove "Joining, posts and ride plans are on moto-trails.com for now" once clubs are complete (`clubs.tsx:65`).
- Documents: remove "Photos of documents are not supported yet" when section 5 lands.

## 10. Order of work, what runs in parallel, and what I need from you

| Phase | Content | Depends on |
|---|---|---|
| 0 Foundation | `check:tokens` plus baseline, new semantic tokens, `Stack`/`Inline`, `Measure` and unit fix everywhere, subtext removal, shared API types | nothing |
| 1 Latest-ride map | `RideMap` on Dash, rides and story | 0 |
| 2 Documents and backup | sections 5 and 6, **one native rebuild** | 0 |
| 3 Bike catalogue | migration, scripts, API, `BikePicker`, app and website | 0 |
| 4 Parity slices | section 8, in the order above | 0 and the shared types |

After phase 0, phases 1, 2 and 3 touch different files, so they can run side by side in separate sessions. Phase 4 is the largest and goes slice by slice. Each phase ends with typecheck, lint, `check:tokens`, unit tests, a device check, and a PR you review.

Calls I made (change any of them):
- Backups are always passphrase-encrypted.
- Bike picker hides models without an image.
- Moderation and the bike admin console stay on the website.
- Documents live in the app sandbox; backup inclusion decided in Q4.
- `check:tokens` starts as a ratchet, not a hard failure.

Questions only you can answer:
1. **Unit look:** "37km" attached, or "37 km" tight with a smaller unit? (default: tight, smaller unit)
2. **Backup contents:** include the document photos in the export, or only the data? (default: include)
3. **Moderation in the app:** confirm it stays web-only.
4. **Phone backups:** is it acceptable that document photos are part of the iPhone's own backup (Apple's encrypted backup), or must they be excluded? Excluding needs a small native change and means a restore from Apple's backup will not bring the photos back, which is what export/import is for.
5. **Brand logos on the bike illustrations:** keep, simplify, or leave off, before you generate the rest?
