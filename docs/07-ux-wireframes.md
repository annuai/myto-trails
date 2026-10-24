# 07 — UX architecture and wireframes

Low-fidelity, structure only. Mode (per the design process): the site is mostly **Operate** (discovery tool, submission, moderation) with **Read** pages (trail detail, guidelines). Homepage carries a small amount of Persuade. Hierarchy is driven by decision order, not decoration.

Legend: `[ ]` control, `▓` image, `░` map, `◆ ● ▲ ■` status glyphs (shape + label, never colour alone).

## 1. Home / discovery entry

```
┌──────────────────────────────────────────────────────────────┐
│ Myto Trails        Explore  Map  Submit a trail    ⌕  Saved  ◯│
├──────────────────────────────────────────────────────────────┤
│  Find a trail you can actually ride.                          │
│  [ Search a place, region or trail name      ⌕ ] [◎ Near me] │
│  Popular regions:  Kerala · Karnataka · Meghalaya · …         │
│  (derived from data; only regions with ≥3 trails)             │
├──────────────────────────────────────────────────────────────┤
│  Recently verified                         View all →         │
│  ┌ list rows, not cards: name | place | ●access | ◆open | km ┐│
│  Browse by region   │  Responsible riding (one paragraph)     │
│  42 trails · 5 states · last verified 2 days ago   (real data)│
└──────────────────────────────────────────────────────────────┘
```
Rationale: search first because intent is usually place-based. Counts and "last verified" are honest, computed numbers. Trail rows (not image cards) because scanning status and distance matters more than hero photos. One image strip optional below the fold.

## 2. Search results (list view)

```
┌ Header ──────────────────────────────────────────────────────┐
│ [Search…        ]  State▾ Terrain▾ Difficulty▾ Distance▾ More▾│
│ Active: [Kerala ×] [Gravel ×] [Hide closed ×]   Clear all    │
│ 18 trails          Sort: Relevance▾          [List|Map]      │
├──────────────────────────────────────────────────────────────┤
│ ▓ Trail name                                  ●Public  ◆Open │
│   Wayanad, Kerala · 24 km · ~2 h · Moderate   ✓Verified 3 Mar│
│   gravel · forest track                                      │
│ ──────────────────────────────────────────────────────────── │
│ ▓ Trail name                       ▲Permission req.  ◆Seasonal│
│   …                                                          │
│ ──────────────────────────────────────────────────────────── │
│  Pagination (numbered, URL-based)                            │
└──────────────────────────────────────────────────────────────┘
```
Priority per row: name → access/condition glyphs → place, distance, difficulty → verification date → terrain tags → thumbnail (80 px, lazy). Filters: five visible, the rest under "More". Empty state suggests relaxing the most restrictive filter and shows nearest alternatives.

## 2b. Place and "near me" results

```
┌──────────────────────────────────────────────────────────────┐
│ [ Bangalore ×                       ⌕ ] [◎ Near me]          │
│ Suggestions:  Trails · Bengaluru (place) · Bengaluru Urban    │
│ Near Bengaluru · within [50][100][150✓][200][300] km          │
│ 23 trails     Sort: Nearest ▾           [List | Map]         │
├──────────────────────────────────────────────────────────────┤
│ Trail name                                  ●Public  ◆Open   │
│ 62 km away · ≈ 1 h 50 each way · round trip ≈ 3 h 40         │
│ Moderate · 24 km · ~2 h ride          ✓ Verified 3 Mar       │
│ ──────────────────────────────────────────────────────────── │
│ Travel times are approximate. Check the route before you go. │
└──────────────────────────────────────────────────────────────┘
Near me: map shows a blue dot with accuracy circle; if permission is denied:
"We couldn't get your location. Search for a place instead." [ place search ]
```
Rationale: the answer to "how far is this from me" sits on the same line as the go/no-go glyphs. "≈" and a footnote keep estimates honest. Radius chips are one tap; place results use the same list, filters and URL state as every other search.

## 3. Map exploration (desktop split, mobile toggle)

```
Desktop                                         Mobile
┌────────────────────┬───────────────────┐      ┌───────────────────────┐
│ filters (chips)    │░░░░░░░░░░░░░░░░░░░│      │ [Search] [Filters (2)]│
│ 14 trails in view  │░░ ●3   ■ ░░░░░░░░░│      │░░░░░░░░░░░░░░░░░░░░░░░│
│ ▸ Trail A  ●◆ 24km │░░░    ▲  ░░░ ─route│      │░░░  ●3   ▲  ░░░░░░░░░│
│ ▸ Trail B  ▲◆ 11km │░░░░░░░░░░░░░░░░░░░│      │░░░░░░░░░░░░░░░░░░░░░░░│
│ ▸ Trail C  ●? 40km │ [+][−][⌖] [layers]│      │▔▔ Bottom sheet: ▔▔▔▔▔▔│
│                    │ ☐ Search as I move│      │ 14 trails in view  ⌃  │
└────────────────────┴───────────────────┘      │ [List | Map] tab bar  │
```
Rationale: split view on desktop keeps results and geography linked; hovering a row highlights the marker. On mobile the map is full-bleed with a draggable bottom sheet (peek / half / full) holding the same results. "Search as I move" is a toggle, off by default, to avoid result churn. Marker glyph encodes access (shape) and label; clusters show counts. Keyboard: list is the keyboard path; map has `aria-label` and skip link to the list.

## 4. Trail detail

