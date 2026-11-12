# Pillion artwork

Pillion is an Indian Indie dog: upright ears, one tilted. The only constant accessories are **goggles on the head** and a **brick-red bandana**; anything else (helmet, jacket) is a situational prop. Design: [rider story spec](../../../../docs/superpowers/specs/2026-11-12-rider-story-design.md#pillion-delight-not-a-mascot-campaign).

P0 pose ids (all `source: null` for now, so the app shows a quiet dog glyph): `hello`, `waiting` (empty rides), `map` (empty trails), `paw-up`, `standing-up`, `tired-happy`, `campfire`, `asleep`.

To add one: drop `<id>.webp` here and set `source: require('./<id>.webp')` in `poses.ts`.

Prompts follow [../fixit/PROMPTS.md](../fixit/PROMPTS.md): paste its shared style first, with the dog as the single subject, no text, one small brick-red accent (the bandana), then the pose, e.g. `waiting`: "Pillion sitting beside a parked adventure motorcycle, looking up, goggles on his head."
