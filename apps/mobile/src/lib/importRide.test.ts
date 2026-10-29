import { describe, expect, it } from 'vitest';
import { isDuplicate, rideFromGpx } from './importRide';

const NOW = Date.UTC(2026, 10, 3, 9, 0);
/** A straight ride north: 11 points, 0.002 degrees (about 222 m) apart, so about 2.2 km. */
const gpx = (opts: { times?: boolean; name?: string; extra?: string } = {}) => {
  const pts = Array.from({ length: 11 }, (_, i) => {
    const t = opts.times ? `<time>${new Date(Date.UTC(2026, 9, 1, 5, 0, i * 20)).toISOString()}</time>` : '';
    return `<trkpt lat="${(12 + i * 0.002).toFixed(6)}" lon="77.600000">${t}</trkpt>`;
  }).join('');
  return `<?xml version="1.0"?><gpx version="1.1"><trk>${opts.name ? `<name>${opts.name}</name>` : ''}<trkseg>${pts}</trkseg></trk>${opts.extra ?? ''}</gpx>`;
};

describe('rideFromGpx', () => {
  it('takes start, duration, distance and top speed from a file with times', () => {
    const r = rideFromGpx(gpx({ times: true, name: 'Nandi sunrise' }), NOW);
    expect(r.name).toBe('Nandi sunrise');
    expect(r.startedAt).toBe(Date.UTC(2026, 9, 1, 5, 0, 0));
    expect(r.durationSec).toBe(200);
    expect(r.distanceKm).toBe(2.2);
    expect(r.maxKmh).toBe(40);
    expect(r.points).toHaveLength(11);
    expect(r.breaks).toEqual([]);
  });
  it('estimates the time of a file with none, says so in the name, and starts it now', () => {
    const r = rideFromGpx(gpx({ name: 'Old ride' }), NOW);
    expect(r.name).toBe('Old ride (time estimated)');
    expect(r.startedAt).toBe(NOW);
    expect(r.durationSec).toBe(Math.round((2.2 / 35) * 3600));
    expect(r.maxKmh).toBe(0);
  });
  it('names an unnamed file after the file, or "Imported ride"', () => {
    expect(rideFromGpx(gpx({ times: true }), NOW, 'ladakh-day-2.gpx').name).toBe('ladakh-day-2');
    expect(rideFromGpx(gpx({ times: true }), NOW).name).toBe('Imported ride');
  });
  it('keeps the waypoints in the file', () => {
    const r = rideFromGpx(gpx({ times: true, extra: '<wpt lat="12.01" lon="77.6"><name>Tea</name></wpt>' }), NOW);
    expect(r.waypoints).toEqual([{ name: 'Tea', lat: 12.01, lon: undefined, lng: 77.6 }].map(({ lon: _l, ...w }) => w));
  });
  it('refuses a file with no route, one point, or a track that never moves', () => {
    expect(() => rideFromGpx('<gpx></gpx>', NOW)).toThrow('There is no route in this file.');
    expect(() => rideFromGpx('<gpx><trk><trkseg><trkpt lat="12" lon="77"/></trkseg></trk></gpx>', NOW)).toThrow('There is no route in this file.');
    const still = `<gpx><trk><trkseg>${'<trkpt lat="12" lon="77"/>'.repeat(5)}</trkseg></trk></gpx>`;
    expect(() => rideFromGpx(still, NOW)).toThrow('no usable track points');
  });
});

describe('isDuplicate', () => {
  const stored = (xml: string) => ({ id: 'x', ...rideFromGpx(xml, NOW) });
  it('catches the same file imported twice, with or without times', () => {
    expect(isDuplicate([stored(gpx({ times: true }))], rideFromGpx(gpx({ times: true }), NOW))).toBe(true);
    expect(isDuplicate([stored(gpx())], rideFromGpx(gpx(), NOW + 3_600_000))).toBe(true);
  });
  it('is not fooled by a different ride', () => {
    const other = gpx({ times: true }).replaceAll('lon="77.600000"', 'lon="77.700000"');
    expect(isDuplicate([stored(gpx())], rideFromGpx(other, NOW))).toBe(false);
    expect(isDuplicate([], rideFromGpx(gpx(), NOW))).toBe(false);
  });
});
