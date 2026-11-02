import { describe, expect, it } from 'vitest';
import { navigateStep, parseDirections, turnKind, type Directions } from './turnByTurn';

/** Google's polyline encoding of (0,0) (0,0.001) (0.001,0.001) at Valhalla's 6 places: east 111 m, then north 111 m. */
const enc = (pts: [number, number][]) => {
  let la = 0, lo = 0, out = '';
  const put = (v: number) => { let n = v < 0 ? ~(v << 1) : v << 1; while (n >= 0x20) { out += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; } out += String.fromCharCode(n + 63); };
  for (const [a, b] of pts) { const A = Math.round(a * 1e6), B = Math.round(b * 1e6); put(A - la); put(B - lo); la = A; lo = B; }
  return out;
};

const body = { trip: { summary: { time: 60 }, legs: [{ shape: enc([[0, 0], [0, 0.001], [0.001, 0.001]]), maneuvers: [
  { instruction: 'Drive east.', type: 1, begin_shape_index: 0 },
  { instruction: 'Turn left.', type: 15, begin_shape_index: 1 },
  { instruction: 'You have arrived.', type: 4, begin_shape_index: 2 },
] }] } };

describe('turnKind', () => {
  it('folds Valhalla types to what is drawn', () => {
    expect([15, 10, 9, 16, 11, 14, 12, 26, 4, 8].map(turnKind)).toEqual(['left', 'right', 'slight right', 'slight left', 'sharp right', 'sharp left', 'uturn', 'roundabout', 'arrive', 'straight']);
  });
});

describe('parseDirections', () => {
  it('places each turn by its distance along the line', () => {
    const d = parseDirections(body);
    expect(d.steps.map((s) => s.kind)).toEqual(['straight', 'left', 'arrive']);
    expect(d.steps[1]!.atM).toBeGreaterThan(105);
    expect(d.steps[1]!.atM).toBeLessThan(117);
    expect(d.totalM).toBeGreaterThan(215);
    expect(d.etaMin).toBe(1);
  });
  it('rejects an answer with no route', () => {
    expect(() => parseDirections({ trip: { legs: [] } })).toThrow();
  });
});

describe('navigateStep', () => {
  const d: Directions = parseDirections(body);
  it('names the first turn and how far it is from the start', () => {
    const n = navigateStep(d, { lat: 0, lng: 0 });
    expect(n.next.kind).toBe('left');
    expect(n.toNextM).toBeGreaterThan(105);
    expect(n.arrived).toBe(false);
  });
  it('moves on to the arrival after the turn', () => {
    const n = navigateStep(d, { lat: 0.0005, lng: 0.001 });
    expect(n.next.kind).toBe('arrive');
    expect(n.remainingM).toBeGreaterThan(50);
    expect(n.remainingM).toBeLessThan(60);
  });
  it('is arrived near the end, and reports how far off the line a rider is', () => {
    expect(navigateStep(d, { lat: 0.001, lng: 0.001 }).arrived).toBe(true);
    expect(navigateStep(d, { lat: 0, lng: 0.0005 + 0.001 }).offM).toBeGreaterThan(50);
  });
});
