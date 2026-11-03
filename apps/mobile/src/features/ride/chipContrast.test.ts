import { describe, expect, it } from 'vitest';
import { dark, fixed, inkSolid } from '@/theme/tokens';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };

describe('the rider chips on the dark ink surface', () => {
  it('reads: white names, muted distances and the signal colours, all 4.5:1 or better', () => {
    for (const fg of [fixed.white, dark.muted, dark.stop, dark.caution]) expect(ratio(fg, inkSolid)).toBeGreaterThanOrEqual(4.5);
  });
  it('shows every rider colour on it, and the initial in ink on the rider colour', () => {
    for (const rider of dark.riders) { expect(ratio(rider, inkSolid)).toBeGreaterThanOrEqual(4.5); expect(ratio(inkSolid, rider)).toBeGreaterThanOrEqual(4.5); }
  });
});
