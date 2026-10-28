// Values mirror packages/tokens (light) plus the app-only dark palette from docs/16 §3.
// TODO: generate this file from packages/tokens (docs/16 §7) instead of copying.
import { dark, fixed, light, tints, type Palette } from '@moto-trails/tokens/mobile';

export { dark, fixed, light, tints };
export type { Palette };
export type Tone = 'ink' | 'muted' | 'accent' | 'good' | 'caution' | 'stop' | 'unknown' | 'onInk';
export type Tint = keyof typeof tints;

export const space = { half: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;
/** Fixed opacities: dimmed controls, pressed controls, and the darker tint behind pull-down strips. */
export const opacity = { overlay: 0.07, pressed: 0.85, disabled: 0.45 } as const;
export const radius = { control: 16, card: 24, chip: 999, thumb: 18 } as const;
/** Fixed sizes of pictures: riders, club covers and bikes. */
export const media = { avatarSm: 44, avatarMd: 52, avatarLg: 64, coverCard: 110, coverHero: 180, mapCard: 160, bikePhoto: 190, bikeThumbW: 72, bikeThumbH: 54 } as const;
export const size = { target: 48, button: 56, ride: 88, screenX: 20 } as const;

export const font = {
  regular: 'Geist_400Regular', medium: 'Geist_500Medium', semibold: 'Geist_600SemiBold',
  display: 'Michroma_400Regular',
  mono: 'GeistMono_400Regular', monoMedium: 'GeistMono_500Medium',
} as const;

export const type = {
  // Michroma for large titles, as on the website. It is wide and has one weight, so the sizes are smaller than Geist's.
  hero: { fontFamily: font.display, fontSize: 26, lineHeight: 34, letterSpacing: -0.2 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 32, letterSpacing: -0.1 },
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
  liveCompact: { fontFamily: font.monoMedium, fontSize: 56, lineHeight: 62, letterSpacing: -1 },
} as const;
export type TypeVariant = keyof typeof type;
