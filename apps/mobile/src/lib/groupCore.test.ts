import { describe, expect, it } from 'vitest';
import { findRiders, railOrder, distanceToLeaderM, isStale, pollIntervalMs, riderSlots, riderTiles, signalChanges, signalNotice, sortRiders, type GroupRiderView } from './groupCore';

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

describe('pollIntervalMs for a big group', () => {
  it('polls half as often past 30 riders, and checks for help every 10 seconds', () => {
    expect(pollIntervalMs({ moving: true, anyHelp: false, riders: 30 })).toBe(20_000);
    expect(pollIntervalMs({ moving: true, anyHelp: false, riders: 31 })).toBe(30_000);
    expect(pollIntervalMs({ moving: false, anyHelp: false, riders: 100 })).toBe(45_000);
    expect(pollIntervalMs({ moving: false, anyHelp: true, riders: 100 })).toBe(10_000);
    expect(pollIntervalMs({ moving: false, anyHelp: true, riders: 5 })).toBe(5_000);
  });
});

describe('pollIntervalMs', () => {
  it('is quickest when someone needs help, then moving, then stopped, and slower in the background', () => {
    expect(pollIntervalMs({ moving: false, anyHelp: true })).toBe(5_000);
    expect(pollIntervalMs({ moving: true, anyHelp: false })).toBe(20_000);
    expect(pollIntervalMs({ moving: false, anyHelp: false })).toBe(30_000);
    expect(pollIntervalMs({ moving: true, anyHelp: false, backgrounded: true })).toBe(30_000);
    expect(pollIntervalMs({ moving: false, anyHelp: false, backgrounded: true })).toBe(60_000);
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

describe('riderTiles', () => {
  it('shows distance from you, how fresh each position is, and puts help first and you last', () => {
    const riders = [rider({ id: 'me', name: 'Me' }), rider({ id: 'a', name: 'Annuai', lat: 12.01, lng: 77, at: '2026-11-01T05:59:45Z', status: 'help' }), rider({ id: 'b', name: 'Bala', lat: 12.002, lng: 77, at: '2026-11-01T05:57:30Z' }), rider({ id: 'c', name: 'Chitra', lat: null, lng: null, at: null })];
    const tiles = riderTiles(riders, 'me', { lat: 12, lng: 77 }, now);
    expect(tiles.map((t) => t.id)).toEqual(['a', 'b', 'c', 'me']);
    expect(tiles[0]).toMatchObject({ name: 'Annuai', status: 'help', distance: '1.1 km', seen: 'just now', stale: false });
    expect(tiles[1]).toMatchObject({ distance: '220 m', seen: '3 min ago', stale: true });
    expect(tiles[2]).toMatchObject({ distance: null, seen: 'not seen yet', stale: true, position: null });
    expect(tiles[3]).toMatchObject({ isMe: true, distance: null });
  });
  it('has no distances without your own position', () => {
    expect(riderTiles([rider({ id: 'a' })], 'me', undefined, now)[0]!.distance).toBeNull();
  });
});

describe('riderSlots', () => {
  it('gives each rider a colour by id, the same on every phone', () => {
    const one = riderSlots([{ id: 'b' }, { id: 'a' }, { id: 'c' }]);
    const other = riderSlots([{ id: 'c' }, { id: 'a' }, { id: 'b' }]);
    expect([...one.entries()].sort()).toEqual([['a', 0], ['b', 1], ['c', 2]]);
    expect(other.get('b')).toBe(1);
  });
});

describe('railOrder', () => {
  const rs = [
    rider({ id: 'me', name: 'Me', lat: 12, lng: 77 }), rider({ id: 'a', name: 'Asha', lat: 12.002, lng: 77 }), rider({ id: 'b', name: 'Ben', lat: 12.0005, lng: 77 }),
    rider({ id: 'l', name: 'Lead', role: 'leader', lat: 12.01, lng: 77 }), rider({ id: 'h', name: 'Hana', status: 'help', lat: 12.05, lng: 77 }), rider({ id: 'w', name: 'Wes', status: 'wait_up', lat: 12.03, lng: 77 }),
  ];
  const tiles = riderTiles(rs, 'me', { lat: 12, lng: 77 }, now);
  it('puts help first, then other signals, the leader, then the nearest, and leaves you out', () => {
    expect(railOrder(tiles, 10).shown.map((t) => t.name)).toEqual(['Hana', 'Wes', 'Lead', 'Ben', 'Asha']);
  });
  it('shows only as many as fit and counts everyone', () => {
    const r = railOrder(tiles, 3);
    expect(r.shown).toHaveLength(3);
    expect(r.total).toBe(6);
  });
});

describe('findRiders', () => {
  const words = { captain: 'Captain', marshal: 'Marshal', medic: 'Medic', sweep: 'Sweep' };
  const rs = [rider({ id: 'a', name: 'Annuai', role: 'leader' }), rider({ id: 'b', name: 'Pranab', titles: ['medic'] }), rider({ id: 'c', name: 'Jithin', titles: ['sweep'] })];
  const tiles = riderTiles(rs, 'zz', { lat: 12, lng: 77 }, now);
  it('finds a rider by part of their name in any case', () => expect(findRiders(tiles, ' prA ', words).map((t) => t.name)).toEqual(['Pranab']));
  it('finds riders by a title they hold, and the leader', () => {
    expect(findRiders(tiles, 'medic', words).map((t) => t.name)).toEqual(['Pranab']);
    expect(findRiders(tiles, 'lead', words).map((t) => t.name)).toEqual(['Annuai']);
  });
  it('gives everyone for an empty search, and nobody for no match', () => {
    expect(findRiders(tiles, '  ', words)).toHaveLength(3);
    expect(findRiders(tiles, 'zzz', words)).toEqual([]);
  });
});

describe('signals in order, and who asked first', () => {
  const rs = [
    rider({ id: 'me', name: 'Me' }), rider({ id: 'b', name: 'Brk', status: 'break' }), rider({ id: 'f', name: 'Fuel', status: 'fuel' }), rider({ id: 'w', name: 'Wait', status: 'wait_up' }),
    rider({ id: 'h', name: 'Help', status: 'help' }), rider({ id: 'o', name: 'Okay' }), rider({ id: 'l', name: 'Lead', role: 'leader' }), rider({ id: 'f2', name: 'Fuel2', status: 'fuel' }),
  ];
  const tiles = riderTiles(rs, 'me', { lat: 12, lng: 77 }, now);
  it('puts help first, then wait up, then fuel, then break, then the leader, then the rest', () => {
    expect(railOrder(tiles, 20).shown.map((t) => t.name)).toEqual(['Help', 'Wait', 'Fuel', 'Fuel2', 'Brk', 'Lead', 'Okay']);
  });
  it('puts whoever signalled first first among riders with the same signal', () => {
    expect(railOrder(tiles, 20, { f: 200, f2: 100 }).shown.map((t) => t.name).slice(2, 4)).toEqual(['Fuel2', 'Fuel']);
  });
  it('orders the group popup the same way', () => {
    expect(sortRiders(rs, 'me').map((r) => r.name).slice(0, 5)).toEqual(['Help', 'Wait', 'Fuel', 'Fuel2', 'Brk']);
  });
});
