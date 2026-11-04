# Fix it: repair guides, pre-ride check, toolkit

Date: 2026-11-04 · [ADR 0011](../../adr/0011-fix-it-offline-guides.md)

**Goal.** Make repairing and checking your own bike normal: a rider stopped on a trail can fix the common faults, and a rider about to leave can check the bike in two minutes.

**Parts**
- **Guides** (13, symptom first): flat tyre (tubeless and tube), won't start, weak battery, chain loose or noisy, chain off, clutch cable, clutch adjust (free play), dead lights (fuse), misfire (spark plug), overheating, soft brakes (checks only), bike fallen over. Each: difficulty, minutes, tools, "stop and get help if", steps with an optional warning and picture. `src/fixit/guides.ts`.
- **Pre-ride check**: eight cards in the same accordion style, one open at a time. Mark each Fine or Needs fixing; it closes with a tick or a warning and the next opens; flagged items link to their guides on the last page. It is reached only from the Fix it page, not from the home screen.
- **What to carry**: a closed, read-only card at the bottom of the library: the tools for every ride and the extras for a ride far from a workshop, each with its reason. No ticking and no screen of its own. Each guide still lists the tools it needs.

**Design.** Text first, no card per item, one primary action per screen (Survey sheet, DESIGN.md). Status is glyph, word and colour. A picture is shown at the top of a guide or with one step, only when it exists. Nothing needs typing.

**Where the content lives.** Database rows and R2 pictures, served by `GET /api/v1/fixit`, downloaded at app start and kept on the phone (the app ships no guides) ([ADR 0011](../../adr/0011-fix-it-offline-guides.md)). Edit a guide in the database; upload pictures with `npm run fixit:art`.

**Readable by design.** One action per step, 22 words at most (a test and the importer enforce it); a green "what you should see" line on the steps that can be checked; plain-word meanings for jargon on each guide; walk-through mode shows one step at 28 pt.

**Data on the phone.** `useFixit`: last check, packed tools, fixed counts. Wiped by erase all.

**To finish**: the 18 pictures (`assets/fixit/README.md`), and a mechanic's review of each guide.

**Sections (added 2026-11-04).** The library groups the guides under the major parts of the bike (Tyres, Brakes, Drivetrain, Clutch, Engine, Electrical, After a fall) as cards that are closed by default and open one at a time. Sections are rows (`fixit_section`, migration 0039) served in the same document; each has a cover picture borrowed from one of its guides. A copy with no sections shows the guides as one flat list.
