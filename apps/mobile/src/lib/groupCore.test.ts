import { describe, expect, it } from 'vitest';
import { distanceToLeaderM, isStale, pollIntervalMs, signalChanges, signalNotice, sortRiders, type GroupRiderView } from './groupCore';

const now = Date.parse('2026-11-01T06:00:00Z');
const rider = (o: Partial<GroupRiderView> & { id: string }): GroupRiderView => ({ name: o.id, role: 'member', lat: 12, lng: 77, at: '2026-11-01T05:59:30Z', status: 'ok', ...o });

describe('isStale', () => {
  it('is false for a fix within two minutes and true after', () => {
    expect(isStale(rider({ id: 'a', at: '2026-11-01T05:58:30Z' }), now)).toBe(false);
    expect(isStale(rider({ id: 'a', at: '2026-11-01T05:57:59Z' }), now)).toBe(true);
  });
  it('is true without a position', () => {
    expect(isStale(rider({ id: 'a', lat: null, lng: null, at: null }), now)).toBe(true);
  });
});

describe('sortRiders', () => {
  it('puts help first, then the leader, then you, then the rest by name', () => {
    const list = [rider({ id: 'z', name: 'Zed' }), rider({ id: 'me', name: 'Me' }), rider({ id: 'b', name: 'Bala', status: 'help' }), rider({ id: 'l', name: 'Lead', role: 'leader' }), rider({ id: 'a', name: 'Asha' })];
    expect(sortRiders(list, 'me').map((r) => r.id)).toEqual(['b', 'l', 'me', 'a', 'z']);
  });
  it('does not change the list it is given', () => {
    const list = [rider({ id: 'z' }), rider({ id: 'a' })];
    sortRiders(list, 'a');
    expect(list.map((r) => r.id)).toEqual(['z', 'a']);
  });
});

describe('distanceToLeaderM', () => {
  it('measures from you to the leader', () => {
    const list = [rider({ id: 'l', role: 'leader', lat: 12.01 }), rider({ id: 'me', lat: 12 })];
    const d = distanceToLeaderM(list, 'me')!;
    expect(d).toBeGreaterThan(1090);
    expect(d).toBeLessThan(1120);
  });
  it('is null for the leader, or when a position is missing', () => {
    const list = [rider({ id: 'l', role: 'leader' }), rider({ id: 'me', lat: null, lng: null })];
    expect(distanceToLeaderM(list, 'l')).toBeNull();
    expect(distanceToLeaderM(list, 'me')).toBeNull();
  });
});

describe('pollIntervalMs', () => {
  it('is quickest when someone needs help, then moving, then stopped, and slower in the background', () => {
    expect(pollIntervalMs({ moving: false, anyHelp: true })).toBe(5_000);
    expect(pollIntervalMs({ moving: true, anyHelp: false })).toBe(10_000);
    expect(pollIntervalMs({ moving: false, anyHelp: false })).toBe(20_000);
    expect(pollIntervalMs({ moving: true, anyHelp: false, backgrounded: true })).toBe(15_000);
    expect(pollIntervalMs({ moving: false, anyHelp: false, backgrounded: true })).toBe(30_000);
  });
});

describe('signalChanges and signalNotice', () => {
  const rider = (id: string, status: GroupRiderView['status'], name = id): GroupRiderView => ({ id, name, role: 'member', lat: null, lng: null, at: null, status });
  it('lists the riders whose signal changed, never you, and never a rider seen for the first time', () => {
    const before = [rider('me', 'ok'), rider('a', 'ok', 'Annuai'), rider('b', 'break')];
    const after = [rider('me', 'help'), rider('a', 'help', 'Annuai'), rider('b', 'break'), rider('c', 'help', 'Newcomer')];
    expect(signalChanges(before, after, 'me').map((c) => [c.rider.id, c.from, c.to])).toEqual([['a', 'ok', 'help']]);
  });
  it('is empty when nothing changed or there was no earlier look', () => {
    const now = [rider('a', 'help')];
    expect(signalChanges(now, now, 'me')).toEqual([]);
    expect(signalChanges([], now, 'me')).toEqual([]);
  });
  it('says what the rider asked for, in their own name', () => {
    const c = (from: GroupRiderView['status'], to: GroupRiderView['status']) => signalNotice({ rider: rider('a', to, 'Annuai'), from, to });
    expect(c('ok', 'help')).toEqual({ title: 'Group ride: help needed', body: 'Annuai is asking for help' });
    expect(c('ok', 'wait_up')?.body).toBe('Annuai says wait up');
    expect(c('ok', 'fuel')?.body).toBe('Annuai needs a fuel stop');
    expect(c('ok', 'break')?.body).toBe('Annuai is taking a break');
  });
  it('tells you when help is over, but says nothing when another signal simply clears', () => {
    expect(signalNotice({ rider: rider('a', 'ok', 'Annuai'), from: 'help', to: 'ok' })?.body).toBe('Annuai is OK now');
    expect(signalNotice({ rider: rider('a', 'ok', 'Annuai'), from: 'fuel', to: 'ok' })).toBeNull();
  });
});
