import { describe, expect, it } from 'vitest';
import { distanceToLeaderM, isStale, pollIntervalMs, sortRiders, type GroupRiderView } from './groupCore';

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
