import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('EXPO_PUBLIC_API_BASE', 'https://api.test/api/v1');

const calls: { url: string; init: RequestInit }[] = [];
beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ items: [] }), { status: 200 }); }));
});
afterEach(() => vi.unstubAllGlobals());

const sent = () => ({ url: calls[0].url.replace('https://api.test/api/v1', ''), method: calls[0].init.method, body: calls[0].init.body ? JSON.parse(calls[0].init.body as string) : undefined });

describe('event API client', () => {
  it('lists by scope, with the club when given', async () => {
    const e = await import('./events');
    await e.listEvents('tok', 'club', 'c1');
    expect(sent()).toMatchObject({ url: '/events?scope=club&clubId=c1', method: 'GET' });
  });
  it('replies, declines with a reason and note, and checks in', async () => {
    const e = await import('./events');
    await e.respondToEvent('tok', 'e1', { response: 'declined', reason: 'work', note: 'Late shift' });
    expect(sent()).toMatchObject({ url: '/events/e1/response', method: 'PUT', body: { response: 'declined', reason: 'work', note: 'Late shift' } });
    calls.length = 0; await e.checkInEvent('tok', 'e1', { lat: 1, lng: 2, accuracyM: 12 });
    expect(sent()).toMatchObject({ url: '/events/e1/check-in', method: 'POST', body: { lat: 1, lng: 2, accuracyM: 12 } });
  });
  it('host actions', async () => {
    const e = await import('./events');
    await e.setEventRole('tok', 'e1', 'r1', 'sweep');
    expect(sent()).toMatchObject({ url: '/events/e1/roles/r1', method: 'PUT', body: { role: 'sweep' } });
    calls.length = 0; await e.startEvent('tok', 'e1', 5);
    expect(sent()).toMatchObject({ url: '/events/e1/start', method: 'POST', body: { stretchKm: 5 } });
    calls.length = 0; await e.markArrived('tok', 'e1', 'r1');
    expect(sent()).toMatchObject({ url: '/events/e1/arrived/r1', method: 'POST' });
  });
});
