# Myto strategy deck

19 slides, 16:9, plain HTML, SVG and CSS, drawn in the Myto app's own design system. No remote assets, no framework, no runtime dependencies. Final exports: `exports/myto-strategy-deck.pdf` and the editable `exports/myto-strategy-deck.pptx`.

## Where things are

| File | Role |
|---|---|
| `deck-content.md` | The only place slide text lives (headline, sub, items, stats, caption, assumptions, sources, image refs, layout name) |
| `../model.mjs` | The only place numbers come from. Slides pull them with `{{base.year.revenue\|inr}}`; charts are drawn from it |
| `build.mjs` | Reads the two above and writes `index.html`. All layouts, the flywheel and the charts (native SVG) and the two concept phone mockups live here |
| `prepare-assets.mjs` | Run by the build: writes web-sized copies of the illustrations to `assets/opt/` (JPEG q86, max 2400 px; transparent ones stay WebP) so the PDF stays small |
| `styles.css` | Token layer plus components, see below |
| `presentation.js` | Navigation, 16:9 scaling, overview, presentation mode |
| `export-pdf.js` | Playwright to PDF |
| `deck-data.mjs` | Parses `deck-content.md` and resolves the model placeholders; shared by `build.mjs` and `build-pptx.mjs` |
| `build-pptx.mjs` | The same content and model to an editable PowerPoint file (see below) |
| `assets/` | `fonts/`, `img/` and `pending/` (illustrations, all delivered), `opt/` (generated, web-sized), `shots/` (frames from the app screen recordings) |
| `exports/` | `myto-strategy-deck.pdf`, `myto-strategy-deck.pptx` |

`index.html` and `assets/opt/` are generated. Do not edit them.

## Design tokens: how the deck mirrors the app

The deck CSS tokens mirror `apps/mobile/src/theme/tokens.ts` and `packages/tokens/src/mobile.ts` (light palette) and [docs/design-tokens.md](../../design-tokens.md). One factor maps the app's 430 pt frame onto the 1920x1080 stage:

`--k: 1.75;  --u: calc(1px * var(--k));` so one app point is 1.75 px on the stage (17 pt body is 29.75 px; 15 pt label 26.25 px; 13 pt caption 22.75 px).

Every space, radius, size and type size in `styles.css` is `app value x --u`: space 2 4 8 12 16 20 24 32 48 (`--space-half` to `--space-12`), radius control 16 / card 24 / thumb 18 / sheet 28 / chip pill, chip height 32, button 56, row 64, progress track 8, type roles hero 26/34, title 24/32, section 21/28, body 17/24, label 15/20, caption 13/18, data-large 24/30 (Michroma for hero and title, Geist for text, Geist Mono for data). The palette is copied value for value: paper `#f2ede8`, card `#fbf9f6`, raised `#f2f0ec`, ink `#1a1a1a`, muted `#6b6560`, accent `#1f4a6b`, good / caution / unknown, tints clay `#efcfc2`, sage `#cfe0c8`, sand `#e8dccb`, sky `#cfdde8`, the page gradient, ink fill `#13161c`. Stage-only values are named: `--t-display` (hero x 1.5) and `--t-cover` (hero x 3.6) for the cover and closing slide, the margins (`--pad-x`, `--zone-top`, `--zone-bottom`) and `--phone-w`.

Components are the app's, redrawn: Card and tinted cards, Badge pills with a glyph and a word (Built = good check, In build = accent half disc, Planned = muted dashed circle, Hypothesis = caution question mark), ListCard rows with hairline dividers, Stat (label under a mono figure), the ink progress bar, Button (ink, accent, soft), Stamp medallions. The two concept phones reset `--u` to about one pixel per point (class `app`), so the same component CSS draws the app at its own scale. Concept phones are always labelled "Concept, not a screenshot" and are drawn from `apps/mobile/app/shop/index.tsx`, `app/marks.tsx`, `src/data/shop.ts` and `src/lib/badges.ts` (product names Trail Beam, Trail Kit, Navi; no prices).

## Edit and export

```bash
# from the repo root
node docs/myto-strategy/model.mjs      # change inputs in model.mjs, see the tables
npm run deck:build                      # deck-content.md + model.mjs -> index.html (also refreshes assets/opt)
npm run deck:pdf                        # index.html -> exports/myto-strategy-deck.pdf (19 pages, 1920x1080 px each, no margins)
npm run deck:pptx                       # deck-content.md + model.mjs -> exports/myto-strategy-deck.pptx (19 slides, 16:9)
open docs/myto-strategy/presentation/index.html
```

