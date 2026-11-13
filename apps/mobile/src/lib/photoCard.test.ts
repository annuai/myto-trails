import { describe, expect, it } from 'vitest';
import { CARD_SIZE, type CardFormat } from './rideCard';
import { CARD_PAD } from './cardMap';
import { PLACEMENT_LIMITS, clampPlacement, defaultPlacement, dragPlacement, overlayBox, pinchPlacement, toPictureDelta, applyPan, applyPinch, placementAfterFormatChange, currentPlacement } from './photoCard';

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
  it('limits scale; a wider-than-card overlay is centred on x and clamped exactly on y', () => {
    const lo = clampPlacement({ x: 2, y: 0, scale: 9 }, bar, card);
    expect(lo).toEqual({ x: 0.5, y: 330 / 1920, scale: 2.2 });
    const hi = clampPlacement({ x: 2, y: 5, scale: 9 }, bar, card);
    expect(hi).toEqual({ x: 0.5, y: 1 - 330 / 1920, scale: 2.2 });
  });
  it('raises a too-small scale to the minimum', () => {
    expect(clampPlacement({ x: 0.5, y: 0.5, scale: 0.1 }, bar, card).scale).toBe(0.6);
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
    expect(clampPlacement({ x: NaN, y: Infinity, scale: NaN }, bar, card)).toEqual({ x: 0.5, y: 0.5, scale: 1 });
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
    expect(dragPlacement({ x: 0.5, y: 0.5, scale: 1 }, 99999, -99999, box, card)).toEqual({ x: 1 - 150 / 1080, y: 100 / 1920, scale: 1 });
    expect(dragPlacement({ x: 0.5, y: 0.5, scale: 1 }, -99999, 99999, box, card)).toEqual({ x: 150 / 1080, y: 1 - 100 / 1920, scale: 1 });
  });
});

describe('pinchPlacement', () => {
  it('clamps scale to the minimum and the maximum', () => {
    const start = { x: 0.5, y: 0.5, scale: 1 };
    expect(pinchPlacement(start, 0.1, bar, card).scale).toBe(0.6);
    expect(pinchPlacement({ x: 0.5, y: 0.5, scale: 1 }, 50, { width: 100, height: 100 }, card).scale).toBe(2.2);
  });
  it('keeps the centre when the result still fits', () => {
    const box = { width: 300, height: 200 };
    expect(pinchPlacement({ x: 0.5, y: 0.5, scale: 1 }, 1.5, box, card)).toEqual({ x: 0.5, y: 0.5, scale: 1.5 });
  });
  it('keeps the centre, then clamps to the exact edge after growing', () => {
    const box = { width: 300, height: 200 };
    const p = pinchPlacement({ x: 0.95, y: 0.95, scale: 1 }, 2, box, card);
    expect(p).toEqual({ x: 1 - 300 / 1080, y: 1 - 200 / 1920, scale: 2 });
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
  for (const f of ['story', 'post', 'square'] as CardFormat[]) {
    const c = CARD_SIZE[f];
    it(`corner with a route and bar without a route keep exact margins (${f})`, () => {
      const route = [{ x: 0, y: 0 }];
      const cb = overlayBox('corner', { stats: [stat, stat] as never, route });
      expect(cb.height).toBe(400 + 2 * 130 + 40);
      const cp = defaultPlacement('corner', c, cb);
      expect(cp.x * c.width - cb.width / 2).toBeCloseTo(CARD_PAD);
      expect(cp.y * c.height - cb.height / 2).toBeCloseTo(CARD_PAD);
      const bb = overlayBox('bar', { stats: [], route: null });
      expect(bb.height).toBe(190);
      const bp = defaultPlacement('bar', c, bb);
      expect(bp.x).toBe(0.5);
      expect(c.height - (bp.y * c.height + bb.height / 2)).toBeCloseTo(CARD_PAD);
      expect(bp.x * c.width - bb.width / 2).toBeCloseTo(CARD_PAD);
    });
  }
  it('centres a box larger than the card', () => {
    const p = defaultPlacement('corner', card, { width: 2000, height: 3000 });
    expect(p).toEqual({ x: 0.5, y: 0.5, scale: 1 });
  });
});

describe('toPictureDelta', () => {
  it('converts screen pixels to picture pixels', () => {
    expect(toPictureDelta(50, 220, 1080)).toBe((50 * 1080) / 220);
    expect(toPictureDelta(-10, 540, 1080)).toBe(-20);
  });
});

describe('applyPan and applyPinch', () => {
  const shown = { width: 360, height: 640 };
  const big = { width: 400, height: 300 };
  const start = { x: 0.5, y: 0.5, scale: 1 };
  it('accumulates two pan deltas applied to the returned value', () => {
    const a = applyPan(start, 36, 0, shown, big, card);
    const b = applyPan(a, 36, 0, shown, big, card);
    expect(b.x).toBeCloseTo(0.5 + (2 * 36 * card.width) / shown.width / card.width);
  });
  it('keeps the pan x and y on a pinch after a pan', () => {
    const panned = applyPan(start, 18, 32, shown, big, card);
    const pinched = applyPinch(panned, 1, 1.5, big, card);
    expect(pinched.x).toBe(panned.x);
    expect(pinched.y).toBe(panned.y);
    expect(pinched.scale).toBe(1.5);
  });
});

describe('placementAfterFormatChange', () => {
  const square = CARD_SIZE.square;
  it('keeps a bar placement unchanged from square to story (the fractions still fit)', () => {
    const p = defaultPlacement('bar', square, bar);
    expect(placementAfterFormatChange(p, bar, card)).toEqual(p);
  });
  it('clamps a low bar placement from story into the shorter square', () => {
    const next = placementAfterFormatChange({ x: 0.5, y: 0.95, scale: 1 }, bar, square);
    expect(next).toEqual({ x: 0.5, y: 1 - 150 / 1080, scale: 1 });
    expect(inside(next, bar, square)).toBe(true);
  });
});

describe('currentPlacement', () => {
  it('is the layout default when the rider has not moved the overlay', () => {
    expect(currentPlacement(null, 'corner', bar, card)).toEqual(defaultPlacement('corner', card, bar));
  });
  it('re-clamps a moved overlay when more stats make the corner box taller', () => {
    const two = overlayBox('corner', { stats: [stat, stat] as never, route: [{ x: 0, y: 0 }] });
    const four = overlayBox('corner', { stats: [stat, stat, stat, stat] as never, route: [{ x: 0, y: 0 }] });
    const low = { x: 0.5, y: 1 - two.height / 2 / card.height, scale: 1 };
    const next = currentPlacement(low, 'corner', four, card);
    expect(next.y).toBeCloseTo(1 - four.height / 2 / card.height);
    expect(inside(next, four, card)).toBe(true);
  });
  it('keeps a moved bar where it is when Hide route makes the box shorter', () => {
    const plain = overlayBox('bar', { stats: [], route: null });
    const p = { x: 0.5, y: 0.6, scale: 1.4 };
    expect(currentPlacement(p, 'bar', plain, card)).toEqual(p);
  });
});
