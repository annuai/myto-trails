// Colours for the phone app, kept here with the rest of the tokens (apps/ may not contain hex values: npm run check:colors).
// Light values mirror trails.css and tokens.css; the dark palette and the app-only values follow docs/16 §3.
// TODO: generate this file from the CSS so the two cannot drift (docs/16 §7).
/**
 * What the app paints wherever it used to paint plain ink as a background: the primary button, a selected chip, the sliding tab
 * indicator, a solid badge, a ticked checkbox, a picked date, the progress bar, the ride bar and the dark cards.
 * One colour is a plain fill; two or more are a linear gradient from `start` to `end` (0 to 1 of the shape's width and height),
 * spread evenly. Change the colours here, or leave one, and every such surface follows (docs/design-tokens.md, "Ink fill").
 */
export type InkFill = { colors: readonly string[]; start: { x: number; y: number }; end: { x: number; y: number } };

/** Near-black with a deep blue-teal glow drifting down to the right, then back to near-black. Text on it is `onInk` (white): 7:1 or more on every stop. */
/** The soft blue-teal glow: near-black drifting to deep teal and back. Not in use right now; to bring it back, point `inkFillBlack` at these colours. */
export const inkFillGlow: InkFill = { colors: ["#0b0d12", "#0f1d28", "#12303f", "#0b0d12"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
/** The black fill in use: one colour, so every ink background is a plain solid. */
export const inkFillBlack: InkFill = { colors: ["#13161c"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
/** The dark theme's ink fill. The dark theme flips ink to cream, so its selected chips are cream: the same drift, from warm paper to a cool pale teal. Text on it is `onInk` (near-black). */
export const inkFillCream: InkFill = { colors: ["#f2ede8", "#e6eeee", "#d3e6ec", "#f2ede8"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
/** The colour for places that cannot show a gradient (a map pin's icon, behind a full-screen photo, a share image's backing). Keep it the first colour of `inkFillBlack`. */
export const inkSolid = "#13161c";

export type Palette = {
  paper: string; card: string; raised: string;
  /** The fill of a text box that sits on a card (the card colour would vanish into it). */
  field: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; accentSubtle: string;
  good: string; caution: string; stop: string; unknown: string;
  onInk: string;
  /** Small labels of a floating bar that are not selected (the bottom tab bar's names): `muted`, darker on light and lighter on dark, 7:1 or more on the bar. */
  tabLabel: string;
  /** The resting outline of a text box: 3:1 or more against paper, card and field (WCAG 1.4.11). `line` is only for dividers. */
  edge: string;
  /** The ink as a surface: see `InkFill`. Text and icons on it are `onInk`. */
  inkFill: InkFill;
  /** The Record button. */
  record: string;
  /** The four backgrounds of the Dash action cards, one per kind of card: the light tints on light, deep muted versions on dark. `ink` and `tabLabel` read on every one (4.5:1 or more). */
  cardTint: { clay: string; sage: string; sand: string; sky: string };
  /** The floating bars (bottom nav, header pill): white on light, the card colour on dark. */
  bar: string;
  /** The Myto logo. */
  logo: string;
  /**
   * One colour for each rider of a group ride, so a rider is the same colour on the map and in the list. Muted, earthy hues in the
   * Survey-sheet register, kept away from the accent blue and from the green, amber and red of status. Each reads as text (4.8:1 or
   * more) on the paper and raised colours of its theme; the light set also reads on the white label chips of the map.
   * Neighbouring entries differ in hue, so riders who sort next to each other are easy to tell apart. More riders than colours wrap round.
   */
  riders: readonly string[];
  /** Page background: the paper colour in the middle, a touch lighter and warmer at the top, a hint of survey blue at the bottom. */
  gradient: readonly [string, string, string];
};

export const light: Palette = {
  paper: "#f2ede8", card: "#fbf9f6", raised: "#f2f0ec", field: "#efe9e1", ink: "#1a1a1a", muted: "#6b6560", line: "rgba(0,0,0,0.10)",
  accent: "#1f4a6b", accentInk: "#ffffff", accentSubtle: "#e3ebf1",
  good: "#2d6a3e", caution: "#8a5a00", stop: "#a32d1c", unknown: "#6b6560",
  onInk: "#ffffff", tabLabel: "#58524d", edge: "#857e77", inkFill: inkFillBlack, record: "#b0442e", bar: "#ffffff", logo: "#1a1a1a",
  cardTint: { clay: "#efcfc2", sage: "#cfe0c8", sand: "#e8dccb", sky: "#cfdde8" },
  riders: ["#1e7380", "#a34393", "#5a6e1c", "#5241aa", "#89613e", "#b03b66", "#3d7157", "#8644a7"],
  gradient: ["#f8f4ef", "#f2ede8", "#e7ebee"],
};

export const dark: Palette = {
  paper: "#121211", card: "#1c1c1a", raised: "#242422", field: "#2a2a27", ink: "#f2ede8", muted: "#a8a29b", line: "rgba(255,255,255,0.14)",
  accent: "#8fbbdc", accentInk: "#121211", accentSubtle: "#223644",
  good: "#6fbf83", caution: "#e0a43a", stop: "#ec8272", unknown: "#a8a29b",
  onInk: "#121211", tabLabel: "#bdb7b0", edge: "#7f7a73", inkFill: inkFillCream, record: "#b0442e", bar: "#1c1c1a", logo: "#ffffff",
  cardTint: { clay: "#4a2f27", sage: "#2f3d2f", sand: "#3d352a", sky: "#27363f" },
  riders: ["#45c0d3", "#ca7dbd", "#afd147", "#988cd4", "#bb8f68", "#d47d9d", "#6aaf8c", "#b484cd"],
  gradient: ["#1b1b19", "#121211", "#0f1317"],
};

export const tints = { sand: "#e8dccb", sage: "#cfe0c8", clay: "#efcfc2", sky: "#cfdde8" } as const;

/** Colours that do not change with the theme. */
export const fixed = {
  white: "#ffffff",
  ink: "#1a1a1a",
  /** The ink fill of surfaces that are dark in both themes (the ride bar, the action banner): text on them is the dark palette's. */
  inkFill: inkFillBlack,
  /** Shadows. */
  shadow: "#000000",
  /** Behind the app on a wide web window. */
  frame: "#d9d4ce",
  /** The Stop button while held (white text on it). */
  stopFill: "#a32d1c",
  /** Pressed state of a dark control. */
  darkPressed: "#2c2c2a",
  /** Map and route art. */
  mapDay: "#e6e1da",
  mapNight: "#232321",
  artNight: "#2b2a27",
  route: "#1f4a6b",
  track: "#d9480f",
  /** The heat map colours on the light map, from a road ridden once to the road ridden most: a soft red, a warm red, the brand red (#be3a23), and a deep red. */
  heat: ["#f2a28c", "#e0553a", "#be3a23", "#7e1f12"],
  /** The same, for the dark map (inverted colours), where deep reds would vanish: the brand red brightens to orange-red, light orange and a pale glow. */
  heatNight: ["#b0442e", "#e2553a", "#ff8a5c", "#ffd9c4"],
  position: "#1f6feb",
} as const;
