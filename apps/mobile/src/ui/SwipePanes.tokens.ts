/**
 * How the panes of a swipe-between view move. Times are milliseconds, distances fractions of the pane width unless a name says points.
 * `commit`: the pane carries on out of view after letting go; `enter`: the next pane slides in; `rest`: a short pull springs back.
 * `distance`: how far a pull must go to change pane; `flick` (points per millisecond) and `flickMin` (points): a quick flick changes it from less.
 * `edge`: how much of a pull past the first or last pane shows, up to `edgeMax` points. `lock`: points of sideways movement, and `lockRatio`:
 * how much more sideways than up or down, before the swipe takes over from the page's own scrolling. `fade`: how much the pane dims at the far edge.
 * `tap`: how far a pane slides in when the tabs are tapped instead of swiped.
 * `remeasureMs`: how long after the first layout the swipeable area is measured again, once an Android tab page has settled at its resting place.
 */
export const swipePanes = { commit: 140, enter: 240, rest: 180, distance: 0.25, flick: 0.5, flickMin: 20, edge: 0.25, edgeMax: 40, lock: 8, lockRatio: 1.5, fade: 0.5, tap: 0.12, remeasureMs: 350 } as const;
