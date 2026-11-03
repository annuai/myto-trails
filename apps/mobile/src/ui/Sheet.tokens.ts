/** Sizes of a bottom sheet's own parts: its drag handle and how far it slides in. The corners, width and backdrop come from the shared tokens. */
export const sheet = { handleWidth: 40, handleHeight: 4, slide: 60, /** How long a sheet takes to slide away and to step back for one opened over it. */ exitMs: 220, recedeMs: 260,
  /** A sheet with one (or two) opened over it is drawn this much smaller and this high up, so its rounded top shows above the next; the one on top is this many percent shorter per level. */
  recedeScale: [1, 0.95, 0.91], recedeLift: [0, 14, 26], levelCut: 7, /** How much of the scrim colour lies over a sheet with one (or two) opened over it. */ recedeDim: [0, 0.5, 0.75] } as const;
