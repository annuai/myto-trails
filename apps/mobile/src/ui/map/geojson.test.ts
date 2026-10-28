import { describe, expect, it } from 'vitest';
import { trackFeature } from './geojson';

const pts = [0, 1, 2, 3].map((i) => ({ lat: 13 + i * 0.001, lng: 77.6 }));

describe('trackFeature', () => {
  it('draws one line per GPS segment, so no line crosses a gap', () => {
    const f = trackFeature(pts, [2]);
    expect(f.geometry.type).toBe('MultiLineString');
    expect(f.geometry.coordinates).toEqual([[[77.6, 13], [77.6, 13.001]], [[77.6, 13.002], [77.6, 13.003]]]);
  });
  it('draws a single line when there are no breaks (rides saved before gaps were tracked)', () => {
    expect(trackFeature(pts).geometry.coordinates).toHaveLength(1);
    expect(trackFeature(pts).geometry.coordinates[0]).toHaveLength(4);
  });
  it('leaves out a segment with one point, which is not a line', () => {
    expect(trackFeature(pts, [3]).geometry.coordinates).toHaveLength(1);
  });
  it('is empty for no points', () => {
    expect(trackFeature().geometry.coordinates).toEqual([]);
    expect(trackFeature([]).geometry.coordinates).toEqual([]);
  });
});
