import { describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, motorcycleCosting, osrmUrl, parseOsrm, parseTrip, parseValhalla, retryable, route, valhallaBody, DEFAULT_PREFS } from './routing';

/** Google's polyline encoding at 6 places. */
const enc = (pts: [number, number][]) => {
  let la = 0, lo = 0, out = '';
  const put = (v: number) => { let n = v < 0 ? ~(v << 1) : v << 1; while (n >= 0x20) { out += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; } out += String.fromCharCode(n + 63); };
  for (const [a, b] of pts) { const A = Math.round(a * 1e6), B = Math.round(b * 1e6); put(A - la); put(B - lo); la = A; lo = B; }
  return out;
};
const A = { lat: 0, lng: 0 }, B = { lat: 0.001, lng: 0.001 }, C = { lat: 0.002, lng: 0.001 };

const leg1 = { shape: enc([[0, 0], [0, 0.001], [0.001, 0.001]]), maneuvers: [{ instruction: 'Drive east.', type: 1, begin_shape_index: 0 }, { instruction: 'Turn left.', type: 15, begin_shape_index: 1 }, { instruction: 'You have arrived.', type: 4, begin_shape_index: 2 }] };
const leg2 = { shape: enc([[0.001, 0.001], [0.002, 0.001]]), maneuvers: [{ instruction: 'Continue north.', type: 1, begin_shape_index: 0 }, { instruction: 'You have arrived.', type: 4, begin_shape_index: 1 }] };

describe('valhallaBody', () => {
  it('sends the heading on the first stop only, and alternatives only between two stops', () => {
    const b = valhallaBody({ stops: [A, B], heading: -90, alternates: 2 }) as { locations: { heading?: number }[]; alternates?: number };
    expect(b.locations[0]!.heading).toBe(270);
    expect(b.locations[1]!.heading).toBeUndefined();
    expect(b.alternates).toBe(2);
    expect((valhallaBody({ stops: [A, B, C], alternates: 2 }) as { alternates?: number }).alternates).toBeUndefined();
  });
  it('turns preferences into motorcycle costing', () => {
    expect(motorcycleCosting(DEFAULT_PREFS)).toEqual({ use_trails: 0 });
    expect(motorcycleCosting({ ...DEFAULT_PREFS, avoidTolls: true, smallerRoads: true, allowUnpaved: true })).toEqual({ use_tolls: 0, use_primary: 0.2, use_highways: 0, use_trails: 0.5 });
  });
});

describe('parseTrip', () => {
  it('joins legs into one line, with turns placed along it and a mid-way arrival named as a stop', () => {
    const d = parseTrip({ legs: [leg1, leg2], summary: { time: 120 } });
    expect(d.line).toHaveLength(4);
    expect(d.steps.map((s) => s.kind)).toEqual(['straight', 'left', 'arrive', 'straight', 'arrive']);
    expect(d.steps[2]!.text).toBe('You have reached a stop');
    expect(d.steps[4]!.text).toBe('You have arrived.');
    expect(d.steps[3]!.atM).toBeCloseTo(d.steps[2]!.atM);
    expect(d.steps[4]!.atM).toBeCloseTo(d.totalM);
    expect(d.etaMin).toBe(2);
  });
  it('keeps alternatives and drops a broken one', () => {
    expect(parseValhalla({ trip: { legs: [leg1] }, alternates: [{ trip: { legs: [leg1] } }, { trip: { legs: [] } }] })).toHaveLength(2);
  });
});

