// Colours for the phone app, kept here with the rest of the tokens (apps/ may not contain hex values: npm run check:colors).
// Light values mirror trails.css and tokens.css; the dark palette and the app-only values follow docs/16 §3.
// TODO: generate this file from the CSS so the two cannot drift (docs/16 §7).
export type Palette = {
  paper: string; card: string; raised: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; accentSubtle: string;
  good: string; caution: string; stop: string; unknown: string;
  onInk: string;
  /** The Record button. */
  record: string;
  /** The floating bars (bottom nav, header pill): white on light, the card colour on dark. */
  bar: string;
  /** The Myto logo. */
  logo: string;
  /** Page background: the paper colour in the middle, a touch lighter and warmer at the top, a hint of survey blue at the bottom. */
  gradient: readonly [string, string, string];
};

export const light: Palette = {
  paper: "#f2ede8", card: "#fbf9f6", raised: "#f2f0ec", ink: "#1a1a1a", muted: "#6b6560", line: "rgba(0,0,0,0.10)",
  accent: "#1f4a6b", accentInk: "#ffffff", accentSubtle: "#e3ebf1",
  good: "#2d6a3e", caution: "#8a5a00", stop: "#a32d1c", unknown: "#6b6560",
  onInk: "#ffffff", record: "#b0442e", bar: "#ffffff", logo: "#1a1a1a",
  gradient: ["#f8f4ef", "#f2ede8", "#e7ebee"],
};

export const dark: Palette = {
  paper: "#121211", card: "#1c1c1a", raised: "#242422", ink: "#f2ede8", muted: "#a8a29b", line: "rgba(255,255,255,0.14)",
  accent: "#8fbbdc", accentInk: "#121211", accentSubtle: "#223644",
  good: "#6fbf83", caution: "#e0a43a", stop: "#ec8272", unknown: "#a8a29b",
  onInk: "#121211", record: "#b0442e", bar: "#1c1c1a", logo: "#ffffff",
  gradient: ["#1b1b19", "#121211", "#0f1317"],
};

export const tints = { sand: "#e8dccb", sage: "#cfe0c8", clay: "#efcfc2", sky: "#cfdde8" } as const;

/** Colours that do not change with the theme. */
export const fixed = {
  white: "#ffffff",
  ink: "#1a1a1a",
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
  position: "#1f6feb",
} as const;
