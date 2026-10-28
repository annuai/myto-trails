import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// config.ts reads __DEV__ unless this is set, and `__DEV__` does not exist under vitest.
vi.stubEnv('EXPO_PUBLIC_API_BASE', 'https://api.test/api/v1');

const calls: { url: string; init: RequestInit }[] = [];
beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ items: [] }), { status: 200 }); }));
});
afterEach(() => vi.unstubAllGlobals());

const sent = () => ({ url: calls[0].url.replace('https://api.test/api/v1', ''), method: calls[0].init.method, auth: (calls[0].init.headers as Record<string, string>).authorization, body: calls[0].init.body ? JSON.parse(calls[0].init.body as string) : undefined });

describe('ride companion API clients', () => {
  it('check-ins', async () => {
    const c = await import('./checkins');
    await c.createCheckin('tok', { expectedAt: '2026-11-01T10:00:00Z', contactName: 'Amma' });
    expect(sent()).toEqual({ url: '/checkins', method: 'POST', auth: 'Bearer tok', body: { expectedAt: '2026-11-01T10:00:00Z', contactName: 'Amma' } });
    calls.length = 0; await c.pingCheckin('tok', 'c1', { lat: 1, lng: 2, at: 'x', batteryPct: 40 });
    expect(sent()).toMatchObject({ url: '/checkins/c1/ping', method: 'POST', body: { lat: 1, lng: 2, at: 'x', batteryPct: 40 } });
    calls.length = 0; await c.extendCheckin('tok', 'c1', 'y');
    expect(sent()).toMatchObject({ url: '/checkins/c1/extend', body: { expectedAt: 'y' } });
    calls.length = 0; await c.arriveCheckin('tok', 'c1');
    expect(sent()).toMatchObject({ url: '/checkins/c1/arrive', method: 'POST', body: undefined });
    calls.length = 0; await c.getCheckin('tok', 'c1');
    expect(sent()).toMatchObject({ url: '/checkins/c1', method: 'GET' });
  });
  it('group rides', async () => {
    const g = await import('./groups');
    await g.createGroupRide('tok', { name: 'Sunday' });
    expect(sent()).toMatchObject({ url: '/group-rides', method: 'POST', body: { name: 'Sunday' } });
    calls.length = 0; await g.joinGroupRide('tok', { code: 'ABC234', displayName: 'Asha' });
    expect(sent()).toMatchObject({ url: '/group-rides/join', body: { code: 'ABC234', displayName: 'Asha' } });
    calls.length = 0; await g.syncGroupRide('tok', 'g1', { lat: 1, lng: 2, status: 'wait_up' });
    expect(sent()).toMatchObject({ url: '/group-rides/g1/sync', body: { lat: 1, lng: 2, status: 'wait_up' } });
    calls.length = 0; await g.setRegroup('tok', 'g1', null);
    expect(sent()).toMatchObject({ url: '/group-rides/g1/regroup', body: { clear: true } });
    calls.length = 0; await g.setRegroup('tok', 'g1', { lat: 1, lng: 2, note: 'Dhaba' });
    expect(sent().body).toEqual({ lat: 1, lng: 2, note: 'Dhaba' });
    calls.length = 0; await g.leaveGroupRide('tok', 'g1');
    expect(sent()).toMatchObject({ url: '/group-rides/g1/leave', method: 'POST' });
    calls.length = 0; await g.endGroupRide('tok', 'g1');
    expect(sent()).toMatchObject({ url: '/group-rides/g1/end', method: 'POST' });
  });
  it('condition reports, with the list read bare or wrapped', async () => {
    const r = await import('./conditionReports');
    await r.postConditionReport('tok', 'nandi-hills', { clientId: 'c1', kind: 'blocked', at: 'x' });
    expect(sent()).toMatchObject({ url: '/trails/nandi-hills/condition-reports', method: 'POST', body: { clientId: 'c1', kind: 'blocked', at: 'x' } });
    calls.length = 0; await r.confirmConditionReport('tok', 'r1', false);
    expect(sent()).toMatchObject({ url: '/condition-reports/r1/confirm', body: { still: false } });
    calls.length = 0;
    expect(await r.listConditionReports('nandi-hills')).toEqual([]);
    expect(sent()).toMatchObject({ url: '/trails/nandi-hills/condition-reports', method: 'GET', auth: undefined });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ id: 'r1' }]), { status: 200 })));
    expect(await r.listConditionReports('nandi-hills')).toEqual([{ id: 'r1' }]);
  });
  it('shared routes', async () => {
    const s = await import('./sharedRoutes');
    await s.createSharedRoute('tok', { name: 'R', points: [[1, 2], [3, 4]], distanceKm: 1 });
    expect(sent()).toMatchObject({ url: '/shared-routes', method: 'POST' });
    calls.length = 0; await s.getSharedRoute('s1');
    expect(sent()).toMatchObject({ url: '/shared-routes/s1', method: 'GET', auth: undefined });
    calls.length = 0; await s.deleteSharedRoute('tok', 's1');
    expect(sent()).toMatchObject({ url: '/shared-routes/s1', method: 'DELETE', auth: 'Bearer tok' });
  });
});
