import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { trackOnLine } from './routeFollow';

const M = 111_320;
const P = (x: number, y: number): LatLng => ({ lat: y / M, lng: x / M });
/** Out 1 km east and back 1 km west on a road 10 m to the side: the two passes lie on top of each other. */
const OUT_BACK = [P(0, 0), P(1000, 0), P(1000, 10), P(0, 10)];

describe('trackOnLine', () => {
  it('keeps a rider on the pass they are riding where the road runs beside itself', () => {
    // GPS drift puts each rider nearer the other pass; the tracked match stays on their own.
    expect(trackOnLine(OUT_BACK, P(500, 6), 400)!.alongM).toBeLessThan(600);
    expect(trackOnLine(OUT_BACK, P(500, 4), 1400)!.alongM).toBeGreaterThan(1400);
  });
  it('jumps to another part of the line when the rider is clearly there', () => {
    const line = [P(0, 0), P(5000, 0)];
    expect(trackOnLine(line, P(4000, 0), 100)!.alongM).toBeGreaterThan(3900);
  });
  it('matches anywhere when there is no previous spot', () => {
    expect(trackOnLine(OUT_BACK, P(200, 0), undefined)!.alongM).toBeCloseTo(200, -1);
  });
});
