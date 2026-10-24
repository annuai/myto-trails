# 09 — Design system

Direction A "Survey sheet" (doc 08). This document defines tokens and components; it contains no implementation code beyond token names and values.

## 1. Inheritance model

```
@myto/tokens (shared, owned by the Myto brand)     ← verified values from myto-moto.com
   └─ color primitives, font families, spacing base, border hairline, motion base
@myto/trails-tokens (Trails layer)                  ← this product
   └─ accent, status colours, radii overrides, type scale for data, map tokens
semantic tokens (role-based)                        ← what components use
   └─ --surface, --text, --accent, --status-*, …
```
Components reference **semantic tokens only**. Changing the accent or the radii is a one-file change. The shared layer is extracted into a package once both apps consume it; until then it is a copy with a header comment naming the source.

## 2. Foundations

### Colour (light theme)
| Token | Value | Layer | Notes |
|---|---|---|---|
| `color.paper` | `#f2ede8` | shared (`--color-background`) | Page |
| `color.surface` | `#f2f0ec` | shared | Panels |
| `color.ink` | `#1a1a1a` | shared (`--color-foreground`) | Text, 14.96:1 on paper |
| `color.muted` | `#6b6560` | shared | Secondary text, 4.94:1 |
| `color.hairline` | `#00000014` | shared (`--color-border`) | Rules |
| `color.hairline-strong` | `#0000003d` | Trails | Inputs, focusable boundaries (needs ≥ 3:1 against the surface; verify at build) |
| `color.brand-red` | `#be3a23` | shared | Logo and brand moments only; not for status |
| `color.dark` | `#1c1c1a` | shared (`--color-card-dark`) | Footers, dark map theme |
| `color.clay / olive / sand / stone` | `#ddd4c8 #d8dbc9 #ddd7ca #e3ddd4` | shared | Terrain tints and non-text fills |
| `color.accent` | `#1f4a6b` | Trails | Survey blue: links, primary buttons, route line, focus. 8.02:1 on paper |
| `color.accent-hover` | `#173a55` | Trails | |
| `color.accent-subtle` | `#e3ebf1` | Trails | Selected rows, filled-chip background |

### Semantic colour
| Token | Light | Dark | Contrast on paper (light) |
|---|---|---|---|
| `status.good` (public, open, verified) | `#2d6a3e` | `#6fbf83` | 5.57 |
| `status.caution` (permission, seasonal, re-check) | `#8a5a00` | `#e0a43a` | 5.10 |
| `status.stop` (closed, restricted, private) | `#a32d1c` | `#ec8272` | 6.12 |
| `status.unknown` | `#6b6560` | `#a8a29b` | 4.94 |
| `status.info` | `#2a5f8a` | `#7fb2d6` | 5.82 |
| `focus.ring` | `#1f4a6b` | `#7fb2d6` | 8.02 |
| `error / success / warning` | alias `stop / good / caution` | | |

Rule: status colours never appear without a glyph and a word. Never use them for decoration. Tinted backgrounds for notices use 8–10% of the status colour with the full-strength text colour on top (check ≥ 4.5:1 on the tinted background at build time).

### Typography
| Role | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| Display | Michroma | 40/44 (28/32 mobile) | 400 | Page titles (≤ 6 words), wordmark |
| Heading 1 | Geist | 28/34 | 600 | Section/page headings |
| Heading 2 | Geist | 22/28 | 600 | Subsections |
| Heading 3 | Geist | 18/24 | 600 | Component titles |
| Body | Geist | 16/26 | 400 | Prose, ≤ 70ch |
| Body small | Geist | 14/20 | 400 | Row details, helper text |
| Label | Geist | 14/20 | 500 | Form labels, buttons |
| Data | Geist Mono / system mono, tabular numerals | 14/20 (large: 22/28) | 500 | Distance, elevation, dates, coordinates |
| Caption | Geist Mono | 12/16 | 400 | Photo credits, axis labels |
Rules: sentence case everywhere; no uppercase transforms (a deliberate departure from the marketing site); no more than two families plus the mono; minimum body size 16 on mobile; fonts self-hosted with `font-display: swap` and a size-adjusted fallback.

