// Values mirror packages/tokens (light) plus the app-only dark palette from docs/16 §3.
// TODO: generate this file from packages/tokens (docs/16 §7) instead of copying.
export type Palette = {
  paper: string; card: string; raised: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; accentSubtle: string;
  good: string; caution: string; stop: string; unknown: string;
  onInk: string;
};

export type Tone = 'ink' | 'muted' | 'accent' | 'good' | 'caution' | 'stop' | 'unknown' | 'onInk';

export const light: Palette = {
  paper: '#f2ede8', card: '#fbf9f6', raised: '#f2f0ec', ink: '#1a1a1a', muted: '#6b6560', line: 'rgba(0,0,0,0.10)',
  accent: '#1f4a6b', accentInk: '#ffffff', accentSubtle: '#e3ebf1',
  good: '#2d6a3e', caution: '#8a5a00', stop: '#a32d1c', unknown: '#6b6560',
  onInk: '#ffffff',
};

export const dark: Palette = {
  paper: '#121211', card: '#1c1c1a', raised: '#242422', ink: '#f2ede8', muted: '#a8a29b', line: 'rgba(255,255,255,0.14)',
  accent: '#8fbbdc', accentInk: '#121211', accentSubtle: '#223644',
  good: '#6fbf83', caution: '#e0a43a', stop: '#ec8272', unknown: '#a8a29b',
  onInk: '#121211',
};

export const tints = { sand: '#e8dccb', sage: '#cfe0c8', clay: '#efcfc2', sky: '#cfdde8' } as const;
export type Tint = keyof typeof tints;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;
export const radius = { control: 16, card: 24, chip: 999, thumb: 18 } as const;
export const size = { target: 48, button: 56, ride: 88, screenX: 20 } as const;

export const font = {
  regular: 'Geist_400Regular', medium: 'Geist_500Medium', semibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular', monoMedium: 'GeistMono_500Medium',
} as const;

export const type = {
  hero: { fontFamily: font.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  section: { fontFamily: font.semibold, fontSize: 21, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 17, lineHeight: 24 },
  bodyMedium: { fontFamily: font.medium, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: font.regular, fontSize: 15, lineHeight: 20 },
  labelMedium: { fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  data: { fontFamily: font.mono, fontSize: 15, lineHeight: 20 },
  dataLarge: { fontFamily: font.monoMedium, fontSize: 24, lineHeight: 30 },
  live: { fontFamily: font.monoMedium, fontSize: 80, lineHeight: 84, letterSpacing: -2 },
  liveSecondary: { fontFamily: font.monoMedium, fontSize: 40, lineHeight: 44 },
} as const;
export type TypeVariant = keyof typeof type;
