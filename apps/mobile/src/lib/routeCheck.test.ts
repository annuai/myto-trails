import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { checkRoute, chunkLine } from './routeCheck';

// Points a kilometre apart running north.
const line = (km: number): LatLng[] => Array.from({ length: km + 1 }, (_, i) => ({ lat: 13 + i / 111.32, lng: 77.6 }));

describe('chunkLine', () => {
  it('keeps a short route in one piece', () => {
    expect(chunkLine(line(20), 60)).toHaveLength(1);
  });
  it('splits a long route and the pieces share their end points', () => {
    const chunks = chunkLine(line(150), 60);
    expect(chunks.length).toBe(3);
    expect(chunks[0]![chunks[0]!.length - 1]).toEqual(chunks[1]![0]);
  });
  it('loses no point except by sharing', () => {
    const l = line(150);
    const chunks = chunkLine(l, 60);
    expect(chunks.reduce((n, c) => n + c.length, 0)).toBe(l.length + chunks.length - 1);
  });
});

describe('checkRoute', () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  it('finds the longest stretch without fuel and reads the forecast', async () => {
    const fetcher = ((url: string) => (String(url).includes('open-meteo')
      ? ok({ daily: { time: ['2026-10-29'], temperature_2m_max: [30], temperature_2m_min: [20] } })
      : ok({ elements: [{ type: 'node', lat: 13 + 10 / 111.32, lon: 77.6, tags: { name: 'Pump' } }] }))) as unknown as typeof fetch;
    const r = await checkRoute(line(40), fetcher);
    expect(r.fuel?.stops).toHaveLength(1);
    expect(r.fuel!.longestGapKm).toBeGreaterThan(25);
    expect(r.days).toHaveLength(1);
  });
  it('gives no fuel answer when the fuel service fails, rather than a made-up empty stretch', async () => {
    const fetcher = ((url: string) => (String(url).includes('open-meteo') ? ok({}) : Promise.resolve(new Response('', { status: 504 })))) as unknown as typeof fetch;
    const r = await checkRoute(line(40), fetcher);
    expect(r.fuel).toBeNull();
  });
  it('treats a few far-apart points as the long route it is, not a short one', async () => {
    let asked = 0;
    const fetcher = ((url: string) => { if (!String(url).includes('open-meteo')) asked++; return ok({}); }) as unknown as typeof fetch;
    const sparse: LatLng[] = [{ lat: 13, lng: 77 }, { lat: 18, lng: 82 }, { lat: 20, lng: 88 }];
    expect((await checkRoute(sparse, fetcher)).tooLong).toBe(true);
    expect(asked).toBe(0);
  });
  it('does not ask for a route far too long to check', async () => {
    let asked = 0;
    const fetcher = ((url: string) => { if (!String(url).includes('open-meteo')) asked++; return ok({}); }) as unknown as typeof fetch;
    const r = await checkRoute(line(700), fetcher);
    expect(r.tooLong).toBe(true);
    expect(asked).toBe(0);
  });
});
