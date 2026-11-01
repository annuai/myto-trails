# Design tokens and components (phone app)

Every size, space, corner, shadow, opacity and overlay colour in `apps/mobile` comes from a token. `npm run check:tokens` fails on any literal number in a style (or in a condition such as `landscape ? 12 : 20`), on `rgba(...)`, and on shadow and layer values. The allowed baseline is empty, so new code starts clean.

## Three layers

| Layer | Where | What goes in it | Who uses it |
|---|---|---|---|
| Shared tokens | `src/theme/tokens.ts` | Scales and roles used by more than one component | Screens and components |
| Component tokens | `src/ui/<Component>.tokens.ts` | A size or corner that belongs to one component and has no use elsewhere | That component only |
| Components | `src/ui/*.tsx` | Buttons, cards, rows, sheets, chips, headers, `Stack` and `Inline` | Screens |

A screen should need almost no numbers of its own: it picks components and passes `space[n]` for gaps.

## Shared tokens (`theme/tokens.ts`)

| Token | Values | Use |
|---|---|---|
| `space` | `half` 2, 1 4, 2 8, 3 12, 4 16, 5 20, 6 24, 8 32, 12 48 | Gap, padding, margin, offsets |
| `rhythm` | `afterTitle` 24, `betweenSections` 32, `afterHeading` 12 | Vertical rhythm of a page (`PageTitle`, `SectionTitle`) |
| `radius` | `control` 16, `card` 24, `thumb` 18, `sheet` 28, `chip` 999 | Corners. `chip` is any pill or circle |
| `size` | `target` 48, `compact` 44, `chip` 32, `button` 56, `bigButton` 72, `textArea` 112, `row` 64, `rowTall` 72, `ride` 88, `rule` 2, `outline` 1.5, `dot` 10, `header` 56, `screenX` 20 | Control and row sizes, border lines |
| `media` | avatars, club covers, bike pictures, `trailThumb`, `trailTileW/H`, `trailPhotoW/H`, `mapCard`, `riderTile` | Fixed picture sizes |
| `layout` | `barMax` 520, `wideMax` 560, `frame` 430, `frameLandscape` 932 | Widest a bar or sheet gets; the web test frame |
| `opacity` | `overlay`, `pressed`, `disabled`, `stale` | Dimmed and pressed states |
| `scrim` | `sheet`, `hold`, `track`, `clear` | Translucent colours over other things |
| `shadow` | `bar`, `ride`, `record`, `header` | Floating things. Spread one into a style |
| `type` | `hero`, `title`, `section`, `body`, `label`, `caption`, `data`, `live`, `liveCompact`, `liveSecondary`, `liveSecondaryCompact`, … | Text. Use `<Text variant="…">`, not font sizes |
| `font` | families | Only inside `type` and `Text` |

Colours come from the palette (`useTheme().c`, `fixed`, `dark`, `light`); `check:colors` rejects hex literals.

`c.riders` is the group-ride rider palette: eight muted, earthy hues (teal, plum, olive, indigo, sienna, rose, sage, violet), each at least 4.5:1 on its theme's paper and raised colours, with a lighter set for dark. Map labels are white, so `riderColor(slot)` uses the light set there; lists pass `c.riders`. A rider's slot comes from their id, so every phone agrees.

## Ink fill (`inkFill`)

Every surface the app used to paint with plain ink (the primary button, a selected chip, the sliding tab indicator, a solid badge, a ticked checkbox, the progress bar and page dots, the ride bar, the action banner, the share cards) takes its fill from one token, drawn by one component, `<InkFill>` (`src/ui/InkFill.tsx`). Text and icons on it are `onInk`.

```ts
type InkFill = { colors: readonly string[]; start: { x: number; y: number }; end: { x: number; y: number } };
```

