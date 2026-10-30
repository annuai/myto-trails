// Values mirror packages/tokens (light) plus the app-only dark palette from docs/16 §3.
// TODO: generate this file from packages/tokens (docs/16 §7) instead of copying.
import { dark, fixed, light, tints, type Palette } from '@moto-trails/tokens/mobile';

export { dark, fixed, light, tints };
export type { Palette };
export type Tone = 'ink' | 'muted' | 'accent' | 'good' | 'caution' | 'stop' | 'unknown' | 'onInk';
export type Tint = keyof typeof tints;

export const space = { half: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;
/** The vertical rhythm of a page, in one place so every page matches: under the page title, between sections, and under a section heading. */
export const rhythm = { afterTitle: space[6], betweenSections: space[8], afterHeading: space[3] } as const;
/** Fixed opacities: dimmed controls, pressed controls, the darker tint behind pull-down strips, and a rider tile whose position is old. */
export const opacity = { overlay: 0.07, pressed: 0.85, disabled: 0.45, stale: 0.7 } as const;
/** `chip` is a pill or a circle (any shape rounded all the way); `sheet` is the top corners of a bottom sheet. */
export const radius = { control: 16, card: 24, chip: 999, thumb: 18, sheet: 28 } as const;
/** Fixed sizes of pictures: riders, club covers and bikes. */
export const media = { avatarSm: 44, avatarMd: 52, avatarLg: 64, coverCard: 110, coverHero: 180, mapCard: 160, bikePhoto: 190, bikeThumbW: 72, bikeThumbH: 54, riderTile: 168, trailThumb: 76, trailTileW: 176, trailTileH: 120, trailPhotoW: 260, trailPhotoH: 180 } as const;
/**
 * Sizes of controls and rows. `target` is the smallest thing a thumb is asked to hit; `compact` is a small round or square control;
 * `chip` is a chip's height; `row` and `rowTall` are list rows; `dot` is the small unread marker on a bell; `rule` is a border line.
 */
export const size = { target: 48, compact: 44, chip: 32, button: 56, bigButton: 72, textArea: 112, row: 64, rowTall: 72, ride: 88, screenX: 20, rule: 2, outline: 1.5, dot: 10, header: 56 } as const;
/** Widest a floating bar or a bottom sheet gets, on a big screen or sideways (`wideMax`). `frame` is the width of the phone-shaped frame the web test build draws, upright and sideways. */
export const layout = { barMax: 520, wideMax: 560, frame: 430, frameLandscape: 932 } as const;
/** Translucent colours that sit over other things: behind a sheet, over a hold button as it fills, the empty part of a progress bar, and a header that is not yet a pill. */
export const scrim = { sheet: 'rgba(0,0,0,0.45)', hold: 'rgba(255,255,255,0.28)', track: 'rgba(128,128,128,0.25)', clear: 'rgba(255,255,255,0)' } as const;
/** Shadows of things that float: the tab bar, the ride bar, and the record button. Spread one into a style. */
export const shadow = {
  bar: { shadowColor: fixed.shadow, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: space[1] }, elevation: 8 },
  ride: { shadowColor: fixed.shadow, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: space[1] } },
  header: { shadowColor: fixed.shadow, shadowRadius: 24, shadowOffset: { width: 0, height: space[1] } },
  record: { shadowColor: fixed.shadow, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: space[1] - 1 } },
} as const;
/** The picture at the very end of the You page. `fadeHeight`: how much of its top melts into the page colour. `fadeEndAlpha`: the page colour's opacity where the fade ends. */
export const footerPicture = { fadeHeight: '30%', fadeEndAlpha: 0 } as const;

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
  liveSecondaryCompact: { fontFamily: font.monoMedium, fontSize: 32, lineHeight: 36 },
} as const;
export type TypeVariant = keyof typeof type;