### Spacing
Base 4 px (matches Myto's `--spacing: .25rem`). Scale: `1=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48, 16=64`. Section gap 64 desktop / 48 mobile (minimal refinement, doc 08 §3b); component inner padding 12/16; list row padding 12 vertical.

### Layout grid and breakpoints
- Mobile `< 640` (4 col, 16 gutter-margin), Tablet `640–1023` (8 col, 24), Desktop `1024–1439` (12 col, 24), Wide `≥ 1440` (12 col, max container 1280).
- Content max widths: prose 70ch, forms 640 px, page 1280 px.
- Discovery split view: list 40% / map 60% at ≥ 1024.

### Shape, borders, shadows
- Radius: `0` (rules, tables), `2px` (images, inputs, chips), `4px` (buttons, panels), `9999px` only for avatars and the "count" badge. *Deliberately smaller than Myto's 16–32 px.* (D-3.)
- Borders: 1 px hairline; focus 2 px outline; notices have a 4 px left bar in the status colour *plus* icon and text.
- Shadows: none by default. One elevation token (`0 4px 16px #0000001f`) only for popovers, dialogs and the map bottom sheet.

### Iconography
Single set, 20 px grid, 1.5 px stroke, rounded joins; decorative icons are avoided. Status glyphs are a custom set (● ▲ ■ ◆ ○) drawn as SVG with the same stroke, always paired with text. Icons inherit `currentColor`.

### Motion
`motion.fast 120ms`, `motion.base 180ms`, `motion.slow 280ms` (sheets/dialogs). Easing: `cubic-bezier(.4,0,.2,1)` (same as Myto's default). `prefers-reduced-motion`: durations → 0, no parallax, no animated map flights (instant jumps).

### Map tokens
`map.route` (accent), `map.route-casing` (white), `map.route-width 4`, `map.contour` (ink 15%), `map.marker.*` (shape per status), `map.cluster` (paper fill, ink outline), `map.selected` (accent halo).

## 3. Component specification

Each component lists variants, sizes and states. All have visible focus. All sizes meet a 44 px touch height on mobile.

| Component | Variants | Sizes | States and notes |
|---|---|---|---|
| **Button** | primary (accent fill), secondary (outline), tertiary (text), destructive | sm 36 / md 44 / lg 48 | default, hover, focus, active, disabled (with reason via `aria-describedby`), loading (spinner + text kept) |
| **IconButton** | default, toggle (Save) | 44 | `aria-pressed` for toggles; tooltip with label |
| **Link** | inline, standalone with arrow | — | underlined by default; visited not styled differently |
| **TextField / TextArea / Select / Combobox** | default | 44 | label above, hint, error (text + icon), disabled, read-only; character counters where limits exist |
| **Checkbox / Radio / Switch** | — | 24 hit area 44 | native semantics |
| **FilterChip** | selectable, removable | 32 | `aria-pressed`; removal has `aria-label` "Remove Kerala filter" |
| **StatusBadge** | access, condition, verification | md | glyph + word + optional date; never colour-only |
| **Notice** | info, caution, stop | — | left bar, icon, title, body, optional action; `role="status"` or `alert` by severity |
| **TrailRow** | list, compact (map sheet), saved | — | whole row is one link; secondary actions outside the link; selected and hover states |
| **DataPair** | stacked, inline | — | label (body-small muted) + value (mono) |
| **Tabs** | underline | — | roving tabindex |
| **Dialog / Sheet** | centred, bottom sheet | — | focus trap, Esc, return focus |
| **Toast** | success, error, with Undo | — | polite live region; 6 s; pauses on hover/focus |
| **Pagination** | numbered | — | real links |
| **Stepper** | form steps | — | each step a link/button with completion state |
| **FileDrop** | GPX, images | — | drag state, constraints text, progress, error, retry |
| **Skeleton / EmptyState / ErrorState** | — | — | written copy with a next action |
| **Map controls** | zoom, locate, layers, fullscreen | 44 | keyboard-operable, labelled |
| **ElevationProfile** | chart + table toggle | — | chart is `role="img"` with summary; data table available |
| **Breadcrumbs** | — | — | `nav aria-label="Breadcrumb"`, structured data |
| **SearchCombobox** | grouped suggestions: Trails, Places, Regions | 48 | ARIA combobox pattern; result groups labelled; clear button; recent searches optional |
| **NearMeButton** | default, locating, denied | 44 | permission requested only on activation; denied state shows message and place-search fallback |
| **RadiusChips** | single select | 36 | 50 / 100 / 150 / 200 / 300 km; `aria-pressed` |
| **TravelTime** | inline, stacked | — | "≈ 1 h 50 each way · round trip ≈ 3 h 40"; "≈" always shown; footnote link explains estimate |
| **UserLocationMarker** | dot + accuracy circle | — | not colour-only: shape and an accessible name "Your location" |
| **SiteFooter** | — | — | link columns, Donate link, subsidiary statement; hairline above, no fill |

Accessibility checklist for every component: semantic element first, ARIA second; keyboard path; name/role/value; contrast verified; reduced-motion; touch target; tested with axe and a manual screen-reader pass on dialogs, combobox and map list.

## 4. Documentation approach
Token source of truth: one CSS file. A generated reference page (`/design` route behind auth/internal flag, later Storybook or a lightweight Ladle/Storybook-class tool) shows each component's variants and states; each component has a short `README` section in its folder: purpose, props, states, accessibility notes, do/don't. Changes to tokens require a visual-regression run.
