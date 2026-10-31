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

## Rules

1. **Look for a token first.** If the value is on the `space` scale, use `space[n]`. If a role exists (`size.target`, `radius.card`), use that.
2. **Off the scale? Snap, don't add.** 6, 10, 14, 18 and 28 are not steps. Use the nearest step (halves round up: 6→8, 10→12, 14→16, 18→20, 28→32). Do not add a new space step for one screen.
3. **A shape used by several components becomes a shared role**; a size used by one component goes in its own `*.tokens.ts`, named for what it is (`sheet.handleWidth`, not `forty`).
4. **No numbers in conditions.** `landscape ? tabBar.recordLandscape : tabBar.record`, never `landscape ? 60 : 72`.
5. **Add a component, not a pile of styles.** Row of three buttons, card with a title, list row: if two screens write the same `View` with the same style, it should be a component in `src/ui`.
6. **Pages get their rhythm from the title.** The first thing under a `PageTitle` that is a `SectionTitle` takes `first`, so the title's gap is not doubled.

## What the 2026-10-30 refactor changed

All 226 literal values (and 19 more the old check could not see) became tokens across 34 files. Values that were already on the scale changed nothing. Off-scale spacing moved to the nearest step, which is visible only as small shifts: rows are 2 to 8 points narrower where a gap went 14 to 16, chips are 4 points wider, the open sheet's header is 4 points taller, and the longest page (Dash) is 10 points taller out of 1,956. Screen structure is identical: the same elements in the same order on all 25 screens measured, before and after.