`colors` is spread evenly along the line from `start` to `end` (0 to 1 of the shape's width and height). **One colour is a plain solid fill** (`InkFill` renders a `View`); two or more are a gradient (`expo-linear-gradient`; iOS, Android and the web build).

The values live in `packages/tokens/src/mobile.ts`:

| Value | Used by | Look |
|---|---|---|
| `inkFillBlack` | the light palette's `inkFill`, and `fixed.inkFill` (surfaces that are dark in both themes: ride bar, banner, share cards) | near-black `#0b0d12` with a deep blue-teal glow (`#12303f`) drifting down to the right and back to near-black |
| `inkFillCream` | the dark palette's `inkFill` | the same drift in cream (the dark theme flips ink to cream, so its selected chips are light) |
| `inkSolid` | places that cannot show a gradient: a map pin and its icon, behind a full-screen photo, the backing under a share card | `#0b0d12`, the first stop of `inkFillBlack` |

**Back to one colour:** set `colors` to one entry, for example `colors: ["#0b0d12"]`. **A different gradient:** edit the stops, `start` and `end`. Keep `inkSolid` equal to the first stop of `inkFillBlack`.

**Rules for a new colour.** `contrast.test.ts` fails if `onInk` is under 7:1 on any stop, or if a stop is under 3:1 against paper, card and raised. Do not set `backgroundColor: c.ink` on a surface; use `<InkFill>`:

- on a `Pressable` or `View` with content, put `<InkFill layer style={{ borderRadius: radius.x }} />` as its first child. `layer` fills the parent behind the content and ignores touches, so size, press feedback and layout stay as they were. On the web, wrap a bare icon in a `View` so it paints above the layer;
- `always` uses the dark fill in either theme (for a surface inside `<Theme mode="dark">`);
- where the parent casts a shadow or is captured as an image, also give it `backgroundColor: inkSolid` under the layer.

Not converted on purpose: the 7% ink tint behind the pull-down quote (`PullQuote`), and strokes and text that use `fixed.ink` (the route line on the share card, map waypoint rings, a label on a white pin).

## Colour contrast (`theme/contrast.test.ts`)

The test computes WCAG 2.2 ratios for every text tone on every surface, in both themes: text 4.5:1, icons and outlines 3:1, `onInk` on the ink fill 7:1. Two tokens exist because of it: `tabLabel` (the unselected labels of the tab bar: `muted` is 5.7:1 on the bar, `tabLabel` 7.7:1) and `edge` (the resting outline of a text box, 3:1; `line` is only for dividers).

## Rules

1. **Look for a token first.** If the value is on the `space` scale, use `space[n]`. If a role exists (`size.target`, `radius.card`), use that.
2. **Off the scale? Snap, don't add.** 6, 10, 14, 18 and 28 are not steps. Use the nearest step (halves round up: 6→8, 10→12, 14→16, 18→20, 28→32). Do not add a new space step for one screen.
3. **A shape used by several components becomes a shared role**; a size used by one component goes in its own `*.tokens.ts`, named for what it is (`sheet.handleWidth`, not `forty`).
4. **No numbers in conditions.** `landscape ? tabBar.recordLandscape : tabBar.record`, never `landscape ? 60 : 72`.
5. **Add a component, not a pile of styles.** Row of three buttons, card with a title, list row: if two screens write the same `View` with the same style, it should be a component in `src/ui`.
6. **Pages get their rhythm from the title.** The first thing under a `PageTitle` that is a `SectionTitle` takes `first`, so the title's gap is not doubled.

## What the 2026-10-30 refactor changed

All 226 literal values (and 19 more the old check could not see) became tokens across 34 files. Values that were already on the scale changed nothing. Off-scale spacing moved to the nearest step, which is visible only as small shifts: rows are 2 to 8 points narrower where a gap went 14 to 16, chips are 4 points wider, the open sheet's header is 4 points taller, and the longest page (Dash) is 10 points taller out of 1,956. Screen structure is identical: the same elements in the same order on all 25 screens measured, before and after.
