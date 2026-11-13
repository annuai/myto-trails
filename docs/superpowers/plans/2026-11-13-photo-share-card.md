# Photo share card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Photo mode in the Share ride sheet: choose or take a photo, overlay the ride's route and stats, drag and pinch the overlay, share the picture or save the overlay alone as a transparent PNG.

**Architecture:** Pure layout and placement maths in `lib/photoCard.ts`; one SVG overlay component drawn on the card's 1080-wide canvas and scaled, composed over an `Image` for the photo; a composer component with pan and pinch (`react-native-gesture-handler`, `runOnJS(true)`); a thin picker wrapper; wiring into `ShareRideSheet`.

**Tech Stack:** Expo/React Native, `react-native-svg`, `react-native-view-shot`, `expo-image-picker`, `react-native-gesture-handler`, zustand, vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-photo-share-card-design.md`

## Global Constraints

- Tokens only: no raw spacing, colour or type values; run `npm run check:tokens` and `npm run check:colors` after UI work.
- Privacy: only the privacy-trimmed route from `buildRideCard`'s model; nothing is uploaded; `exif: false` on every pick; the saved picture is a fresh capture.
- No map tiles in Photo mode. Card mode behaves exactly as before.
- Sentence-case copy, no exclamation marks, no new screen or tab.
- A ride with no route shows stats only; zero selected stats uses `DEFAULT_STATS` (as `buildRideCard` does).
- Test only the affected files (`cd apps/mobile && npx vitest run <file>`); typecheck with `npx tsc --noEmit`.

## Review Focus

- A photo with an extreme aspect (very wide or very tall) still covers the card; no stretch.
- Overlay dragged to an edge or pinched to the limits stays fully inside the picture; format change after placement keeps it inside.
- A ride with no usable route (hidden or too short) shows stats only, no empty box.
- Persisted `companion.card` from an older build (no `layout` or `ink`) loads with defaults and does not crash.
- The transparent export has a real alpha channel (no background fill behind the overlay, `collapsable={false}`), and is cropped to the overlay.
- Dark ink on a dark photo and light ink on a bright one both keep the shadow so text is still readable.

---

### Task 1: Placement and layout maths

**Files:** Create `apps/mobile/src/lib/photoCard.ts`, `apps/mobile/src/lib/photoCard.test.ts`.

**Interfaces:**
- Consumes: `CardFormat`, `CARD_SIZE`, `CardModel` from `@/lib/rideCard`; `CARD_PAD` from `@/lib/cardMap`.
- Produces: `type PhotoLayout = 'bar' | 'corner'`; `type OverlayInk = 'light' | 'dark'`; `type Placement = { x: number; y: number; scale: number }` (x, y = overlay centre as fractions of the picture width and height); `PLACEMENT_LIMITS = { minScale: 0.6, maxScale: 2.2 } as const`; `overlayBox(layout: PhotoLayout, model: Pick<CardModel, 'stats' | 'route'>): { width: number; height: number }` (picture pixels at scale 1: bar width = 1080 − 2·CARD_PAD, height 300 with a route or 190 without; corner width 540, height = (route ? 400 : 0) + 130 per stat + 40); `defaultPlacement(layout: PhotoLayout, card: { width: number; height: number }, box: { width: number; height: number }): Placement` (bar: bottom-centred with margin CARD_PAD; corner: top-left with margin CARD_PAD); `clampPlacement(p: Placement, box, card): Placement` (scale clamped to limits, then the scaled box kept fully inside the card); `dragPlacement(p: Placement, dx: number, dy: number, box, card): Placement` (dx, dy in picture pixels, result clamped); `pinchPlacement(start: Placement, factor: number, box, card): Placement` (scale = start.scale × factor, clamped, centre kept, then clamped inside).

- [ ] **Step 1: Failing tests** in `photoCard.test.ts`: `clampPlacement({x:2,y:-1,scale:9}, box, card)` has scale 2.2 and a centre that keeps the scaled box inside (for the 1080×1920 card with the bar box, centre x is 0.5 when the scaled box is as wide as or wider than the card); `dragPlacement` moving 100 px right changes x by 100/1080 when not clamped and never leaves [0,1] bounds; `pinchPlacement(start, 0.1)` gives scale 0.6; `overlayBox('bar', {stats: [], route: null}).height` is 190 and with a route 300; `overlayBox('corner', {stats: 3 stats, route: null})` height is 3·130+40; `defaultPlacement('bar', card, box)` keeps the overlay inside with a CARD_PAD margin for all three formats; a box larger than the card at scale 1 is centred, not NaN.
- [ ] **Step 2: Run** `cd apps/mobile && npx vitest run src/lib/photoCard.test.ts` → FAIL.
- [ ] **Step 3: Implement** the signatures above in `photoCard.ts` (pure, no React).
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(mobile): photo card placement maths`.

### Task 2: Photo picker and remembered choices

