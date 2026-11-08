# Image prompts for the app coming-soon pages

Both pages work today with stand-in art, so nothing is blocked on these. Generate them when you like, drop the files in, and flip the one line noted under each.

**Use real screenshots for the app itself.** The app exists, so a screenshot of the real Home, a ride in progress and a group ride beats anything generated, and it can never over-promise. Take them on the phone (Android: power + volume down), 1080 × 2400. Do not generate fake app screens.

**Shared style notes (paste at the end of every prompt):** natural overcast light, warm paper tones (cream `#f2ede8`, stone, clay), muted greens and dust; one small red accent at most (`#be3a23`) on the bike or a jacket; real photographic grain, no HDR glow, no lens flares, no text, no logos, no watermarks, no people's faces in frame. Indian roads and terrain (Western Ghats, Himalayan foothills, Deccan plateau) so it feels like where the riders are.

---

## 1. Myto: hero tile (`myto-moto` site, `/app`)

**File:** `public/app/hero.webp`, 2520 × 1080 (21:9), under 250 KB. Then in `app/app/page.tsx` set `HERO_SRC = "/app/hero.webp"`.

> Wide cinematic photograph, 21:9. A rider seen from behind on an adventure motorcycle, stopped on a gravel mountain road in the Western Ghats at early morning, mist in the valley below. A phone is mounted on the handlebar, its screen glowing softly, showing a route line on a map (screen content out of focus, no readable text). Rider in a dark olive riding jacket, helmet on. Shallow depth of field, the bike sharp, the valley soft. Calm, confident, premium product-launch mood. Space in the upper-left third for a headline. Warm paper-toned palette with one small red accent on the bike. Natural overcast light, fine film grain, no text, no logos, no faces.

## 2. Myto: share image (`og-app.png`)

**File:** `public/app/og.png`, 1200 × 630. Then add `images: ["/app/og.png"]` to `openGraph` and `twitter` in `app/app/layout.tsx`.

> Minimal social share card, 1200 × 630. Warm cream paper background `#f2ede8`. Centre-left: a modern smartphone, slightly angled, screen showing a clean map with a single red route line (no readable text). Right of it, empty space for a headline. Soft contact shadow under the phone, no gradient background, no glow. Editorial, quiet, premium. No text, no logos.

## 3. Moto Trails: header image (`moto-trails` site, `/app`) — optional

The Moto Trails page is deliberately text and hairlines, like a survey sheet. One image is enough, and it can be left out.

**File:** `apps/web/public/images/app/header.webp`, 1600 × 900 (16:9), under 200 KB. It needs a few lines added to `apps/web/src/app/app/page.tsx` to show it under the heading; ask and I will wire it.

> Documentary-style photograph, 16:9. A rider's gloved hand holding a smartphone with a trail map on screen (no readable text), standing beside a parked adventure motorcycle on a red-earth forest trail in Wayanad, Kerala, late afternoon. Dust on the boots, trees soft behind. Flat, honest, field-notes feeling, like evidence from a survey rather than an advert. Muted greens and earth tones, a little blue-grey in the shadows. Natural light, subtle grain, no text, no logos, no faces.

## 4. App icon on a plain ground (both sites, optional, for the install step)

Use the real app icon from `apps/mobile/assets`. No generation needed.

---

# Stylised set (illustration, not photography)

A second option to the photo prompts above, and more distinct from other moto apps. Two looks that match the two sites, plus five spot illustrations for the Myto feature cards. Generate each look as one batch in the same chat or session, so the style stays consistent, and keep the style block word for word.

## Myto look: "paper-cut terrain"

Layered cut-paper landscape, warm and tactile, a bold product-launch feel.

**Style block (paste at the start of every Myto prompt):**
> Layered paper-cut illustration with soft real shadows between the layers, like handmade cut paper lit from the upper left. Palette strictly limited to: warm cream #f2ede8, stone #e3ddd4, sand #ddd7ca, olive #d8dbc9, clay #ddd4c8, charcoal #1c1c1a, and a single accent brick red #be3a23 used only for the route line or one small detail. Matte paper texture, no gradients, no glow, no outlines, no text, no logos, no people's faces. Calm, premium, flat-lit, lots of empty space.

