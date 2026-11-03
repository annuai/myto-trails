import { describe, expect, it } from 'vitest';
import { fromDirections, fromTrail } from './guidance';
import type { Guide } from './trailGuide';
import type { Directions } from './turnByTurn';

const line = [{ lat: 13, lng: 77 }, { lat: 13.01, lng: 77 }, { lat: 13.01, lng: 77.01 }];
const d: Directions = { line, totalM: 2200, etaMin: 10, steps: [{ text: 'Head north', kind: 'straight', atM: 0 }, { text: 'Turn right onto Hill Road', kind: 'right', atM: 1110 }, { text: 'You have arrived', kind: 'arrive', atM: 2200 }] };

describe('fromDirections', () => {
  it('names the next turn, how far it is and what is left', () => {
    const i = fromDirections(d, { lat: 13.005, lng: 77 }, 'Group destination');
    expect(i).toMatchObject({ kind: 'right', text: 'Turn right onto Hill Road', eyebrow: 'Group destination', off: false, arrived: false });
    expect(i.distM).toBeGreaterThan(400);
    expect(i.remainingM).toBeGreaterThan(1400);
    expect(i.etaMin).toBeGreaterThanOrEqual(1);
  });
  it('flags a rider far from the line, and an arrival near the end', () => {
    expect(fromDirections(d, { lat: 13.005, lng: 77.003 }, 'x').off).toBe(true);
    const done = fromDirections(d, { lat: 13.01, lng: 77.0099 }, 'x');
    expect(done).toMatchObject({ arrived: true, kind: 'arrive', distM: null, off: false });
  });
});

describe('fromTrail', () => {
  const on = (over: Partial<Guide>): Guide => ({ phase: 'on_trail', toStartM: 0, alongM: 0, remainingM: 3000, offM: 5, ...over });
  it('points to the start before the trail begins', () => {
    const i = fromTrail({ phase: 'to_start', toStartM: 800, alongM: 0, remainingM: 0, offM: 800 }, { lat: 13.01, lng: 77 }, { lat: 13, lng: 77 }, false);
    expect(i).toMatchObject({ eyebrow: 'To the start', distM: 800, text: 'Head north to the start' });
  });
  it('turns the trail bend into an instruction', () => {
    expect(fromTrail(on({ next: { dir: 'sharp left', distM: 120 } }), undefined, undefined, false)).toMatchObject({ kind: 'sharp left', distM: 120, text: 'Turn sharp left' });
  });
  it('follows the trail when no bend is near, and carries the off-route verdict', () => {
    expect(fromTrail(on({}), undefined, undefined, true)).toMatchObject({ kind: 'straight', distM: null, text: 'Follow the trail', off: true });
  });
  it('arrives at the end', () => {
    expect(fromTrail(on({ phase: 'finished' }), undefined, undefined, false)).toMatchObject({ arrived: true, kind: 'arrive' });
  });
});
