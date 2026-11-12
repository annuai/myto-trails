# Myto strategy deck

18 slides, 16:9, plain HTML, SVG and CSS. No remote assets, no framework, no runtime dependencies. Status: **preview**, because some images are still pending (see [../image-requests.md](../image-requests.md)).

## Where things are

| File | Role |
|---|---|
| `deck-content.md` | The only place slide text lives (headline, sub, body, stats, captions, assumptions, sources, asset refs, layout name) |
| `../model.mjs` | The only place numbers come from. Slides pull them with `{{base.year.revenue\|inr}}`; charts are drawn from it |
| `build.mjs` | Reads the two above and writes `index.html`. All layouts and the SVG diagrams (flywheel, capacity ladder, roadmap, charts) live here |
| `styles.css` | Real Myto tokens: paper `#f2ede8`, ink `#1a1a1a`, muted `#6b6560`, survey blue `#1f4a6b`, status colours, Michroma / Geist / Geist Mono, radii 2 and 4 px (`packages/tokens`, `DESIGN.md`) |
| `presentation.js` | Navigation, 16:9 scaling, overview, presentation mode |
| `export-pdf.js` | Playwright to PDF |
| `assets/` | `fonts/`, `img/` (illustrations copied from the repo), `shots/` (frames from the app screen recordings), `pending/` (drop new images here) |
| `exports/` | `myto-strategy-deck-preview.pdf` |

`index.html` is generated. Do not edit it.

## Edit and export

```bash
# from the repo root
node docs/myto-strategy/model.mjs      # change inputs in model.mjs, see the tables
npm run deck:build                      # deck-content.md + model.mjs -> index.html
npm run deck:pdf                        # index.html -> exports/myto-strategy-deck-preview.pdf (18 pages, 1920x1080 px each, no margins)
open docs/myto-strategy/presentation/index.html
```

Changing a number: edit `model.mjs`, then `deck:build`. Changing words: edit `deck-content.md`, then `deck:build`. The build fails on an unknown model path, an unknown status word, or an unknown pending-image ID, so a typo cannot ship quietly.

`deck:pdf` needs Playwright. It uses a normal `playwright` install if present, else the copy in the npx cache (`npx -y playwright --version` populates it), and launches the system Google Chrome, falling back to Playwright's Chromium (`npx playwright install chromium`, only if Chrome is missing).

## Viewing

Keys: Right, Down, Space, PageDown next; Left, Up, PageUp previous; Home, End; type a number then Enter to jump; `g` or `o` overview grid; `p` or `f` presentation mode (full screen, controls hidden until the mouse moves); Esc leaves overview or presentation. The URL hash holds the slide (`#12`). Transitions are a 220 ms fade and are removed under reduced-motion.

## Rules the deck follows

- Every slide carries a status label: Built, In build, Planned, Hypothesis (or Preview for the cover). Items that are being built by other agents and are not verified (Shop discovery, achievements, Trailmarks, challenges, contribution mapping) say **In build**, never shipped.
- No market size, traction, customers, testimonials or revenue are invented. Every figure is a planning assumption and says so.
- Product screens are real frames from `video/public/capture` (test build, test data). Screens that cannot be shown truthfully yet are `IMAGE PENDING SHOT-nn` frames.
- A missing illustration is a dashed frame reading `IMAGE PENDING <asset id>`, never a substitute picture.

## When a pending image arrives

1. Put the file in `assets/pending/` using the filename in `deck-content.md` (`## pending-registry`). The build then uses it automatically and the placeholder disappears.
2. `npm run deck:build && npm run deck:pdf`.
3. When no placeholder remains, rename the export from `-preview.pdf` to `-v1.pdf` (change the default in `export-pdf.js`).

## PPTX: evaluated, not built

Not recommended as a primary format. The deck is code-driven: the flywheel, capacity ladder, roadmap and financial charts are native SVG and CSS generated from the model, and the type is Michroma and Geist. A PowerPoint file would either flatten those into pictures (not editable, defeats the point), or need every diagram rebuilt as PowerPoint shapes and the fonts embedded, which creates a second copy of the content that drifts from `deck-content.md` and `model.mjs`. If a stakeholder insists on an editable PPTX, the least bad route is a separate script (for example `pptxgenjs`) that reads the same `deck-content.md` and `model.mjs`, with charts as native PowerPoint charts, accepting layout differences. For sharing, the PDF is the faithful format and the HTML is the live one.

## Known limits

- The PDF is large (about 18 MB) because the illustrations are embedded at source size; compress with a PDF tool for email if needed.
- Slides are designed for a 1920x1080 stage and scale to any window; text is not reflowed for portrait phones.
- App captures show a few test names from the test build (for example a sample club, a test ride name). Review before sharing outside the team.
