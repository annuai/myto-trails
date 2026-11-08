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
