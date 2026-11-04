# Prompts for the 18 Fix it pictures

Use with ChatGPT image generation. Attach `assets/onboarding/safety.webp` (or `rider-on-ridge.jpg`) every time as the style reference. Paste the **shared style** first, then one picture's prompt. Ask for **4:3 landscape**. Save each as `<id with / as ->.png` (for example `flat-tyre-tubeless-plug.png`) in one folder, then run `npm run fixit:art -w @moto-trails/web -- <folder>`. The upload makes the WebP widths itself.

## Shared style (paste before each)

Use the attached image as the exact style reference. Flat vector shapes with a fine, even halftone dot texture, on a plain pale warm cream background with faint paper grain. Slate blue-grey for secondary shapes, dark charcoal for the motorcycle and tools, sand colour for dirt and rubber highlights. Exactly one small brick-red accent (#b0442e) in the whole picture, on the one part the rider must look at or act on. This is a close technical instructional illustration, not a landscape: the subject fills the frame, the background is plain cream with no scenery. An adventure motorcycle with no brand marks or logos. Any person wears a black full-face helmet, dark jacket and plain dark work gloves; no faces. No text, no numbers, no labels, no arrows, no gradients, no photo realism. Landscape 4:3.

## Still to make (new: brakes-soft/hero, the cover of the Brakes section)

**`brakes-soft-hero`**: Close-up of the front brake lever on the handlebar of an adventure motorcycle, with the front disc brake and caliper visible behind it, a gloved hand squeezing the lever. The red accent is the tip of the lever. Same style rules as the rest. Save as `brakes-soft-hero.png`.

## Still to make (3 of 18 are not uploaded yet)

Uploaded so far: 15. Still needed: `weak-battery/jump` (the two you made have the clip colours the wrong way round for the guide: the guide says red clip to the plus terminal and black clip to the frame, so I held them back), `blown-fuse/box`, and `bike-down/lift` (use prompt 16 A or B below).

## The 18 (paste after the shared style)

1. `flat-tyre-tubeless-hero`: The rear tyre and wheel of an adventure motorcycle on its stand, seen from the side. A single nail is stuck in the tread. The red accent is the nail.
2. `flat-tyre-tubeless-plug`: Extreme close-up of a gloved hand pushing a T-handle plug insertion tool, with a plug in its eye, into a hole in the tread of a tubeless tyre. The red accent is the plug going into the hole.
3. `flat-tyre-tube-hero`: A motorcycle rear wheel lying flat on the ground, off the bike, the tyre pulled half off the rim, the inner tube pulled out in a loop beside it. Three short tyre levers lie nearby. The red accent is the valve on the tube.
4. `flat-tyre-tube-bead`: Close-up of a tyre lever hooked under the edge of a tyre at the rim, lifting it over the rim, a gloved hand pressing the tyre down beside it. The red accent is the tip of the lever at the rim.
5. `wont-start-hero`: Close-up of the right handlebar grip of an adventure motorcycle: the kill switch (a red and black rocker, shown in the halftone style) and start button, a gloved thumb about to press the start button. The red accent is the kill switch.
6. `weak-battery-hero`: The seat lifted off an adventure motorcycle, the battery visible beneath, and a small compact jump-starter pack sitting beside the bike with two cable clips lying ready. The red accent is the battery's positive terminal.
7. `weak-battery-jump`: Top-down close view of a motorcycle battery in its bay, with both clips of a jump pack connected. The RED clip is on the positive (+) terminal. The BLACK clip is on a bare metal frame bolt away from the battery, not on the negative terminal, which has no clip. The two cables run to the edge of the picture. The red accent is the red clip on the plus terminal; keep the black clip dark grey.
8. `chain-slack-hero`: Side view of the rear sprocket and the chain on an adventure motorcycle, a gloved hand turning the adjuster bolt on the swingarm with a spanner. The red accent is the adjuster bolt.
9. `chain-slack-measure`: Side view of the lower run of a motorcycle chain between the sprockets, a steel ruler held vertically against it, and two faint ghost positions of the chain pushed up and down to show the slack. The red accent is the line on the ruler where the movement ends.
10. `chain-off-hero`: Side view of the front sprocket and rear sprocket of a motorcycle, the chain hanging loose off the front sprocket, a gloved hand lifting the chain back toward it. The red accent is the front sprocket.
11. `blown-fuse-hero`: An open motorcycle fuse box with two rows of small blade fuses in neutral grey tones, one fuse pulled out and held in a pair of pliers, its thin wire visibly broken. The red accent is the broken fuse.
12. `blown-fuse-box`: Close-up of a motorcycle fuse box with the lid opened back, rows of blade fuses, no readable writing on the lid. A gloved finger points at one fuse. The red accent is that fuse.
13. `spark-plug-hero`: A spark plug held in a gloved hand, with a plug spanner (a long socket) lying beside it and the engine's cylinder head softly drawn behind it. The red accent is the plug's small electrode at the tip.
14. `overheating-hero`: The front of a liquid-cooled adventure motorcycle with the translucent coolant reservoir visible, and the rider standing a step back with arms folded, waiting. The red accent is the minimum mark line on the reservoir.
15. `bike-down-hero`: An adventure motorcycle lying on its side on bare dirt, the rider standing beside it looking down, the handlebar turned to full lock. The red accent is the end of the handlebar.
16. `bike-down-lift` (use A; if it still distorts, use B)

   **A.** A flat, simple diagram seen from directly above, looking straight down. A motorcycle lies on its side on the ground, drawn as a plain simplified dark silhouette (two wheels, a seat, a handlebar, nothing else). The rider crouches beside the seat with their back against it, knees bent, one gloved hand on the handlebar and the other on the rear grab rail. Keep the motorcycle simple and correct: exactly two wheels, one seat, one handlebar. The red accent is the gloved hand on the grab rail.

   **B (fallback, easiest for the tool).** A side view of the rider only, in profile, in the lifting crouch: back straight, knees deeply bent, bottom pressed against the seat of a motorcycle that is barely drawn (only the edge of a seat and one handlebar end enter the frame from the side). One gloved hand reaches back to the handlebar. The motorcycle is a minimal shape, not a detailed drawing. The red accent is the gloved hand on the handlebar.

17. `clutch-adjust-hero`: Close-up of the clutch lever on the left handlebar of an adventure motorcycle, the cable running into the small adjuster and its lock ring at the lever end, a gloved hand turning the adjuster. The red accent is the adjuster.
18. `clutch-adjust-measure`: Close-up of the clutch lever pulled gently to the point where it first resists, with a small steel ruler held beside the lever tip showing the gap it has moved, and a faint ghost of the lever at rest behind it. The red accent is the line on the ruler where the lever stops.

## Tips

- If two come out different from each other (a different bike, a different rider), say "keep the same motorcycle and the same rider as the previous picture".
- If it adds text or arrows, say "remove all text and arrows".
- Check each for faces, brand marks and a second red element before converting.
