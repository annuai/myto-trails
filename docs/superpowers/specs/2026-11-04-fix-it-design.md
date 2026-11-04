# Fix it: repair guides, pre-ride check, toolkit

Date: 2026-11-04 · [ADR 0011](../../adr/0011-fix-it-offline-guides.md)

**Goal.** Make repairing and checking your own bike normal: a rider stopped on a trail can fix the common faults, and a rider about to leave can check the bike in two minutes.

**Parts**
- **Guides** (13, symptom first): flat tyre (tubeless and tube), won't start, weak battery, chain loose or noisy, chain off, clutch cable, clutch adjust (free play), dead lights (fuse), misfire (spark plug), overheating, soft brakes (checks only), bike fallen over. Each: difficulty, minutes, tools, "stop and get help if", steps with an optional warning and picture. `src/fixit/guides.ts`.
- **Pre-ride check**: eight items, each Fine or Needs fixing; a flagged item offers its guides. The result is kept for the day and shown on Dash. `src/fixit/preRide.ts`, `app/fixit/check.tsx`.
- **Toolkit**: 10 base and 6 remote tools, tickable. Guides list the tools they need and show which are in the rider's kit. `src/fixit/toolkit.ts`.
- **Roadside mode**: a short list of the common faults, each opening the guide one large step at a time with the screen kept awake. `app/fixit/trailside.tsx`, `app/fixit/[id].tsx?walk=1`.

**Design.** Text first, no card per item, one primary action per screen (Survey sheet, DESIGN.md). Status is glyph, word and colour. A picture is shown at the top of a guide or with one step, only when it exists. Nothing needs typing. The live-ride button shows only while stopped, so the ride screen is no more crowded while moving.

**Where the content lives.** Database rows and R2 pictures, served by `GET /api/v1/fixit`, kept on the phone, with the first version bundled ([ADR 0011](../../adr/0011-fix-it-offline-guides.md)). Edit a guide in the database; upload pictures with `npm run fixit:art`.

**Readable by design.** One action per step, 22 words at most (a test and the importer enforce it); a green "what you should see" line on the steps that can be checked; plain-word meanings for jargon on each guide; roadside mode shows one step at 28 pt.

**Data on the phone.** `useFixit`: last check, packed tools, fixed counts. Wiped by erase all.

**To finish**: the 18 pictures (`assets/fixit/README.md`), and a mechanic's review of each guide.