1. **Hero tile** (`2520 × 1080`, 21:9): *Paper-cut hills in four receding layers (cream, sand, olive, clay), a winding road cut from charcoal paper crossing them, a thin brick-red route line following the road, tiny motorcycle silhouette on the road in the middle distance. Empty cream sky in the upper-left third for a headline.* Would replace the phone tile on Myto if you prefer art to screens.
2. **Share image** (`1200 × 630`): *Same paper-cut hills, lower and simpler, a single brick-red route line curving from bottom-left to top-right, a large empty cream area on the left.*
3. **Section divider** (`2520 × 400`, optional): *A thin horizontal strip of the same layered hills, only the ridgeline, to separate sections.*

## Moto Trails look: "survey sheet"

Ink on paper, a cartographer's field sheet, quiet and precise. Matches the hairlines and mono type.

**Style block (paste at the start of every Moto Trails prompt):**
> Technical map illustration, fine ink linework on warm paper #f2ede8. Contour lines in warm grey #6b6560 at 0.5 px weight, one survey-blue #1f4a6b route drawn as a confident dashed line, a few small survey marks (spot heights, a north arrow, a scale bar) with no readable text, no logos. Hand-printed, slightly imperfect registration like a risograph, no gradients, no shadows, no colour fills beyond the paper and the single blue. Generous margins, calm, trustworthy.

4. **Page header** (`1600 × 700`): *A contour map of a forested ridge, a blue dashed trail crossing the contours from lower-left to upper-right, three small waypoint markers, a river in a single thin line, a scale bar bottom-right.* Put it under the heading on `/app`.
5. **Home band** (`1600 × 240`, optional): *A narrow strip cut from the same map, contours and one blue dashed line running through it.*

## Spot illustrations for the Myto cards (five)

Square, `1200 × 1200`, transparent or cream background. Use the Myto paper-cut style block. One idea per image, centred, with a small brick-red accent.

6. **Record:** *A winding road cut from charcoal paper, and one brick-red dot marking where the rider is, a thin line trailing behind it.*
7. **Plan a route:** *Two paper-cut hills joined by a looping brick-red route line with a flag at the end.*
8. **Works offline:** *A folded paper map with one corner lifted, small cut-out hills on it, a brick-red route, and a small crossed-out signal bar in charcoal beside it.*
9. **Ride together:** *Three small paper-cut motorcycle silhouettes in a staggered line on a road, the last one with a brick-red dot above it.*
10. **Keep the bike sorted:** *A paper-cut motorcycle silhouette with a small clipboard pinned to it, one brick-red checkmark.*

## Using the real screens with the art

Keep the real phone screenshots; they are the proof. The paper-cut hero can sit behind them: put the three phones on top of image 1 instead of the plain stone tile. Say the word and I'll build that.

## Using your screenshots as part of the prompt

Attach the app screenshots (the originals, not the cropped files) alongside the text prompt. Two ways to use them:

**1. As the phone screens inside a scene** (keeps the real UI exact):
> Use the attached screenshots exactly as the phone screens. Do not redraw, restyle, translate or invent any UI, text or numbers on them. Place them on three phones in [the Myto paper-cut scene above / the survey-sheet scene above]. Only the surroundings are in the illustrated style.

Image tools often garble small text on screens. If the screens come back altered, ask for the scene with **blank phone screens** and drop the real screenshots on top afterwards. I can do that compositing in code.

**2. As a style or palette reference** (the app's own look, e.g. the cream cards, the brick-red Ride button, the dark ride screen):
> Match the colour palette, rounded shapes and calm feeling of the attached app screenshots. Do not copy their layout or text.

**Tips**
- Attach the screenshots in the same order each time: Home, Ride (dark), Trails, Journal.
- One image per request, then reuse the first result as the style reference for the rest of the set.
- Check every screenshot for names, locations and numbers before you upload it. The group-ride one shows first names and a village-level map.
