import { describe, expect, it } from 'vitest';
import { haversine, type LatLng } from './geo';
import { authorizeUrl, challengeFor, codeFromRedirect, multipartBody, OSM_TRIM_M, tokenBody, traceFor, trimmedForSharing, worthSharing } from './osm';

/** A straight ride north, one point every 20 m. */
const ride = (n: number, start = 0): LatLng[] => Array.from({ length: n }, (_, i) => ({ lat: 13 + ((start + i) * 20) / 111_320, lng: 77, t: 1_700_000_000_000 + i * 1000 }));

describe('worthSharing', () => {
  const r = { id: 'a', distanceKm: 5, points: ride(60) };
  it('shares a real GPS ride', () => expect(worthSharing(r, true)).toBe(true));
  it('never shares a simulated or imported ride, nor the old sample', () => {
    expect(worthSharing(r, false)).toBe(false);
    expect(worthSharing({ ...r, sample: true }, true)).toBe(false);
  });
  it('skips a ride too short or too sparse to help a mapper', () => {
    expect(worthSharing({ ...r, distanceKm: 0.5 }, true)).toBe(false);
    expect(worthSharing({ ...r, points: ride(10) }, true)).toBe(false);
  });
});

describe('trimmedForSharing', () => {
  it('cuts the start and the end of the ride so home is not published', () => {
    const pts = ride(200);
    const t = trimmedForSharing(pts, undefined);
    expect(haversine(pts[0]!, t.points[0]!)).toBeGreaterThanOrEqual(OSM_TRIM_M - 20);
    expect(haversine(pts[pts.length - 1]!, t.points[t.points.length - 1]!)).toBeGreaterThanOrEqual(OSM_TRIM_M - 20);
  });
  it('keeps each gap in the recording as a gap', () => {
    const pts = [...ride(100), ...ride(100, 400)];
    const t = trimmedForSharing(pts, [100]);
    expect(t.breaks).toHaveLength(1);
  });
  it('leaves nothing of a ride shorter than the cut', () => {
    expect(trimmedForSharing(ride(15), undefined).points).toEqual([]);
  });
});

describe('traceFor', () => {
  it('is a GPX with no ride name, no waypoints and the trimmed path', () => {
    const t = traceFor({ id: 'a', distanceKm: 8, points: ride(400) })!;
    expect(t.gpx).toContain('<trkseg>');
    expect(t.gpx).toContain('Motorcycle ride');
    expect(t.gpx).not.toContain('<wpt');
    expect(t.points).toBeLessThan(400);
  });
  it('is nothing when too little is left after trimming', () => {
    expect(traceFor({ id: 'a', distanceKm: 8, points: ride(30) })).toBeUndefined();
  });
});

describe('sign-in', () => {
  it('makes the PKCE challenge of the RFC 7636 example', () => {
    expect(challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('asks for only the permission to send traces, with a challenge', () => {
    const u = new URL(authorizeUrl({ challenge: 'c', state: 's', clientId: 'id' }));
    expect(u.searchParams.get('scope')).toBe('write_gpx');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('redirect_uri')).toBe('myto://osm');
  });
  it('reads the code from the redirect, and refuses a reply with another state', () => {
    expect(codeFromRedirect('myto://osm?code=abc&state=s', 's')).toEqual({ code: 'abc' });
    expect(codeFromRedirect('myto://osm?code=abc&state=other', 's')).toMatchObject({ error: expect.any(String) });
    expect(codeFromRedirect('myto://osm?error=access_denied&state=s', 's')).toEqual({ error: 'You did not allow it.' });
  });
  it('sends the verifier with the code', () => {
    expect(new URLSearchParams(tokenBody('abc', 'ver', 'id')).get('code_verifier')).toBe('ver');
  });
});

describe('multipartBody', () => {
  it('has the file, a tag and the anonymous visibility, and closes the form', () => {
    const b = multipartBody('XX', '<gpx/>');
    expect(b).toContain('name="visibility"\r\n\r\ntrackable');
    expect(b).toContain('filename="ride.gpx"');
    expect(b).toContain('<gpx/>');
    expect(b.endsWith('--XX--\r\n')).toBe(true);
  });
});
