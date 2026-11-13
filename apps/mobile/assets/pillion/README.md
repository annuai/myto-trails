# Pillion artwork

Pillion is an Indian Indie dog: upright ears, the left one tilted, goggles on his head and an orange-red bandana. Anything else (helmet, jacket, backpack) is a situational prop. Design: [rider story spec](../../../../docs/superpowers/specs/2026-11-12-rider-story-design.md#pillion-delight-not-a-mascot-campaign).

The eight P0 poses are done: `hello`, `waiting` (empty rides), `map` (empty trails), `paw-up`, `standing-up`, `tired-happy`, `campfire` (Year in Rides), `asleep`. One `<id>.webp` each, registered in `art.ts`; labels and the `scene` flag are in `poses.ts`.

Seven are transparent cut-outs (768 px square); `campfire` is a full scene with its own sky, drawn with rounded corners. To change one, replace the file; to add one, add the id to `PillionPose` in `src/lib/story/moment.ts`, then `poses.ts` and `art.ts`.

Sources were generated from the character sheet and cut out from their cream paper background. To redo a cut-out, generate on a plain flat cream background and remove it by flood-filling from the border (the outline is a closed charcoal line).