```
┌ Header ──────────────────────────────────────────────────────┐
│ Home › Regions › Kerala › Wayanad                             │
│ Trail name                                          [♡ Save] │
│ Wayanad, Kerala · by contributor                              │
├─ GO / NO-GO ─────────────────────────────────────────────────┤
│ Access    ▲ Permission required      Condition  ◆ Seasonal    │
│ Verified  ✓ Moderator · 14 Aug 2026 (valid to Feb 2027)       │
│ 24 km · ~2 h 30 · +612 m · Moderate · Adventure/dual-sport    │
│ [ Download GPX ]   [ Report an issue ]                        │
│ Notice: Entry pass needed from the estate office… Read how →  │
├──────────────────────────────┬───────────────────────────────┤
│ ░░ Route map ░░░░░░░░░░░░░░░ │ Elevation profile ▂▃▅▇▅▃▂    │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Start / End / Key points list │
├──────────────────────────────┴───────────────────────────────┤
│ Summary & riding notes (≤ 70ch)                               │
│ Terrain · Surface · Best season (month strip) · Hazards       │
│ Gallery (cover + strip, captions, credit)                     │
│ Access details & sources · Facilities (verified)              │
│ History: Updated 12 Jan 2027 · v3 · Contributors              │
│ Related trails                                                │
└───────────────────────────────────────────────────────────────┘
```
Rationale: everything needed for the go/no-go decision sits above the first scroll on both desktop and mobile; photography follows rather than leads because trust, not mood, is the product. Notices for permission/closure sit **inside** the strip with an icon and text, in a full-width bordered band when status is not "Public + Open". On mobile: single column; the strip becomes a stacked definition list; Download and Save become a sticky bottom bar.

## 5. Saved (wishlist)

```
Saved trails (7)                    Sort: Recently saved ▾
┌──────────────────────────────────────────────────────────┐
│ ● Changed  Trail A   ▲Permission → ●Public   (Updated 2d)│  [Remove]
│ Trail B    ●Public ◆Open  24 km             [Download]   │
│ Trail C    ◆Temporarily closed · until Mar 2027           │
└──────────────────────────────────────────────────────────┘
Empty: "Nothing saved yet. Save a trail to keep it here and see if it changes." [Explore trails]
```
Rationale: the only reason to return is changed status; "Changed" items float to the top with what changed. Collections are not shown in MVP.

## 6. Trail submission (step form)

```
Submit a trail                              Draft saved 12:04
Steps: ① Basics ② Route ③ Terrain ④ Access ⑤ Photos ⑥ Review
┌──────────────────────────────┬───────────────────────────────┐
│ Step 2: Route                 │ ░░ Live preview map ░░░░░░░░ │
│ [ Drop GPX here or browse ]   │ Distance 24.1 km             │
│ GPX only · up to 5 MB         │ Elevation +612 m / −590 m    │
│ ✔ track.gpx · 1,830 points    │ ▂▃▅▇▅▃ profile               │
│ ⚠ No elevation data; we'll    │ ⚠ Similar trail: "…" View    │
│   estimate it                 │                              │
│ Start point: auto-detected    │                              │
│ [ Back ]            [ Continue]│                              │
└──────────────────────────────┴───────────────────────────────┘
```
Rationale: one task per step; the preview shows the consequence of the upload immediately; validation messages are specific and fixable. The Access step explains each option in plain language, requires evidence for anything except "Unknown", and links to the guidelines. The Review step shows exactly what the public page will look like and what stays private.

## 7. My contributions

```
My contributions
┌──────────────────────────────────────────────────────────┐
│ Trail name         Status               Updated          │
│ Trail X            Published ✓          2 Mar     [View] │
│ Trail Y            Changes requested ⚠  5 Mar     [Edit] │
│   Moderator: "Add a source for the permission note."     │
│ Trail Z            In review ◔          7 Mar            │
│ Trail W            Draft                9 Mar     [Continue]│
└──────────────────────────────────────────────────────────┘
```
Rationale: status plus the *next action* is the priority; moderator feedback shown inline so the contributor never has to hunt for it.

## 8. Moderation dashboard

```
Moderation                         Mine ▾  Region ▾  Priority ▾
┌ Queue ───────────────────┬ Review panel ────────────────────┐
│ ▲ High  Report: env. …   │ Submission: Trail Y  v1           │
│ ● Trail Y  new   5d      │ Auto-checks ✔GPX ✔EXIF ⚠Duplicate? │
│ ● Trail Q  edit  3d      │ ┌ Content ┬ Route ┬ Media ┬ Access ┐│
│ ◔ Expiring: Trail K 12d  │ │ field-level comments           ││
│ Reports (4) Users Audit  │ └───────────────────────────────┘│
│                          │ [Approve][Request changes][Reject]│
│                          │ [Publish with limits]  Reason ▾   │
└──────────────────────────┴──────────────────────────────────┘
```
Rationale: dense, keyboard-friendly two-pane layout; the queue shows age and priority; automated checks are summarised at the top so human time goes to judgement; every decision requires a reason and writes to the audit log.

## Cross-cutting UX rules
- Status glyph + text label + (secondary) colour everywhere. Glyph set: ● public/open (filled circle), ▲ permission/caution, ■ closed/restricted, ◆ seasonal, ? unknown. Final icons designed in doc 09.
- Every empty, loading, error and success state is written copy, not a spinner alone.
- Primary action per screen is one button; destructive actions are confirmed with the consequence stated.
- Touch targets ≥ 44 px, key actions in thumb reach on mobile.
- No infinite scroll on results (URL-addressable pagination); "Load more" in map sheet.
- Footer on every page: link columns, **Donate**, and "Myto Trails is a subsidiary of myto-moto" (links to myto-moto.com). `/donate` is a plain content page: who receives donations, where funds go, independence statement, one button to the hosted payment page.
- Visual tone: modern, simple, minimal (doc 08): generous whitespace, one accent, few boxes.