**Files:** Create `apps/mobile/src/lib/pickPhoto.ts`, `apps/mobile/src/lib/pickPhoto.test.ts`. Modify `apps/mobile/src/store/companion.ts` (+ its test file if one exists, else add `apps/mobile/src/store/companionCard.test.ts`).

**Interfaces:**
- Consumes: `CardFormat`, `CARD_SIZE`; `PhotoLayout`, `OverlayInk` (Task 1); `expo-image-picker`.
- Produces: `type PickedPhoto = { uri: string; width: number; height: number }`; `pickCardPhoto(source: 'library' | 'camera', format: CardFormat): Promise<{ ok: true; photo: PickedPhoto } | { ok: false; reason: 'cancelled' | 'denied' | 'failed'; message: string }>` (system crop on with aspect = the format's width/height, `quality: 1`, `exif: false`, `mediaTypes: ['images']`; the camera asks for permission first; `message` is a plain sentence, empty for `cancelled`); `companion.card` becomes `{ format: CardFormat; stats: CardStat[]; layout: PhotoLayout; ink: OverlayInk }` with defaults `layout: 'bar'`, `ink: 'light'`, in the initial state and `wipe`; a persisted `card` without `layout`/`ink` loads with those defaults (merge in the persist config, not at each read).

- [ ] **Step 1: Failing tests**: with `expo-image-picker` mocked, `pickCardPhoto('library', 'story')` calls `launchImageLibraryAsync` with `exif: false`, `allowsEditing: true`, `aspect: [1080, 1920]` and returns the asset's uri, width, height; a cancelled result gives `reason: 'cancelled'`; camera permission denied gives `reason: 'denied'` with a message and never launches the camera; a thrown error gives `reason: 'failed'`. Store: an old persisted `card: { format: 'post', stats: ['time'] }` rehydrates to `{ format: 'post', stats: ['time'], layout: 'bar', ink: 'light' }`; `wipe()` restores defaults.
- [ ] **Step 2: Run** `npx vitest run src/lib/pickPhoto.test.ts src/store` → FAIL.
- [ ] **Step 3: Implement** both; follow `lib/uploadImage.ts` and `lib/useJournalActions.ts` for picker usage and the persist `merge` pattern used elsewhere in `store/`.
- [ ] **Step 4: Run** the same → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(mobile): photo picker and remembered overlay choices`.

### Task 3: The overlay and the photo card

**Files:** Create `apps/mobile/src/ui/PhotoOverlay.tsx`, `apps/mobile/src/ui/PhotoCard.tsx`, `apps/mobile/src/ui/PhotoCard.tokens.ts`.

**Interfaces:**
- Consumes: `CardModel` (`lib/rideCard`), `overlayBox`, `Placement`, `PhotoLayout`, `OverlayInk` (Task 1), `PickedPhoto` (Task 2); `ui/RideCard.tsx` as the pattern (one SVG on the 1080-wide canvas scaled to `width`; `Value` runs of text with Geist fonts) and `LOGO_PATHS` for the Myto mark.
- Produces: `PhotoOverlay = forwardRef<View, { model: CardModel; layout: PhotoLayout; ink: OverlayInk; width: number }>`: draws the privacy-trimmed route polyline (no tiles; omitted when `model.route` is null), the stats (`bar`: a row; `corner`: a stacked list) and a small Myto mark, on a transparent background, at `overlayBox(layout, model)` scaled so its width is `width`; text and route have a soft shadow (token values), `light` ink is white-ish, `dark` ink is near-black (from `PhotoCard.tokens.ts`, no raw colours in the component); `collapsable={false}`. `PhotoCard = forwardRef<View, { model: CardModel; width: number; photo: PickedPhoto; layout: PhotoLayout; ink: OverlayInk; placement: Placement }>`: a View of the card's aspect (`width * model.height / model.width`) with the photo `resizeMode="cover"` filling it and the `PhotoOverlay` placed by `placement` (centre fractions, scaled), `overflow: 'hidden'`, `collapsable={false}`.

- [ ] **Step 1: Write a render smoke test is not possible (native); instead add pure token tests** in `apps/mobile/src/ui/PhotoCard.test.ts`: `PhotoCard.tokens.ts` exports ink colours for both inks and a shadow spec; the two inks differ.
- [ ] **Step 2: Run** `npx vitest run src/ui/PhotoCard.test.ts` → FAIL.
- [ ] **Step 3: Implement** the two components and tokens, reusing the stat text drawing approach of `RideCard.tsx` (extract nothing from it; copy only the small `Value` helper if needed, or import it if exported).
- [ ] **Step 4: Run** the test, `npx tsc --noEmit`, and from the repo root `npm run check:tokens && npm run check:colors`.
- [ ] **Step 5: Commit** `feat(mobile): photo overlay and photo card`.

### Task 4: The composer with drag and pinch, and a dev screen

**Files:** Create `apps/mobile/src/features/share/PhotoComposer.tsx`, `apps/mobile/app/dev/photo-card.tsx`. Look at `apps/mobile/app/dev/motion.tsx` for how a dev-only screen is registered and gated.

**Interfaces:**
- Consumes: `PhotoCard`, `PhotoOverlay` (Task 3); `dragPlacement`, `pinchPlacement`, `overlayBox`, `Placement` (Task 1).
- Produces: `PhotoComposer({ model, photo, layout, ink, placement, onPlacement, width }: { …; onPlacement: (p: Placement) => void; width: number })`: renders `PhotoCard` at `width` wrapped in a `GestureDetector` with `Gesture.Simultaneous(Gesture.Pan().runOnJS(true), Gesture.Pinch().runOnJS(true))` (follow `ui/map/OsmMap.tsx`); on a pan change convert the screen delta to picture pixels (`delta * model.width / width`) and call `onPlacement(dragPlacement(...))`; on a pinch change call `pinchPlacement(startPlacement, e.scale, …)` using the placement at gesture start; the overlay stays inside the picture at all times. The dev screen `app/dev/photo-card.tsx` (reachable only in dev, same gating as `/dev/motion`) shows the composer with the bundled `assets/rider-on-ridge.jpg` photo and a hard-coded sample ride (a few `LatLng` points, 84 km, 1 h 30, 71 km/h), with chips for layout and ink.

- [ ] **Step 1: Failing test**: none for the gestures (native); instead extract the one piece of logic worth testing, `toPictureDelta(deltaPx: number, pictureWidth: number, cardWidth: number): number`, into `lib/photoCard.ts`, with a test in `photoCard.test.ts` (`toPictureDelta(50, 220, 1080)` is `50 * 1080 / 220`).
- [ ] **Step 2: Run** `npx vitest run src/lib/photoCard.test.ts` → FAIL, then implement `toPictureDelta`, PASS.
- [ ] **Step 3: Implement** `PhotoComposer` and the dev screen; confirm the dev screen is excluded from production builds the same way `/dev/motion` is.
- [ ] **Step 4: Run** `npx tsc --noEmit` and `npm run check:tokens` from the root; then start the web preview (`mobile-web` launch config, see `.claude/launch.json`) and open `/dev/photo-card` to look at the composer; report what you saw (drag with the mouse; pinch cannot be tested on the web).
- [ ] **Step 5: Commit** `feat(mobile): photo composer with drag and pinch`.

### Task 5: Photo mode in the Share ride sheet, and docs

**Files:** Modify `apps/mobile/src/features/ShareRideSheet.tsx`; modify the owning doc (find with `grep -rn "Ride card" docs --include='*.md'`, expect `docs/superpowers/specs/2026-10-28-ride-companion-features-design.md` and `docs/16-myto-app-ui.md`).

**Interfaces:**
- Consumes: everything above; existing `shareCard(view)` from `lib/shareCard.ts`; `useCompanion` (`card.layout`, `card.ink` via `setCard`).
- Produces (UI): a `Card | Photo` pair of `ChoiceChip`s at the top (local state, defaults to Card). Photo mode shows: with no photo, two buttons "Choose a photo" and "Take a photo" (errors from `pickCardPhoto` shown as the sheet's existing red message, `cancelled` silent); with a photo, the `PhotoComposer` (width `PREVIEW_W` from the sheet or a little larger), chips for layout (`Bar`, `Corner`) and ink (`Light text`, `Dark text`), the existing format chips and stat chips and Hide route, a "Share picture" button (captures an off-screen full-size `PhotoCard` ref through `shareCard`), a "Save overlay only" soft button (captures an off-screen full-size `PhotoOverlay` ref on a transparent background through `shareCard`) and "Change photo". Changing the layout resets placement to `defaultPlacement`; changing format keeps the placement (clamped). The "Preparing the map…" gate applies only in Card mode. A caption "Your photo stays on your phone." and the existing privacy caption remain. The off-screen full-size views are positioned like the existing one (`left: -full.width - 50`) and only mounted in Photo mode with a photo. Docs: 3 to 5 lines total in the owning docs describing Photo mode and the transparent overlay (decision and why, no walkthrough).

- [ ] **Step 1: Failing test** for the one extractable rule: in `photoCard.test.ts` add `overlayBox`-independent helper `placementAfterFormatChange(p: Placement, box, nextCard): Placement` (clamps into the new card) and test it with a bar overlay moving from `square` to `story`; implement it in `lib/photoCard.ts`.
- [ ] **Step 2: Run** `npx vitest run src/lib/photoCard.test.ts` → FAIL, implement, PASS.
- [ ] **Step 3: Implement** the sheet changes; keep Card mode's behaviour and tests untouched (`npx vitest run src/lib/rideCard.test.ts src/lib/cardMap.test.ts` still pass).
- [ ] **Step 4: Run** `cd apps/mobile && npx vitest run src/lib src/store src/ui`, `npx tsc --noEmit`, then from the repo root `npm run check:tokens`, `npm run check:colors`, `npm run lint`, `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(mobile): photo mode in the share ride sheet`.
