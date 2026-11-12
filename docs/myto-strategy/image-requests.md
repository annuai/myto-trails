# Image requests (one batch)

Written 2026-11-12 for the strategy deck ([presentation/](presentation/README.md)). Every slide that wants an image either reuses an existing asset (section 1) or shows a visible **IMAGE PENDING <asset id>** placeholder until a file from this list lands in `presentation/assets/pending/`. No unrelated stand-in imagery is ever used.

## 0. Visual direction to match (from `docs/08`, `apps/mobile/assets/fixit/README.md`, and looking at the existing art)

The existing Myto illustrations are **flat vector shapes with a fine, even halftone-dot texture on a pale warm cream ground with faint paper grain.** Secondary shapes are slate blue-grey, the bike and tools are dark charcoal, dirt and rubber highlights are sand. The scenes are quiet and wide, with generous empty sky, long winding dirt roads, mountains fading into haze, tiny rider figures. **Exactly one small brick-red accent (#b0442e)** appears per picture, marking the thing that matters (a map pin, a signal flag, a hazard). The rider is always the same: black full-face helmet, dark jacket, adventure-touring motorcycle with luggage. No faces, no text, no logos. Reference files to attach to every generation:

- `apps/mobile/assets/onboarding/welcome.webp`, `maps.webp`, `group.webp`, `safety.webp` (style and rider)
- `apps/mobile/assets/rider-on-ridge.jpg` and `video/public/img/ending.webp` (wide composition and sky)
- `apps/mobile/assets/bike/adventure-body.webp` (the bike: charcoal body, cream panniers and screen, orange-red tank flash, transparent background)

Palette to quote in prompts: paper `#f2ede8`, ink `#1a1a1a`, slate `#6b7a86` (approximate, sampled by eye), sand `#d9c7a3` (approximate), accent `#b0442e`. Touring and adventure motorcycles only. Indian settings (Western Ghats, Karnataka plains, Himalaya) where a setting is needed.

Common negative prompt for every request: **no text, no letters, no numbers, no logos, no brand marks, no watermarks, no faces visible, no real brand or model markings, no fabricated products, no fake app screenshots or phone UI, no sport bikes or racing, no speed blur, no people other than described, no photorealism, no gradients, no neon, no 3D render look.**

## 1. Inventory: existing assets reused (nothing to request)

| Asset | Path (in repo) | Copied to deck as | Used on |
|---|---|---|---|
| Wide Himalayan ridge, rider climbing, prayer flags (2000x667) | `video/public/img/ending.webp` | `assets/img/ending.webp` | Cover |
| Rider on ridge, wide (2170x725) | `apps/mobile/assets/rider-on-ridge.webp` | `assets/img/rider-on-ridge.webp` | Vision |
| Onboarding: group of three riders at a tea-estate viewpoint with phone | `apps/mobile/assets/onboarding/group.webp` | `assets/img/group.webp` | Audience, Group rides, Go-to-market |
| Onboarding: winding road, map-line and red pin | `apps/mobile/assets/onboarding/maps.webp` | `assets/img/maps.webp` | Solution (Explore), Roadmap |
| Onboarding: lake causeway, red track line | `apps/mobile/assets/onboarding/record.webp` | `assets/img/record.webp` | Solution (Ride) |
| Onboarding: rider on trail, helper stopped with red signal | `apps/mobile/assets/onboarding/safety.webp` | `assets/img/safety.webp` | Problem |
| Onboarding: globe over hills, India pin | `apps/mobile/assets/onboarding/setup.webp` | `assets/img/setup.webp` | Opportunity |
| Onboarding: rider, snow range, red sun ring | `apps/mobile/assets/onboarding/welcome.webp` | `assets/img/welcome.webp` | Long-term vision |
| Onboarding: forest trail, river crossing, orange marker | `apps/mobile/assets/onboarding/trails.webp` | `assets/img/trails.webp` | Contribution engine |
| Adventure bike with rider and panniers, transparent | `apps/mobile/assets/bike/adventure-body.webp` | `assets/img/adventure-body.webp` | Shop (as category art), Equip |
| Myto logo (SVG) | `apps/mobile/assets/myto-logo.svg` | `assets/img/myto-logo.svg` | Cover, footer |
| Real app frames (screen recordings of the test build, test data) | `video/public/capture/*.mp4` (frames extracted with ffmpeg) | `assets/shots/*.jpg` | Product, Group rides, Solution |
| Fonts: Michroma, Geist, Geist Mono | `video/public/fonts/*.ttf` | `assets/fonts/` | Whole deck |

Also exist and were deliberately **not** used: trail photographs under `apps/web/public/photos/*` (contributor photos credited to a named rider; reusing them in a pitch needs their credit and consent), the 14 bike catalogue images under `apps/web/data/bikes/images` (third-party model imagery, rights unverified), the Moto Trails web hero photo-art (a near twin of the onboarding set), and `.reference/myto` (reference copy of another site). The Fix-it illustration set (18 of which 15 are uploaded to R2, 3 pending) is its own pipeline and is not requested here.

**Screenshots, not generated.** Two screens cannot be shown until they are verified in the build: the Shop discovery layer and the achievements/Trailmarks/challenges screens. Capture them from a real device or simulator, not an image model:

| Id | File | Slide | What |
|---|---|---|---|
| SHOT-01 | `pending/shot-shop-discovery.jpg` | Shop | Shop discovery screen of the verified build, with the "external store" label visible |
| SHOT-02 | `pending/shot-trailmarks.jpg` | Engagement | Trailmarks and a challenge screen of the verified build |

Phone aspect is 720x1454 (about 1:2.02), as the existing frames.

## 2. Essential (needed before the deck leaves preview)

### E01: contribution evidence

| Field | Value |
|---|---|
| Asset ID | IMG-E01 |
| Filename | `e01-contribution-evidence.webp` |
| Slide | 8, Contribution engine |
| Purpose | Shows a rider verifying a trail condition in person: the evidence moment behind every trail's status |
| Aspect / size | 3:2, 2400x1600 px (export WebP, under 400 KB) |
| Transparency | No, cream background |
| Target path | `docs/myto-strategy/presentation/assets/pending/e01-contribution-evidence.webp` |

Prompt (copy as is):

> Use the attached images as the exact style reference. Flat vector illustration with a fine even halftone dot texture on a pale warm cream ground with faint paper grain. Subject: a dirt track in the Western Ghats of Karnataka crossing a shallow stream; an adventure touring motorcycle with cream panniers is parked at the near bank on its side stand, the rider in a black full-face helmet and dark jacket, seen from behind and the side, crouched at the water's edge holding a phone out to photograph the crossing and the track beyond. Composition: low three-quarter view, bike and rider in the lower left third, stream running diagonally, coffee-estate hills fading into haze behind, large empty cream sky across the top 40 percent for slide text. Camera: eye level, 35 mm look, shallow flat depth with atmospheric haze layers. Environment: early morning, damp ground, stones and tall grass, no other people, no vehicles. Lighting: soft diffuse morning light, no hard shadows. Mood: calm, attentive, careful, not heroic or fast. Colour: slate blue-grey for hills and water, dark charcoal for bike and rider, sand for the track, cream ground; exactly one small brick-red accent (#b0442e) on a trail marker post beside the crossing. Must not appear: any text, numbers, logos, brand marks, watermark, visible face, phone screen content or app interface, other riders, sport bikes, speed blur, photorealism, gradients.

Consistency: same rider and bike as `onboarding/*.webp`; red accent marks the thing to be checked (the marker at the crossing), as in the Fix-it set.

### E02: Trailmark at a viewpoint

| Field | Value |
|---|---|
| Asset ID | IMG-E02 |
| Filename | `e02-trailmark-viewpoint.webp` |
| Slide | 9, Engagement and achievements |
| Purpose | Visual for "reaching a place", the unit of reward, with no speed cue |
| Aspect / size | 3:2, 2400x1600 px |
| Transparency | No |
| Target path | `docs/myto-strategy/presentation/assets/pending/e02-trailmark-viewpoint.webp` |

> Use the attached images as the exact style reference. Flat vector illustration with fine halftone dot texture on a warm cream ground with faint paper grain. Subject: a quiet ridge-top viewpoint at the end of a dirt road; a small stacked-stone cairn and a plain wooden post stand at the edge; an adventure touring motorcycle with cream panniers is parked beside them, the rider (black full-face helmet, dark jacket) stands with the helmet off arm, seen from behind, looking out over layered blue-grey hills and a distant lake in haze. Composition: horizon at the upper third, cairn and post at the right third, bike at the left third, wide empty cream sky over the top 40 percent. Camera: eye level, 35 mm look, flat layered planes. Environment: late afternoon, dry grass, rocks, one distant bird silhouette group, no other people. Lighting: soft low-angle warm light, long soft shadows. Mood: still, earned, unhurried. Colour: slate blue-grey hills, charcoal bike and rider, sand ground, cream paper; exactly one small brick-red accent (#b0442e) as a small cloth tied to the post. Must not appear: any text, numbers, logos, brand marks, watermark, visible face, medals, trophies, podiums, speedometers, stopwatches, rankings, badges with symbols or letters, gradients, photorealism.

Consistency: reward is a place, never a time; no trophy imagery.

### E03: touring kit flat lay (Shop category art)

| Field | Value |
|---|---|
| Asset ID | IMG-E03 |
| Filename | `e03-touring-kit-flatlay.webp` |
| Slide | 10, Shop |
| Purpose | Category art for "gear for the ride" so the Shop slide has a visual that is **not** a claim about any real product |
| Aspect / size | 4:3, 2000x1500 px |
| Transparency | No |
| Target path | `docs/myto-strategy/presentation/assets/pending/e03-touring-kit-flatlay.webp` |

> Use the attached images as the exact style reference (especially the Fix-it flat-lay style: close technical view, plain cream background). Flat vector flat-lay seen from directly above with fine halftone dot texture on a plain pale cream ground with faint paper grain. Subject: generic, unbranded touring kit laid out neatly: a pair of plain dark riding gloves, a folded paper road map, a plain stainless water bottle, a small tool roll, a tyre pressure gauge, a headlamp, a rolled waterproof dry bag. Items are simple generic shapes with no logos, no stitching text, no markings. Composition: items arranged on an invisible grid with generous gaps, centred, 15 percent empty margin around, one empty cream band at the right for slide text. Camera: top-down, orthographic, flat. Lighting: even, no shadows beyond a faint contact shadow. Mood: ordered, practical, calm. Colour: charcoal gloves and tool roll, slate blue-grey bottle and dry bag, sand map, cream ground; exactly one small brick-red accent (#b0442e) on the pull tab of the tool roll. Must not appear: any text, numbers, logos, brand marks, watermark, readable map labels, a motorcycle helmet with graphics, price tags, packaging, hands, faces, fake Myto-branded products.

Consistency: reads as a category illustration (like the Fix-it `carry/kit` tile). The slide caption states it is illustrative, not a product.

## 3. Optional (improves the deck, not required)

### O01: group at a roadside tea stop (partners and advertising slide header)
Slide 13 · IMG-O01 · `o01-roadside-stop.webp` · 3:2, 2400x1600 · no transparency · path `.../pending/o01-roadside-stop.webp`

> Use the attached images as the exact style reference. Flat vector illustration with fine halftone texture on warm cream ground with faint paper grain. Subject: four adventure touring motorcycles with panniers parked in a row beside a simple roadside tea stall under a tree, riders (black full-face helmets pushed up, dark jackets) seen from behind, standing in a loose circle holding cups, one pointing along the road. The stall has a blank plain board (no writing). Composition: eye-level three-quarter view, bikes on the left two-thirds, road curving away to hills on the right, empty cream sky across the top 35 percent. Environment: Karnataka plateau road, red earth verge, morning. Lighting: soft diffuse. Mood: companionable, unhurried. Colour: charcoal, slate blue-grey, sand, cream; exactly one small brick-red accent (#b0442e) on one rider's tank bag. Must not appear: any text, signage lettering, logos, brand marks, watermark, faces, sport bikes, fake phone screens, other vehicles with markings.

### O02: organiser at the head of a larger group (group rides slide)
Slide 11 · IMG-O02 · `o02-large-group-road.webp` · 16:9, 2560x1440 · no transparency

> Use the attached images as the exact style reference. Flat vector illustration with fine halftone texture on cream ground with faint paper grain. Subject: a long line of about twelve adventure touring motorcycles with riders (black helmets, dark jackets) strung along a winding hill road, seen from a high viewpoint above and behind, small in the landscape; the lead rider slightly separated ahead. Composition: road S-curve from lower left to upper right, line of bikes small and evenly spaced, large empty cream sky top 35 percent. Environment: Western Ghats hills, mist in valleys, morning. Lighting: soft, low contrast. Mood: orderly, shared, unhurried, not a race. Colour: slate blue-grey hills, charcoal bikes, sand road, cream ground; exactly one small brick-red accent (#b0442e) on the last rider's pennant (the tail rider). Must not appear: any text, logos, brand marks, watermark, faces, speed lines, motion blur, sport bikes, other traffic, drones, fake UI overlays or map pins.

### O03: night camp and map (long-term vision)
Slide 18 (optional alternative to `welcome.webp`) · IMG-O03 · `o03-evening-camp.webp` · 16:9, 2560x1440 · no transparency

> Use the attached images as the exact style reference. Flat vector illustration with fine halftone texture on warm cream paper ground (an evening feel carried by slate and charcoal tones, not a dark background). Subject: two adventure touring motorcycles parked beside a small tent at a high meadow, a rider seated on a flat rock with a paper map open on the knee, a small stove with steam, distant ridge lines in layers. Composition: scene in the lower half, horizon low, large empty cream-to-slate sky above for slide text. Lighting: low warm dusk light, soft. Mood: reflective, shared, finishing the day. Colour: charcoal, slate blue-grey, sand, cream; exactly one small brick-red accent (#b0442e) on the stove flame. Must not appear: any text, readable map labels, logos, brand marks, watermark, faces, campfire logos, fake phone screens, gradients, photorealism.

### O04: transparent cut-out, rider and loaded bike, three-quarter front
Slide 10 · IMG-O04 · `o04-rider-bike-cutout.png` · 4:3, 2000x1500, **transparent PNG** (alpha, clean edge, no halo) · path `.../pending/o04-rider-bike-cutout.png`

> Use the attached images, especially `bike/adventure-body.webp`, as the exact style reference. Same adventure touring motorcycle and same rider (black full-face helmet, dark jacket, small backpack), now in a three-quarter front view, standing still on its side stand, cream panniers and top box, charcoal body, orange-red tank flash exactly as in the reference, fine halftone texture, flat vector shapes. Isolated on a fully transparent background, no ground shadow, no floor, no sky. Must not appear: any text, number plate characters, logos, brand marks, watermark, visible face, extra riders, background elements, gradients.

## 4. Production checklist

1. Generate with the references attached; keep the style reference prompt line verbatim.
2. Reject any image with text, glyph-like marks, a second red accent, a visible face, or a recognisable real model marking.
3. Save to `presentation/assets/pending/<filename>`, then tell the deck: move the file into `assets/img/`, remove the ID from `IMAGE_PENDING` in `deck-content.md`, run `npm run deck:build`.
4. Rename the PDF from `...-preview.pdf` to `...-v1.pdf` only when no placeholder remains.
