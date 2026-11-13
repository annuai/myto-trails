import { describe, expect, it } from 'vitest';
import { focusPoint } from './focusPoint';

const box = { width: 300, height: 400 };

describe('focus point', () => {
  it('passes a tap inside the picture through unchanged', () => {
    expect(focusPoint(120, 200, box)).toEqual({ x: 120, y: 200 });
  });

  it('pulls a tap at or past an edge just inside it, because the camera crashes the app on a point outside the picture', () => {
    expect(focusPoint(-5, 410, box)).toEqual({ x: 3, y: 396 });
    expect(focusPoint(300, 400, box)).toEqual({ x: 297, y: 396 });
    for (const [x, y] of [[-1e6, 1e6], [1e6, -1e6], [300.0001, 400.0001]] as const) {
      const p = focusPoint(x, y, box)!;
      expect(p.x / box.width).toBeGreaterThan(0);
      expect(p.x / box.width).toBeLessThan(1);
      expect(p.y / box.height).toBeGreaterThan(0);
      expect(p.y / box.height).toBeLessThan(1);
    }
  });

  it('does nothing before the picture has a size, or for a tap that is not a number', () => {
    expect(focusPoint(10, 10, { width: 0, height: 0 })).toBeUndefined();
    expect(focusPoint(NaN, 10, box)).toBeUndefined();
    expect(focusPoint(10, Infinity, box)).toBeUndefined();
  });
});
