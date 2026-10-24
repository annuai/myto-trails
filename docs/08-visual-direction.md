# 08 — Visual direction

## 1. What the Myto brand actually gives us (verified from CSS, see doc 01)
Warm paper-like neutrals (`#f2ede8` / `#f2f0ec`), near-black ink (`#1a1a1a`), muted brown-grey (`#6b6560`), 8% black hairlines, a brick-red accent (`#be3a23`), a dark card (`#1c1c1a`) and earthy fills (clay, olive, sand, stone). **Michroma** (wide, technical, engineered display face) over **Geist** (neutral grotesque), plus system mono. Generous radii and uppercase eyebrow labels on the marketing site.

What to inherit: palette family, the two typefaces, hairline borders, restrained motion, the "engineered" tone. What to change for this product: smaller radii, sentence-case labels, no card-per-everything, a distinct trail accent, a data/mono voice.

**Constraint discovered:** brand red `#be3a23` is the danger colour in most UIs. Using it as Moto Trails' accent would collide with "closed/restricted". So the brand red is used rarely (logo, brand moments) and Trails gets its own accent.

All contrast values below were computed (WCAG 2.x relative luminance); they are not estimates.

## 2. Three directions

### A — "Survey sheet" (cartographic editorial)
**Personality:** a well-made survey map crossed with a technical manual. Quiet, exact, trustworthy.
**Typography:** Michroma only for the wordmark and page titles (rare, large, tracking tight; avoids long text since it is wide and hard to read in lines). Geist for everything else. **Geist Mono** (or system mono) for data: distances, coordinates, elevations, dates, IDs, in tabular numerals. Type scale 12/14/16/18/22/28/40 (1.25-ish), body 16/1.6, measure ≤ 70ch, sentence case.
**Colour:** paper `#f2ede8`, surface `#f2f0ec`, ink `#1a1a1a`, muted `#6b6560` (4.94:1 on paper). Trails accent **survey blue** `#1f4a6b` (8.0:1 on paper; 9.3:1 white-on-blue) — the blue of hydrology and map labels, unrelated to brand red, semantic-neutral. Secondary map hues from Myto's clay/olive/sand used as terrain tints.
**Grid & composition:** 12-col, 4 px base; asymmetric two-column pages (content 7/12 + sticky data rail 5/12); thin rules instead of boxes; hairline contour-line motif used as a *functional* background in the map and elevation views only.
**Image treatment:** photographs as full-bleed rectangles with 2 px radius, caption and credit in mono beneath (like a field-guide plate). No overlays of text on photos.
**Navigation:** slim top bar, small caps-free sentence-case labels, bottom tab bar on mobile.
**Trail listing:** table-like rows with fixed columns (status, name, place, km, difficulty). Information-dense, scan-friendly.
**Map integration:** map is a first-class panel; outdoor style (paper-coloured land, muted contours, blue route line with white casing, status glyph markers).
**Relation to Myto:** closest relative: same paper, ink, type and hairlines; new accent and a "data" voice.
**Strengths:** distinctive without gimmicks; best for decision-making; photo-light so fast on slow networks; accessible by default (high contrast, text-first). **Weaknesses:** can feel austere; relies on good copy and a few photographs to carry emotion; needs discipline to avoid becoming a spreadsheet.

