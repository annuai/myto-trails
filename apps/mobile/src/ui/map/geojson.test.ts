import { describe, expect, it } from 'vitest';
import { lineFeature, trackFeature } from './geojson';

const pts = [0, 1, 2, 3].map((i) => ({ lat: 13 + i * 0.001, lng: 77.6 }));
const geometry = (fc: { features: { geometry: unknown }[] }) => fc.features[0]?.geometry as { type: string; coordinates: unknown[] };

describe('trackFeature', () => {
  it('draws one line per GPS segment, so no line crosses a gap', () => {
    const g = geometry(trackFeature(pts, [2]));
    expect(g.type).toBe('MultiLineString');
    expect(g.coordinates).toEqual([[[77.6, 13], [77.6, 13.001]], [[77.6, 13.002], [77.6, 13.003]]]);
  });
  it('draws a single line when there are no breaks (rides saved before gaps were tracked)', () => {
    expect(geometry(trackFeature(pts)).coordinates).toHaveLength(1);
    expect(geometry(trackFeature(pts)).coordinates[0]).toHaveLength(4);
  });
  it('leaves out a segment with one point, which is not a line', () => {
    expect(geometry(trackFeature(pts, [3])).coordinates).toHaveLength(1);
  });
  it('is an empty collection for no points: Android refuses an empty line and then draws nothing', () => {
    expect(trackFeature()).toEqual({ type: 'FeatureCollection', features: [] });
    expect(trackFeature([pts[0]!])).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('lineFeature', () => {
  it('draws the points as one line', () => {
    expect(geometry(lineFeature(pts.slice(0, 2)))).toEqual({ type: 'LineString', coordinates: [[77.6, 13], [77.6, 13.001]] });
  });
  it('is an empty collection below two points, never a line Android would refuse', () => {
    expect(lineFeature()).toEqual({ type: 'FeatureCollection', features: [] });
    expect(lineFeature([pts[0]!])).toEqual({ type: 'FeatureCollection', features: [] });
  });
});
