import { describe, expect, it } from 'vitest';
import { buildGpx } from './gpx';
import { parseGpx } from './gpxImport';

describe('parseGpx', () => {
  it('reads a track with elevation and time, and its name', () => {
    const r = parseGpx(`<?xml version="1.0"?><gpx><trk><name>Dandeli &amp; back</name><trkseg>
      <trkpt lat="15.1" lon="74.5"><ele>600.5</ele><time>2026-10-01T04:00:00Z</time></trkpt>
      <trkpt lat='15.2' lon='74.6'><ele>650</ele></trkpt></trkseg></trk></gpx>`);
    expect(r.name).toBe('Dandeli & back');
    expect(r.points).toEqual([{ lat: 15.1, lng: 74.5, ele: 600.5, t: Date.parse('2026-10-01T04:00:00Z') }, { lat: 15.2, lng: 74.6, ele: 650 }]);
  });
  it('flattens several segments and keeps waypoints outside the track', () => {
    const r = parseGpx(`<gpx><wpt lat="15.15" lon="74.55"><name>Tea stall</name></wpt><trk><name>X</name>
      <trkseg><trkpt lat="15" lon="74"/><trkpt lat="15.1" lon="74.1"/></trkseg>
      <trkseg><trkpt lat="15.2" lon="74.2"/></trkseg></trk></gpx>`);
    expect(r.points).toHaveLength(3);
    expect(r.waypoints).toEqual([{ name: 'Tea stall', lat: 15.15, lng: 74.55 }]);
  });
  it('falls back to a route when there is no track, and to a default name', () => {
    const r = parseGpx('<gpx><rte><rtept lat="1" lon="2"/><rtept lat="1.1" lon="2.1"/></rte></gpx>');
    expect(r.points).toHaveLength(2);
    expect(r.name).toBe('Imported route');
  });
  it('uses the metadata name when the track has none', () => {
    const r = parseGpx('<gpx><metadata><name>From metadata</name></metadata><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.1" lon="2"/></trkseg></trk></gpx>');
    expect(r.name).toBe('From metadata');
  });
  it('skips points with bad coordinates and throws when no route is left', () => {
    expect(() => parseGpx('<gpx><trk><trkseg><trkpt lat="abc" lon="2"/><trkpt lat="95" lon="2"/></trkseg></trk></gpx>')).toThrow('no route');
    expect(() => parseGpx('not a gpx file')).toThrow();
  });
  it('round-trips what the app itself exports', () => {
    const pts = [{ lat: 12.5, lng: 77.5, ele: 900 }, { lat: 12.6, lng: 77.6, ele: 910 }];
    const r = parseGpx(buildGpx('My ride <1>', pts, [{ name: 'Fuel & water', lat: 12.55, lng: 77.55 }]));
    expect(r.name).toBe('My ride <1>');
    expect(r.points.map(({ lat, lng, ele }) => ({ lat, lng, ele }))).toEqual(pts);
    expect(r.waypoints).toEqual([{ name: 'Fuel & water', lat: 12.55, lng: 77.55 }]);
  });
});