### B — "Field instrument" (dark, dashboard-like)
**Personality:** a GPS head-unit or instrument cluster. Technical, high-contrast, night-friendly.
**Typography:** Michroma for large numerals and headings, Geist for text, mono for data. **Colour:** `#1c1c1a` base (Myto's dark card), panels `#262624`, text `#f2ede8`, accent amber `#e0a43a` (7.75:1 on dark), status colours lightened. **Grid:** modular tiles of numbers. **Imagery:** desaturated with colour on hover. **Navigation:** left rail on desktop. **Listing:** compact data tiles with large figures. **Map:** dark vector style, glowing route. **Relation to Myto:** uses the brand's dark card and technical tone, but inverts the site's light, warm feel.
**Strengths:** striking, map looks great, suits night riders and the Navi product line. **Weaknesses:** poor in bright sunlight (a stated use condition); dark UI for long reading and photographs is tiring; looks like many "tech dashboard" templates; breaks from Myto's warm paper character; amber on dark is a very common "adventure/tech" cliché.

### C — "Field journal" (photo-led editorial)
**Personality:** a travel magazine feature. Emotive, spacious, inspiring.
**Typography:** Michroma headlines over huge full-bleed photographs; Geist body. **Colour:** paper and ink, red accent from the brand. **Grid:** large hero imagery, wide margins, 6-col editorial. **Imagery:** hero-dominant, cinematic crops. **Navigation:** minimal overlay menu. **Listing:** large image cards. **Map:** secondary, tucked behind a "View map" button. **Relation to Myto:** closest to the current marketing homepage.
**Strengths:** emotionally strong, great for the Journal. **Weaknesses:** the exact opposite of the product's principles (accuracy over inspiration, access info first); photo-heavy and slow on poor connections; invites the "adventure tourism" aesthetic the brief rejects; maps become decoration; large cards everywhere.

## 3. Recommendation: Direction A, with B's dark map style as an optional theme

Reasons:
1. The product is a decision tool; A prioritises the go/no-go data and keeps photography as evidence, not mood.
2. It stays closest to Myto's *tokens* while avoiding the marketing site's *devices* (big radii, uppercase eyebrows).
3. Paper background + ink text is readable outdoors in bright light (contrast ≥ 14:1 for body).
4. Light weight: few large images, no heavy effects.
5. Distinct and ownable: mono data voice, survey-blue route, plate-style photographs.

Borrow from B: a dark map/theme option (stage 2) for night use; mono numeric treatment. Borrow from C: one editorial hero photograph on the homepage and optional hero on trail pages that have a strong cover image; Journal cross-links.

## 3b. Refinement: modern, simple, minimal (your instruction)

Direction A stays, tuned towards quiet and modern:
- **More air, fewer lines.** Section gap 64 px on desktop (48 mobile). Hairlines only between list rows and around notices and form fields; none under headers or around sections.
- **One accent.** Survey blue for primary actions, links, the route line and focus, nothing else. Status colour appears only on the status glyph and its word, never as a fill behind content.
- **Type does the work.** Michroma only for the wordmark, the home headline and page titles. Everything else is Geist (and Geist Mono for numbers). Fewer sizes in use per page (three, plus mono).
- **Fewer things above the fold.** The go/no-go strip shows three decisions (access, condition, verification) as the largest items, then one line of stats. Everything else moves below.
- **Progressive disclosure.** Hazards, facilities, access sources and history collapse behind clear "Show details" controls on mobile.
- **No ornament.** The contour-line motif appears only inside maps and elevation views. No gradients, no shadows except popovers/dialogs/sheets, no decorative icons.
- **Photography:** fewer, larger images, aspect ratio preserved, caption in mono beneath.
- **Footer:** same paper background, hairline above, quiet link columns, **Donate** as a plain link, and "Moto Trails is a subsidiary of myto-moto" with a link.
- **Review tests before sign-off:** the *squint test* (is the access status the first thing seen?), the *remove-one-thing test* (delete the least useful element on each page; does anything suffer?), and the *sunlight test* (screenshots at 40% brightness, grayscale).
- **Honest tension:** "minimal" and "everything a rider needs at a glance" pull in opposite directions. Resolution: keep the go/no-go strip complete, and make everything else quieter and collapsible, instead of removing information.

## 4. Self-critique (senior design review of Direction A)

| Concern | Finding | Resolution |
|---|---|---|
| Generic patterns | Risk of "tech docs" sameness; status chips everywhere | Use a single, consistent status component; reserve chips for status only; everything else is plain text with rules |
| Unnecessary decoration | Contour motif could become wallpaper | Contours only appear inside map/profile contexts where they carry data; none in page backgrounds |
| Hierarchy | Too many equally bold data points in the go/no-go strip | Two levels: access and condition are the largest (with glyph + label); numeric stats are secondary mono |
| Card overuse | Brand site uses cards heavily | Lists are rows, details are sections with rules; boxes are used only for notices, forms and map panels |
| Spacing consistency | Dense data invites ad-hoc gaps | 4-px scale, only steps 1,2,3,4,6,8,12,16 used; components own their padding |
| Typography | Michroma is wide and legibility drops at small sizes or in running text | Display only, ≥ 24 px, ≤ 6 words per line; never for labels or numbers |
| Navigation clarity | Three primary actions plus Saved and account may crowd mobile | Bottom tab bar with 5 items, labels always visible |
| Unnecessary interactions | Hover cards, parallax, carousels | None. Gallery is a plain strip with a lightbox; map opens on explicit click |
| Accessibility | Blue accent on paper OK (8:1); muted text on tinted fills risks falling below 4.5:1 | Muted text only on paper/surface; tinted terrain fills never carry text |
| Performance | Map library is the heaviest asset | Lazy-load after first paint; the list is the primary view; fonts self-hosted, `swap` |
| Bright sunlight | Subtle greys wash out | Minimum text contrast 4.5:1, body 14:1+; no light-grey-on-white text; larger default sizes on mobile |

## 5. Status language (semantic colours + shape + text)

| Meaning | Glyph | Light-theme colour | Contrast on paper `#f2ede8` |
|---|---|---|---|
| Public / Open / Verified | filled circle ● | green `#2d6a3e` | 5.57 |
| Permission required / Seasonal / Needs re-check | triangle ▲ / diamond ◆ | amber-brown `#8a5a00` | 5.10 |
| Closed / Restricted / Private – no access | square ■ (or ⊘) | red `#a32d1c` | 6.12 |
| Unknown / Unverified | open circle ○ (dashed outline) | muted `#6b6560` | 4.94 |
| Informational | info glyph | blue `#2a5f8a` | 5.82 |

Each status always appears as **glyph + word**; colour only reinforces. Dark-theme counterparts (on `#1c1c1a`): green `#6fbf83` 7.69, amber `#e0a43a` 7.75, red `#ec8272` 6.50, muted `#a8a29b` 6.75, blue `#7fb2d6` 7.51.

## 6. Interaction principles
- Immediate feedback (< 100 ms) for every action; skeletons for loads > 300 ms; progress bars for uploads.
- Motion: 120–200 ms ease-out for state changes; no animation on scroll; honour `prefers-reduced-motion` by removing all non-essential transitions.
- Focus: 2 px survey-blue outline with 2 px offset on every interactive element; never removed.
- Touch: 44 px targets, 8 px gaps; primary actions at the bottom on mobile.
- Forms: labels above fields (never floating), hints before errors, errors state the fix.
- Maps: explicit controls (zoom, locate, layers); gestures supplemented by buttons; scroll-hijack avoided (two-finger pan on mobile pages where the map shares a scrolling page).

## 7. Image and map treatment (Direction A)
- Photos: 3:2 and 4:3 crops preserved; 2 px radius; caption + credit in mono 12 px; blurred placeholder; AVIF/WebP.
- Maps: paper land `#f2ede8`-family, desaturated water, contour lines at 15% ink, route in survey blue 4 px with 1.5 px white casing, start/end markers with letter labels (S/E), status glyph markers for trail starts, clusters as ink-outlined circles with counts. Always-visible attribution.
- Elevation profile: single-colour area in survey blue at 20% fill with a 1.5 px line, mono axis labels, hover/focus readouts mirrored in a table for accessibility.
