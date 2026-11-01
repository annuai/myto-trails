import { describe, expect, it } from 'vitest';
import { dark, fixed, light, type Palette } from './tokens';

/** WCAG 2.2 relative luminance and contrast ratio of two `#rrggbb` colours. */
const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255); };
const ratio = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };

const TEXT = 4.5; // normal text
const UI = 3; // component boundaries, icons, state indicators
const INK = 7; // text on the ink fill: held to a higher bar so the glow can never weaken it

const themes: [string, Palette][] = [['light', light], ['dark', dark]];
const words = ['ink', 'muted', 'accent', 'good', 'caution', 'stop', 'unknown'] as const;
const surfaces = ['paper', 'card', 'raised', 'field', 'accentSubtle', 'bar'] as const;

describe.each(themes)('contrast, %s theme', (_name, p) => {
  it.each(words.flatMap((w) => surfaces.map((s) => [w, s] as const)))('%s text on %s is at least 4.5:1', (w, s) => {
    expect(ratio(p[w], p[s])).toBeGreaterThanOrEqual(TEXT);
  });

  it('text tones on every stop of the page gradient are at least 4.5:1', () => {
    for (const stop of p.gradient) for (const w of words) expect(ratio(p[w], stop), `${w} on ${stop}`).toBeGreaterThanOrEqual(TEXT);
  });

  it('onInk is at least 7:1 on every stop of the ink fill', () => {
    for (const stop of p.inkFill.colors) expect(ratio(p.onInk, stop), `onInk on ${stop}`).toBeGreaterThanOrEqual(INK);
  });

  it('every stop of the ink fill stands apart from the page, a card and the raised surface (3:1)', () => {
    for (const stop of p.inkFill.colors) for (const s of ['paper', 'card', 'raised'] as const) expect(ratio(stop, p[s]), `${stop} on ${s}`).toBeGreaterThanOrEqual(UI);
  });

  it('accentInk on the accent fill is at least 4.5:1', () => {
    expect(ratio(p.accentInk, p.accent)).toBeGreaterThanOrEqual(TEXT);
  });

  it('tab bar labels: selected ink, unselected tabLabel (7:1 on the bar, 4.5:1 on the selected pill)', () => {
    expect(ratio(p.ink, p.bar)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(p.ink, p.paper)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(p.tabLabel, p.bar)).toBeGreaterThanOrEqual(INK);
    expect(ratio(p.tabLabel, p.paper)).toBeGreaterThanOrEqual(TEXT);
  });

  it('the resting outline of a text box, and an unticked checkbox, are at least 3:1 on paper, card and field', () => {
    for (const s of ['paper', 'card', 'field'] as const) {
      expect(ratio(p.edge, p[s]), `edge on ${s}`).toBeGreaterThanOrEqual(UI);
      expect(ratio(p.muted, p[s]), `muted on ${s}`).toBeGreaterThanOrEqual(UI);
    }
  });

  it('rider colours read as text on paper and raised', () => {
    for (const r of p.riders) for (const s of ['paper', 'raised'] as const) expect(ratio(r, p[s]), `${r} on ${s}`).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('surfaces that are dark in both themes (ride bar, action banner, share cards)', () => {
  it('dark-palette text on every stop of the always-dark fill: ink and white 7:1, the rest 4.5:1', () => {
    for (const stop of fixed.inkFill.colors) {
      expect(ratio(dark.ink, stop), `ink on ${stop}`).toBeGreaterThanOrEqual(INK);
      expect(ratio(fixed.white, stop), `white on ${stop}`).toBeGreaterThanOrEqual(INK);
      for (const w of ['muted', 'accent', 'caution', 'stop'] as const) expect(ratio(dark[w], stop), `${w} on ${stop}`).toBeGreaterThanOrEqual(TEXT);
    }
  });
  it('white labels on the record and stop fills are at least 4.5:1', () => {
    expect(ratio(fixed.white, light.record)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(fixed.white, fixed.stopFill)).toBeGreaterThanOrEqual(TEXT);
  });
  it('the banner icon chip (caution on raised) is at least 3:1', () => {
    expect(ratio(dark.caution, dark.raised)).toBeGreaterThanOrEqual(UI);
  });
});
