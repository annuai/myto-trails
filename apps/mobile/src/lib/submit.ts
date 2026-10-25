import { ApiFailure, api } from '@/api/client';
import { SITE_BASE } from '@/api/config';
import type { LatLng } from './geo';
import { buildGpx } from './gpx';

export type RideSubmission = {
  clientId: string; name: string; summary: string; state: string; district: string; nearestTown: string;
  difficulty: string; terrain: string[]; routeShape: string;
  accessClass: string; basis: string; evidence: string; permissionInstructions: string;
  points: LatLng[]; waypoints: { name: string; lat: number; lng: number }[]; contributorNote?: string;
};
export type Progress = (step: string) => void;

type Check = { status: string; rejectMessage?: string };

/**
 * Send a ride to Moto Trails through the same pipeline as the website's submit form (docs/14 §5): draft, GPX upload,
 * the form steps, then submit for review. Never published automatically, and a recording never creates verified access.
 * Repeating the call with the same clientId continues the same draft.
 */
export async function submitRide(token: string, s: RideSubmission, progress: Progress = () => undefined): Promise<{ slug: string }> {
  const call = <T,>(path: string, method: 'POST' | 'PUT' | 'GET', body?: unknown) => api<T>(path, { method, body, token });
  progress('Creating the draft');
  const { id } = await call<{ id: string }>('/submissions', 'POST', { clientId: s.clientId });

  progress('Uploading the route');
  const gpx = buildGpx(s.name, s.points, s.waypoints);
  const size = new TextEncoder().encode(gpx).byteLength;
  const up = await call<{ uploadId: string; target: { url: string; method: 'PUT'; headers: Record<string, string> } }>('/uploads', 'POST', { kind: 'gpx', contentType: 'application/gpx+xml', sizeBytes: size });
  // The development file store hands out a path on the website; the production store hands out a full address.
  const uploadUrl = up.target.url.startsWith('/') ? `${SITE_BASE}${up.target.url}` : up.target.url;
  const put = await fetch(uploadUrl, { method: 'PUT', headers: up.target.headers, body: gpx }).catch(() => { throw new ApiFailure(0, 'network', 'Cannot reach the file store. Check your connection.'); });
  if (!put.ok) throw new ApiFailure(put.status, 'upload_failed', 'The route file could not be uploaded.');
  let check = await call<Check>(`/uploads/${up.uploadId}/complete`, 'POST', {});
  for (let i = 0; i < 10 && (check.status === 'processing' || check.status === 'pending'); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    check = await call<Check>(`/uploads/${up.uploadId}`, 'GET');
  }
  if (check.status !== 'ready') throw new ApiFailure(422, 'rejected', check.rejectMessage ?? 'The route file was not accepted. Check it has enough points.');
  await call(`/submissions/${id}/route`, 'POST', { uploadId: up.uploadId });

  progress('Sending the details');
  const start = s.points[0]!;
  const unknown = s.accessClass === 'unknown';
  const steps: [number, unknown][] = [
    [1, { name: s.name, summary: s.summary, state: s.state, district: s.district, nearestTown: s.nearestTown }],
    [2, { startPoint: { lat: start.lat, lon: start.lng }, routeShape: s.routeShape }],
    [3, { difficulty: s.difficulty, terrain: s.terrain, suitableFor: [], bestMonths: [], hazards: [] }],
    [4, {
      accessClass: s.accessClass, restrictions: [], basis: unknown ? 'none' : s.basis,
      evidence: unknown ? [] : [{ kind: 'other', description: s.evidence }],
      ...(s.accessClass === 'permission_required' ? { permissionInstructions: s.permissionInstructions } : {}),
    }],
    [5, []],
    [6, { licenceAccepted: true, contributorNote: s.contributorNote }],
  ];
  for (const [n, body] of steps) await call(`/submissions/${id}/steps/${n}`, 'PUT', body);

  progress('Submitting for review');
  return call<{ slug: string }>(`/submissions/${id}/submit`, 'POST', {});
}
