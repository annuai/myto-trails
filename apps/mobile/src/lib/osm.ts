import { sha256 } from '@noble/hashes/sha2.js';
import type { LatLng } from './geo';
import { trimEnds } from './geo';
import { buildGpx } from './gpx';
import { breaksOf, segmentsOf } from './track';

/**
 * Sharing rides with OpenStreetMap, the free map this app draws. A rider who opts in sends each finished ride's path, with no name and
 * with its start and end cut off, as a GPS trace under their own OpenStreetMap account. Mappers use traces to add the roads and trails
 * the map is missing. Nothing goes through our servers. This file is the pure part: what may be shared, what is shared, and the sign-in
 * handshake (OAuth 2 with PKCE, no client secret to keep).
 */
export const OSM_SITE = process.env.EXPO_PUBLIC_OSM_SITE ?? 'https://www.openstreetmap.org';
export const OSM_API = process.env.EXPO_PUBLIC_OSM_API ?? 'https://api.openstreetmap.org';
/** The id of this app's registration on openstreetmap.org (Settings, OAuth 2 applications). Without it nothing can be shared. */
export const OSM_CLIENT_ID = process.env.EXPO_PUBLIC_OSM_CLIENT_ID ?? '';
export const OSM_REDIRECT = 'myto://osm';
export const OSM_SCOPE = 'write_gpx';
export const osmConfigured = (): boolean => OSM_CLIENT_ID.length > 0;

/** How much is cut off each end of a shared ride, so a home or workplace is never published. */
export const OSM_TRIM_M = 200;
/** A ride this short or sparse says nothing a mapper can use. */
export const OSM_MIN_KM = 1;
export const OSM_MIN_POINTS = 20;

/** "Anonymous, in order, with times": mappers can follow the path, and nothing says whose it is. */
export const OSM_VISIBILITY = 'trackable';

export type ShareableRide = { id: string; distanceKm: number; points: LatLng[]; breaks?: number[]; sample?: boolean };

/** Rides worth sharing: recorded on a phone's GPS (not simulated, not imported), long enough, and not the old sample. */
export function worthSharing(ride: ShareableRide, recordedByGps: boolean): boolean {
  return recordedByGps && !ride.sample && ride.distanceKm >= OSM_MIN_KM && ride.points.length >= OSM_MIN_POINTS;
}

/** The ride's path with the first and last stretch removed. Each gap in the recording stays a gap, so no line is drawn across one. */
export function trimmedForSharing(points: LatLng[], breaks: number[] | undefined, meters: number = OSM_TRIM_M): { points: LatLng[]; breaks: number[] } {
  const segments = segmentsOf(points, breaks);
  const last = segments.length - 1;
  const kept = segments.map((s, i) => (i === 0 || i === last ? trimEnds(s, meters) : s)).filter((s) => s.length > 1);
  return { points: kept.flat(), breaks: breaksOf(kept) };
}

/** The file to send, or nothing when too little is left after trimming. It carries no ride name and none of the rider's waypoints. */
export function traceFor(ride: ShareableRide): { gpx: string; points: number } | undefined {
  const t = trimmedForSharing(ride.points, ride.breaks);
  if (t.points.length < OSM_MIN_POINTS) return undefined;
  return { gpx: buildGpx('Motorcycle ride', t.points, [], t.breaks), points: t.points.length };
}

const base64url = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
/** A random string for the sign-in: the PKCE verifier and the state. */
export const randomToken = (bytes: Uint8Array): string => base64url(bytes);
/** The PKCE challenge for a verifier: its SHA-256, base64url. */
export const challengeFor = (verifier: string): string => base64url(sha256(new TextEncoder().encode(verifier)));

export function authorizeUrl(p: { challenge: string; state: string; clientId?: string }): string {
  const q = new URLSearchParams({ response_type: 'code', client_id: p.clientId ?? OSM_CLIENT_ID, redirect_uri: OSM_REDIRECT, scope: OSM_SCOPE, code_challenge: p.challenge, code_challenge_method: 'S256', state: p.state });
  return `${OSM_SITE}/oauth2/authorize?${q}`;
}

/** The code OpenStreetMap sent back, or why there is none. A reply with a different state is not ours and is refused. */
export function codeFromRedirect(url: string, state: string): { code: string } | { error: string } {
  const q = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '');
  if (q.get('error')) return { error: q.get('error') === 'access_denied' ? 'You did not allow it.' : 'OpenStreetMap refused the sign-in.' };
  if (q.get('state') !== state) return { error: 'That sign-in did not match. Try again.' };
  const code = q.get('code');
  return code ? { code } : { error: 'OpenStreetMap sent no code.' };
}

export const tokenBody = (code: string, verifier: string, clientId: string = OSM_CLIENT_ID): string =>
  new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: OSM_REDIRECT, client_id: clientId, code_verifier: verifier }).toString();

/** The body of the upload (a multipart form, written by hand so no temporary file is needed). The trace carries no description of the rider. */
export function multipartBody(boundary: string, gpx: string): string {
  const field = (name: string, value: string) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  return field('description', 'Ride recorded with Myto Moto') + field('tags', 'motorcycle,myto') + field('visibility', OSM_VISIBILITY)
    + `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="ride.gpx"\r\nContent-Type: application/gpx+xml\r\n\r\n${gpx}\r\n--${boundary}--\r\n`;
}
