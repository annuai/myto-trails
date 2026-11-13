import { describe, expect, it } from 'vitest';
import { CARD_SIZE, type CardFormat } from './rideCard';
import { CARD_PAD } from './cardMap';
import { PLACEMENT_LIMITS, clampPlacement, defaultPlacement, dragPlacement, overlayBox, pinchPlacement } from './photoCard';

const card = CARD_SIZE.story;
const stat = { key: 'distance', label: 'Distance', parts: [] } as const;
const bar = overlayBox('bar', { stats: [], route: [{ x: 0, y: 0 }] });
const inside = (p: { x: number; y: number; scale: number }, box: { width: number; height: number }, c: { width: number; height: number }) => {
  const hw = (box.width * p.scale) / 2, hh = (box.height * p.scale) / 2;
  return p.x * c.width - hw >= -1e-6 && p.x * c.width + hw <= c.width + 1e-6 && p.y * c.height - hh >= -1e-6 && p.y * c.height + hh <= c.height + 1e-6;
};

describe('overlayBox', () => {
  it('bar height is 190 without a route and 300 with one', () => {
    expect(overlayBox('bar', { stats: [], route: null }).height).toBe(190);
    expect(bar.height).toBe(300);
    expect(bar.width).toBe(1080 - 2 * CARD_PAD);
  });
  it('corner is 540 wide and grows 130 per stat', () => {
    const b = overlayBox('corner', { stats: [stat, stat, stat] as never, route: null });
    expect(b).toEqual({ width: 540, height: 3 * 130 + 40 });
    expect(overlayBox('corner', { stats: [], route: [{ x: 0, y: 0 }] }).height).toBe(440);
  });
});

describe('clampPlacement', () => {
  it('limits scale and keeps the box inside; wider-than-card is centred', () => {
    const p = clampPlacement({ x: 2, y: -1, scale: 9 }, bar, card);
    expect(p.scale).toBe(PLACEMENT_LIMITS.maxScale);
    expect(p.x).toBe(0.5);
    expect(inside({ ...p, x: 0.5 }, { width: bar.width, height: bar.height }, card) || bar.width * 2.2 > card.width).toBe(true);
    expect(p.y).toBeGreaterThan(0);
  });
  it('pulls an out-of-bounds centre back inside', () => {
    const p = clampPlacement({ x: 2, y: -1, scale: 0.6 }, bar, card);
    expect(inside(p, bar, card)).toBe(true);
    expect(p.x).toBeCloseTo(1 - (bar.width * 0.6) / 2 / card.width);
  });
  it('centres on an axis the overlay overflows, never NaN', () => {
    const big = { width: 5000, height: 5000 };
    const p = clampPlacement({ x: 0.1, y: 0.9, scale: 1 }, big, card);
    expect(p).toEqual({ x: 0.5, y: 0.5, scale: 1 });
    expect(Object.values(clampPlacement({ x: NaN, y: Infinity, scale: NaN }, bar, card)).every(Number.isFinite)).toBe(true);
  });
});

describe('dragPlacement', () => {
  it('moves by dx/width when not clamped', () => {
    const box = { width: 300, height: 200 };
    const p = dragPlacement({ x: 0.5, y: 0.5, scale: 1 }, 100, 0, box, card);
    expect(p.x).toBeCloseTo(0.5 + 100 / 1080);
    expect(p.y).toBe(0.5);
  });
  it('never leaves the picture', () => {
    const box = { width: 300, height: 200 };
    const p = dragPlacement({ x: 0.5, y: 0.5, scale: 1 }, 99999, -99999, box, card);
    expect(inside(p, box, card)).toBe(true);
  });
});

describe('pinchPlacement', () => {
  it('clamps scale to the minimum and the maximum', () => {
    const start = { x: 0.5, y: 0.5, scale: 1 };
    expect(pinchPlacement(start, 0.1, bar, card).scale).toBe(0.6);
    expect(pinchPlacement({ x: 0.5, y: 0.5, scale: 1 }, 50, { width: 100, height: 100 }, card).scale).toBe(2.2);
  });
  it('keeps the box inside after growing', () => {
    const box = { width: 300, height: 200 };
    const p = pinchPlacement({ x: 0.95, y: 0.95, scale: 1 }, 2, box, card);
    expect(inside(p, box, card)).toBe(true);
  });
});

describe('defaultPlacement', () => {
  for (const f of ['story', 'post', 'square'] as CardFormat[]) {
    const c = CARD_SIZE[f];
    it(`bar sits bottom-centred with a CARD_PAD margin (${f})`, () => {
      const p = defaultPlacement('bar', c, bar);
      expect(p.scale).toBe(1);
      expect(p.x).toBe(0.5);
      expect(p.y * c.height + bar.height / 2).toBeCloseTo(c.height - CARD_PAD);
      expect(inside(p, bar, c)).toBe(true);
    });
    it(`corner sits top-left with a CARD_PAD margin (${f})`, () => {
      const box = overlayBox('corner', { stats: [stat, stat, stat] as never, route: null });
      const p = defaultPlacement('corner', c, box);
      expect(p.x * c.width - box.width / 2).toBeCloseTo(CARD_PAD);
      expect(p.y * c.height - box.height / 2).toBeCloseTo(CARD_PAD);
    });
  }
  it('centres a box larger than the card', () => {
    const p = defaultPlacement('corner', card, { width: 2000, height: 3000 });
    expect(p).toEqual({ x: 0.5, y: 0.5, scale: 1 });
  });
});