Changing a number: edit `model.mjs`, then `deck:build`. Changing words: edit `deck-content.md`, then `deck:build`. The build fails on an unknown model path, an unknown status word or a missing image, and warns when a footer note is too long (keep caption + assumptions + sources under about 300 characters).

`deck:pdf` needs Playwright. It uses a normal `playwright` install if present, else the copy in the npx cache (`npx -y playwright --version` populates it), and launches the system Google Chrome, falling back to Playwright's Chromium. `prepare-assets.mjs` needs `sharp` (a repo dependency); without it the build falls back to the original images and the PDF is much larger.

## Investor pitch (15 slides)

`deck-pitch.md` is the founder's pre-seed pitch: same layouts, model and assets, selected with `DECK=pitch`. `npm run pitch:build` writes `index-pitch.html`, `pitch:pdf` and `pitch:pptx` write `exports/myto-pitch-deck.*`. Arc: a three-chapter origin story (Ladakh, Bengaluru weekends, the group ride), then problem, Rider OS, product, market, why now, model, metrics, built so far, competition, app-to-brand vision, ask. Unlike the strategy deck it states cited market figures (Royal Enfield FY25, Crisil, CareEdge, Lok Sabha Ladakh data) and the raise, built bottom-up in `model.mjs` (`RAISE_INPUTS`; ₹1.2 Cr for 18 months, placeholders `{{raise.ask|cr}}`, `raise.teamPct`, `raise.burn`). Pitch-only layouts: `story` (keys `chapter:`, `imgpos:`), `demo` (video slot: `video: file.mp4` in `assets/video/`) and `ask`. Michroma draws `~` like a minus, so no tilde in display-font values. The PPTX was checked through a Keynote export (charts render only in PowerPoint).

## Viewing

Keys: Right, Down, Space, PageDown next; Left, Up, PageUp previous; Home, End; type a number then Enter to jump; `g` or `o` overview grid; `p` or `f` presentation mode (full screen, controls hidden until the mouse moves); Esc leaves overview or presentation. The URL hash holds the slide (`#12`). Transitions are a 240 ms fade and are removed under reduced-motion.

## Rules the deck follows

- Every slide carries a status label in the header: Built, In build, Planned, Hypothesis (the cover says "Draft for discussion"). Items being built by other agents and not verified (Shop discovery, achievements, Trailmarks, challenges, contribution mapping) say **In build**, never shipped. Billing is not live and Myto is on no store.
- No market size, traction, customers, testimonials or revenue are invented. Every figure is a planning assumption and says so.
- Product screens on the Product and Group rides slides are real frames from `video/public/capture` (test build, test data). The Shop and Marks screens are concept mockups, labelled as such, until real screens are verified.
- Every picture is a real asset. The rider and bike cut-out `o04-rider-bike-cutout.webp` is available but not placed; use it only on a white or card-coloured region.

## PowerPoint export

`npm run deck:pptx` builds `exports/myto-strategy-deck.pptx` from the same `deck-content.md` and `model.mjs` as the HTML, so words and numbers cannot drift. Text, cards, status pills, the flywheel, the roadmap, the tables and the two financial charts are native PowerPoint objects (the charts are real charts with their data). The illustrations and the app screenshots are pictures (rounded and cropped to match); the two Shop and Marks concept phones are redrawn as shapes. The theme carries the app palette, the slides sit in five sections, and every layout in the deck is hand-placed in `build-pptx.mjs` (one function per layout name, same names as `build.mjs`). A new layout in `build.mjs` needs a matching builder there, or the script stops with an error.

Install the fonts from `assets/fonts/` (Michroma, Geist, Geist Mono) before opening the file, or PowerPoint substitutes its own and the headlines reflow. Differences from the HTML: the slide number is PowerPoint's own field ("2", not "02 / 19"), and chart labels are in lakh with two decimals. PowerPoint itself was not available when this was built; layout was checked in Keynote and the file passes the OOXML validator. Charts could not be previewed outside PowerPoint.

## Known limits

- The PDF is about 6 MB (illustrations are downscaled to at most 2400 px and stored as JPEG by `prepare-assets.mjs`).
- Slides are designed for a 1920x1080 stage and scale to any window; text is not reflowed for portrait phones.
- App captures show a few test names from the test build (for example a sample club, a test ride name). Review before sharing outside the team.
