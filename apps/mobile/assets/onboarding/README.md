# Onboarding pictures

Five halftone illustrations, one per page of the welcome flow. Replace any of them with a picture of the same name and the app uses it; no code change.

**Files:** `welcome.webp`, `record.webp`, `trails.webp`, `safety.webp`, `setup.webp` in this folder (named in `src/features/onboarding/slides.ts`).
**Size:** 1200 x 1200 px, square, WebP (quality about 78), under 400 KB each. PNG is much too heavy for this texture (1 to 3 MB).
**Shown:** cropped to fill a rounded card about 350 x 420 points, so the subject must sit in the middle 70 percent; sky and ground run off the edges. The setup picture is shown top-aligned in a shorter frame (the globe must be in its top half); the rest is cut off below.

## Style (match `assets/rider-on-ridge.jpg`)

Flat vector shapes with a fine, even halftone dot texture, a pale warm cream sky with faint paper grain, slate blue-grey mountains that get paler
with distance, a dark charcoal foreground, sand-coloured clouds. Exactly one small brick-red accent (#b0442e) per picture. No text, no logos, no
faces, no gradients, no photo realism. One rider (black full-face helmet, dark jacket, adventure motorcycle, no brand marks) appears across the set.

## The set (they must differ from one another at thumbnail size)

| File | Page | Place | Camera | Light | Rider | Red accent |
|---|---|---|---|---|---|---|
| `welcome` | Every ride, remembered. | Alpine ridge | Side, mid-height | Dawn, cream sky | Medium, left | Jacket and sun ring |
| `record` | Tap Ride. We do the rest. | Causeway road across a lagoon | High, from the side | Day, cream sky | Small, right of centre | The recorded route line along the road |
| `trails` | Know before you go. | Pine forest, stream crossing | Eye level, no horizon | Misty morning | Medium, centre | Tag on a trail post |
| `safety` | Someone always knows. | Dirt road above a lake | High, looking down the road | Day, cream sky | A group: two ride on, two help a rider | Red sonar rings on the rider being helped |
| `setup` | Set up in a few taps. | Coast road, with the world behind | High, no rider | Day, cream sky | None | A red dot on the home country |

## Making a new one (ChatGPT image generation)

Attach `assets/rider-on-ridge.jpg` (or any picture in this folder) as the style reference, say "use the attached image as the exact style reference", and
state the rules above. Give each scene its own place, camera angle and time of day, and add: "do not use a snowy mountain range across the middle, a dark
rocky slope at lower left, or the rider on the left third", or every picture comes out as the same one. Ask for square 1:1. Then convert:

```
cwebp -q 78 -m 6 -resize 1200 1200 source.webp -o name.webp
```