describe('OSRM fallback', () => {
  const body = { code: 'Ok', routes: [{ geometry: enc([[0, 0], [0, 0.001], [0.001, 0.001]]), distance: 222, duration: 90, legs: [{ steps: [
    { maneuver: { type: 'depart', modifier: 'right' }, name: 'MG Road', distance: 111 },
    { maneuver: { type: 'new name', modifier: 'straight' }, name: 'Brigade Road', distance: 0 },
    { maneuver: { type: 'turn', modifier: 'left' }, name: 'Church Street', distance: 111 },
    { maneuver: { type: 'arrive' }, name: '', distance: 0 },
  ] }] }] };
  it('writes sentences, skips silent renames and ends with the arrival', () => {
    const [d] = parseOsrm(body);
    expect(d!.provider).toBe('osrm');
    expect(d!.steps.map((s) => s.text)).toEqual(['Head along MG Road', 'Turn left onto Church Street', 'You have arrived']);
    expect(d!.steps[1]!.atM).toBeGreaterThan(100);
  });
  it('sends the heading as a bearing on the first stop', () => {
    expect(osrmUrl({ stops: [A, B], heading: 90 })).toContain('bearings=90%2C45%3B');
  });
  it('rejects an answer with no route', () => {
    expect(() => parseOsrm({ code: 'NoRoute' })).toThrow();
  });
});

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const status = (s: number) => ({ ok: false, status: s, json: async () => ({}) }) as unknown as Response;

describe('route', () => {
  it('retries Valhalla once when it is busy, then uses it', async () => {
    const f = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok({ trip: { legs: [leg1] } }));
    const [d] = await route({ stops: [A, B] }, undefined, f);
    expect(f).toHaveBeenCalledTimes(2);
    expect(d!.provider).toBe('valhalla');
  });
  it('falls back to OSRM when Valhalla keeps failing', async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error('routing timed out')).mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(ok({ code: 'Ok', routes: [{ geometry: enc([[0, 0], [0, 0.001]]), distance: 111, duration: 10, legs: [{ steps: [{ maneuver: { type: 'arrive' }, distance: 0 }] }] }] }));
    const [d] = await route({ stops: [A, B] }, undefined, f);
    expect(f).toHaveBeenCalledTimes(3);
    expect(d!.provider).toBe('osrm');
  });
  it('does not retry a request Valhalla refused, but still asks OSRM', async () => {
    const f = vi.fn().mockResolvedValueOnce(status(400)).mockResolvedValueOnce(status(400));
    await expect(route({ stops: [A, B] }, undefined, f)).rejects.toThrow('routing 400');
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('stops at once when the caller gives up', async () => {
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    const f = vi.fn().mockRejectedValue(abort);
    await expect(route({ stops: [A, B] }, undefined, f)).rejects.toThrow('Aborted');
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('retryable', () => {
  it('retries the network and a busy server, not a refusal', () => {
    expect(retryable(new Error('routing 429'))).toBe(true);
    expect(retryable(new Error('routing 502'))).toBe(true);
    expect(retryable(new Error('routing 400'))).toBe(false);
    expect(retryable(new Error('routing timed out'))).toBe(true);
    expect(retryable(new Error('routing returned no route'))).toBe(false);
  });
});

describe('fetchWithTimeout', () => {
  it('gives up after the timeout', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = ((_u: string, init: RequestInit) => new Promise((_r, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as typeof fetch;
    try {
      await expect(fetchWithTimeout('x', {}, 20)).rejects.toThrow('routing timed out');
    } finally { globalThis.fetch = orig; }
  });
});

describe('route on the phone', () => {
  const answer = JSON.stringify({ trip: { legs: [leg1] } });
  it('answers from the phone first, without the network', async () => {
    const f = vi.fn();
    const [d] = await route({ stops: [A, B] }, undefined, f, async () => answer);
    expect(d!.provider).toBe('device');
    expect(f).not.toHaveBeenCalled();
  });
  it('goes online when no region holds the route, or the phone fails', async () => {
    const f = vi.fn().mockResolvedValue(ok({ trip: { legs: [leg1] } }));
    expect((await route({ stops: [A, B] }, undefined, f, async () => null))[0]!.provider).toBe('valhalla');
    expect((await route({ stops: [A, B] }, undefined, f, async () => { throw new Error('No path could be found'); }))[0]!.provider).toBe('valhalla');
  });
  it('sends the phone the same request as the server', async () => {
    let sent = '';
    await route({ stops: [A, B], heading: 90, alternates: 2 }, undefined, vi.fn(), async (_s, body) => { sent = body; return answer; });
    expect(JSON.parse(sent)).toEqual(valhallaBody({ stops: [A, B], heading: 90, alternates: 2 }));
  });
});
