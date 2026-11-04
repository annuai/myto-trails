# Fix it pictures

20 pictures for the repair guides: 12 "hero" pictures, the What to carry cover (one per guide, shown at the top) and 7 "step" pictures (shown with the one step that is easier to see than to read). Every guide works without them; the app shows a picture as soon as it is listed in `src/fixit/art.ts`. Nothing here blocks a release.

**Size:** 1200 x 900 px (4:3, landscape), WebP, quality about 78, under 300 KB each. Shown full width of the screen (about 335 points), so keep the subject in the middle 80 percent.
**File name:** the id with `/` replaced by `-` and `.webp` (or `.png`, `.jpg`) added: `flat-tyre-tubeless/plug` becomes `flat-tyre-tubeless-plug.webp`.
**Upload (no app change, no new build):** put the files in one folder and run `npm run fixit:art -w @moto-trails/web -- <folder>` (add `--dry-run` first). It makes the 400, 800 and 1200 px WebP widths, stores them in R2 under `public/fixit/<guide>/<slot>-<width>.webp`, and records them on the picture's row in the database. The app picks them up the next time it opens Fix it online, and keeps them on the phone for offline use. Safe to re-run; to replace a picture, upload the new file with the same name.

## Style (match `assets/onboarding/*.webp` and `assets/rider-on-ridge.jpg`)

Flat vector shapes with a fine, even halftone dot texture on a pale warm cream ground with faint paper grain. Slate blue-grey for secondary shapes, dark charcoal for the bike and tools, sand colour for dirt and rubber highlights. **Exactly one small brick-red accent (#b0442e) per picture: it marks the part the rider must look at or act on** (the hole in the tyre, the fuse, the clamp). No text, no numbers, no logos, no brand marks, no faces. Hands appear in plain dark work gloves when needed. The same adventure bike and the same rider (black full-face helmet, dark jacket) as the onboarding set. A close, side-on or three-quarter technical view, not a landscape: the subject fills the frame and the background is plain cream.

Use these words with the style reference attached: "use the attached image as the exact style reference. Technical instructional illustration, close view, plain cream background, halftone dots, one small red accent on the part to act on, no text, no logos, no faces. Landscape 4:3."

## The set

| Id | What it shows | Red accent |
|---|---|---|
| `flat-tyre-tubeless/hero` | Rear tyre of an adventure bike on its stand, a nail in the tread | The nail |
| `flat-tyre-tubeless/plug` | Gloved hand pushing a plug tool into a hole in the tyre, close up | The plug in the hole |
| `flat-tyre-tube/hero` | Rear wheel off the bike on the ground, tyre half off the rim, tube pulled out | The valve on the tube |
| `flat-tyre-tube/bead` | A tyre lever lifting the tyre edge over the rim, close up | The lever tip at the rim |
| `wont-start/hero` | The right handlebar: kill switch, start button, a gloved thumb on the start button | The kill switch |
| `weak-battery/hero` | Seat lifted, battery visible beneath, a small jump pack beside it | The battery's positive terminal |
| `weak-battery/jump` | Two clips on the battery: one on the positive terminal, one on a bare frame bolt, shown in a close top view | The clip on the frame bolt |
| `check/walk-round` | A rider crouching beside the rear half of the adventure motorcycle, side view, a gloved hand run along the frame as if checking the bolts. Not a guide's picture: it is the tile on the Walk-round card of the pre-ride check | The gloved hand on the frame |
| `check/papers` | A flat lay: a zip pouch with a registration booklet, a driving licence, a folded insurance paper and a pollution-certificate card. Text is only abstract lines, no readable words. The tile on the Papers card of the pre-ride check | A small red tab on the registration booklet |
| `carry/kit` | A flat lay of the roadside repair kit from above: plug kit and T-handle tool, pressure gauge, hand pump, jump-starter pack with clips, multitool, spanner, chain lube, headlamp. Not a guide's picture: it is the tile on the What to carry card | The T-handle of the plug tool |
| `brakes-soft/hero` | A brake lever on the left or right handlebar and the front disc brake behind it, a gloved hand squeezing the lever | The lever tip |
| `chain-slack/hero` | Rear sprocket and chain from the side, a gloved hand on the swingarm adjuster | The adjuster bolt |
| `chain-slack/measure` | A ruler against the chain at the middle of its lower run, the chain pushed up and down (two ghost positions) | The ruler's reading line |
| `clutch-adjust/hero` | The clutch lever on the left handlebar of an adventure motorcycle, the lever adjuster and its lock ring at the lever end, a gloved hand turning the adjuster | The lever adjuster |
| `clutch-adjust/measure` | The clutch lever pulled gently to the point it resists, a small steel ruler held beside the lever tip, showing the gap it has moved (two ghost positions: rest and where it resists) | The ruler line at the point the lever resists |
| `chain-off/hero` | Chain hanging loose off the front sprocket, a gloved hand lifting it on | The front sprocket |
| `blown-fuse/hero` | Open fuse box with a row of coloured fuses, one pulled out with pliers | The blown fuse |
| `blown-fuse/box` | The fuse box lid open, close up, fuses in rows (no readable text on the lid) | The fuse being checked |
| `spark-plug/hero` | A spark plug held in a gloved hand next to the cylinder head, plug spanner beside it | The plug's electrode |
| `overheating/hero` | Radiator cap area and coolant reservoir of a liquid-cooled adventure bike, a rider stood back with arms folded | The reservoir's minimum mark |
| `bike-down/hero` | An adventure bike lying on its side on a dirt road, the rider standing beside it, handlebar turned to full lock | The handlebar end |
| `bike-down/lift` | The lifting posture from behind: back to the seat, knees bent, one hand on the bar, one on the frame | The rider's gripping hand on the frame |

Only the ids in the table are used by the app. The clutch-cable replacement has no picture: it is better read than drawn (the adjust guide has pictures). The brakes guide has a cover picture because Brakes is a section, but no step pictures: it is a "get help" card.
