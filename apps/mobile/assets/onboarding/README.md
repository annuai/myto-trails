# Onboarding pictures

Five halftone illustrations, one per page of the welcome flow. The files here are generated stand-ins (a dot-pattern landscape in the
right colours). Replace any of them with a picture of the same name and the app uses it; no code change.

**Files:** `welcome.png`, `record.png`, `trails.png`, `safety.png`, `setup.png` in this folder.
**Size:** 1200 x 1200 px, square, PNG or JPG (keep the .png/.jpg extension the code expects: `slides.ts`). Under 400 KB each.
**Shown:** cropped to fill a rounded card about 350 x 420 points, so keep the subject in the middle 70 percent and let sky or ground run off the edges.

## Style (match `assets/rider-on-ridge.jpg`)

Flat vector-style illustration with a fine halftone dot texture, muted palette: slate blue-grey (#566474) and warm sand (#beb2a0) on a
pale cool grey background (#e9ecee). One small accent in brick red (#b0442e), used once per picture. No text, no logos, no people's
faces, no gradients, no shadows, no photo realism. Calm, wide, lots of empty sky. The dots must stay fine and even: at phone size they
should read as texture, not as big blobs.

## Prompts (paste into ChatGPT image generation, one at a time)

Start every prompt with this shared line, then add the scene:

> Flat vector illustration with a fine, even halftone dot texture, muted slate blue-grey and warm sand palette on a pale cool-grey
> background, a single small brick-red accent, calm and minimal, no text, no faces, no gradients, square 1:1.

1. **welcome.png** - Scene: a lone motorcyclist seen from behind, small in the lower third, riding along a ridge at dawn. Layered mountain
   ridges fade into the distance in lighter dots. A large thin circle (the sun) outline in the sky. The rider's jacket or tank is the
   brick-red accent. Most of the top half is empty pale sky.
2. **record.png** - Scene: a winding mountain road seen from above and slightly behind, curving through dotted hills. The road itself is
   the brick-red line (a ride route). No vehicle, or one tiny rider far along the road. Hills darker in the foreground.
3. **trails.png** - Scene: a topographic contour map made of dotted contour lines forming hills and valleys, with a small brick-red
   location pin on one trail. A thin winding trail line crosses the contours. Nothing else.
4. **safety.png** - Scene: a motorcyclist seen from the side, small, on an open road at the centre, with several concentric thin dotted
   rings spreading out around them like a signal or radar. The rider's helmet is the brick-red accent.
5. **setup.png** - Scene: an empty road running straight to the horizon between dotted fields, low dotted hills on the horizon, big empty
   sky. The dashed centre line of the road is brick red. Quiet and hopeful: "ready to ride".

If a result is too busy, add: "simpler, fewer shapes, larger areas of flat colour, finer dots".
