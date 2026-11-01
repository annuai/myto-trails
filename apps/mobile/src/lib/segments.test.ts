import { describe, expect, it } from 'vitest';
import { segmentFrame } from './segments';

describe('segmentFrame', () => {
  it('splits the track into equal segments after the padding', () => {
    expect(segmentFrame(0, 2, 300, 4)).toEqual({ x: 4, width: 146 });
    expect(segmentFrame(1, 2, 300, 4)).toEqual({ x: 150, width: 146 });
    expect(segmentFrame(2, 3, 300, 0)).toEqual({ x: 200, width: 100 });
  });
  it('stays at zero before the track has been measured', () => {
    expect(segmentFrame(1, 2, 0, 4)).toEqual({ x: 0, width: 0 });
  });
  it('keeps an out-of-range index on the nearest segment', () => {
    expect(segmentFrame(-1, 2, 300, 4).x).toBe(4);
    expect(segmentFrame(9, 2, 300, 4).x).toBe(150);
  });
});
