import { describe, expect, it } from 'vitest';
import type { GroupRiderView, RiderTile } from './groupCore';
import { batteryStep, destinationChange, inOrder, leadCandidates, leadNotice, roleFromRiders, suggestSuccessor, type BatteryStage } from './leadCore';

describe('batteryStep', () => {
  const run = (levels: number[], charging = false) => {
    let s: BatteryStage = 'none'; const raised: BatteryStage[] = [];
    for (const l of levels) { const r = batteryStep(s, l, charging); s = r.next; if (r.raise) raised.push(r.raise); }
    return raised;
  };
  it('raises each warning once as the battery falls: 15%, 7%, then the 5% question', () => {
    expect(run([40, 20, 16, 15, 14, 12, 8, 7, 6, 5, 4, 3])).toEqual(['low', 'lower', 'ask']);
  });
  it('raises the later ones if the level jumps past an earlier one', () => expect(run([30, 6])).toEqual(['lower']));
  it('says nothing while charging, and starts again once charged', () => {
    expect(run([10, 9], true)).toEqual([]);
    expect(run([14, 80, 14])).toEqual(['low', 'low']);
  });
  it('says nothing when the phone does not report a level', () => expect(batteryStep('none', null, false)).toEqual({ next: 'none', raise: null }));
});

const tile = (id: string, o: Partial<RiderTile> = {}): RiderTile => ({ id, name: id, slot: 0, isMe: false, role: 'member', titles: [], status: 'ok', distanceM: 500, distance: '500 m', seen: 'just now', stale: false, position: { lat: 1, lng: 1 }, ...o });

describe('suggestSuccessor', () => {
  it("is the backup the leader named, then a marshal, a captain, then the nearest rider heard from", () => {
    const ts = [tile('a', { distanceM: 100 }), tile('b', { titles: ['captain'] }), tile('c', { titles: ['marshal'] }), tile('d')];
    expect(suggestSuccessor(ts, 'd')!.id).toBe('d');
    expect(suggestSuccessor(ts)!.id).toBe('c');
    expect(suggestSuccessor(ts.filter((t) => t.id !== 'c'))!.id).toBe('b');
    expect(suggestSuccessor(ts.filter((t) => t.id === 'a' || t.id === 'd'))!.id).toBe('a');
  });
  it('skips a rider who has not been heard from, and leaves you out', () => {
    const ts = [tile('me', { isMe: true, titles: ['marshal'] }), tile('x', { stale: true, titles: ['marshal'] }), tile('y', { distanceM: 900 })];
    expect(suggestSuccessor(ts)!.id).toBe('y');
    expect(suggestSuccessor([tile('me', { isMe: true })])).toBeUndefined();
  });
  it('lists the suggestion first and everyone else after', () => {
    const ts = [tile('a'), tile('b', { titles: ['marshal'] }), tile('me', { isMe: true })];
    expect(leadCandidates(ts).map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('leadNotice', () => {
  const now = Date.parse('2026-11-04T06:00:00Z');
  const view = (id: string, role: string, at: string | null = '2026-11-04T05:59:50Z'): GroupRiderView => ({ id, name: id.toUpperCase(), role, lat: at ? 1 : null, lng: at ? 1 : null, at, status: 'ok' });
  it('tells you when you lead now, and the group who does', () => {
    const before = [view('a', 'leader'), view('b', 'member')], after = [view('a', 'member'), view('b', 'leader')];
    expect(leadNotice(before, after, 'b', now)!.body).toBe('You now lead the group.');
    expect(leadNotice(before, after, 'c', now)!.body).toBe('B now leads.');
  });
  it('says the old leader dropped off when they have stopped reporting', () => {
    const before = [view('a', 'leader'), view('b', 'member')], after = [view('a', 'member', '2026-11-04T05:40:00Z'), view('b', 'leader')];
    expect(leadNotice(before, after, 'c', now)!.body).toBe('A dropped off. B now leads.');
  });
  it('says nothing when the lead did not change, or there was no earlier look', () => {
    const rs = [view('a', 'leader'), view('b', 'member')];
    expect(leadNotice(rs, rs, 'b', now)).toBeNull();
    expect(leadNotice([], rs, 'b', now)).toBeNull();
  });
});

describe('inOrder', () => {
  const a = tile('a', { distance: '100 m' }), b = tile('b', { distance: '200 m' }), c = tile('c');
  it('keeps the order it was given even as the riders move', () => {
    const order = ['b', 'a'];
    const moved = [tile('a', { distanceM: 10, distance: '10 m' }), tile('b', { distanceM: 900, distance: '900 m' })];
    expect(inOrder(moved, order).map((t) => t.id)).toEqual(['b', 'a']);
    expect(inOrder(moved, order)[0]!.distance).toBe('900 m');
  });
  it('puts a rider who joined since at the end and drops one who has gone, and never lists you', () => {
    expect(inOrder([a, c, tile('me', { isMe: true })], ['b', 'a']).map((t) => t.id)).toEqual(['a', 'c']);
    expect(b).toBeTruthy();
  });
});

describe('leadNotice with the destination', () => {
  const now = Date.parse('2026-11-04T06:00:00Z');
  const view = (id: string, role: string): GroupRiderView => ({ id, name: id.toUpperCase(), role, lat: 1, lng: 1, at: '2026-11-04T05:59:50Z', status: 'ok' });
  const before = [view('a', 'leader'), view('b', 'member')], after = [view('a', 'member'), view('b', 'leader')];
  it('tells the new leader what they now control', () => {
    expect(leadNotice(before, after, 'b', now, { lat: 1, lng: 2, note: 'Hampi' })!.body).toBe('You now lead the group. The destination is Hampi, and you can change it.');
    expect(leadNotice(before, after, 'b', now, { lat: 1, lng: 2, note: null })!.body).toBe('You now lead the group. The destination is a spot on the map, and you can change it.');
    expect(leadNotice(before, after, 'b', now, null)!.body).toBe('You now lead the group. No destination is set, and you can set one.');
  });
  it('leaves the others\' notice alone', () => {
    expect(leadNotice(before, after, 'c', now, { lat: 1, lng: 2, note: 'Hampi' })!.body).toBe('B now leads.');
  });
});

describe('roleFromRiders', () => {
  const rs: GroupRiderView[] = [{ id: 'a', name: 'A', role: 'leader', lat: null, lng: null, at: null, status: 'ok' }, { id: 'b', name: 'B', role: 'member', lat: null, lng: null, at: null, status: 'ok' }];
  it('is this phone\'s own entry: gaining and losing the lead', () => {
    expect(roleFromRiders(rs, 'a')).toBe('leader');
    expect(roleFromRiders(rs, 'b')).toBe('member');
  });
  it('is unknown without me or without an entry', () => {
    expect(roleFromRiders(rs, undefined)).toBeUndefined();
    expect(roleFromRiders(rs, 'z')).toBeUndefined();
  });
});

describe('destinationChange', () => {
  const a = { lat: 12.1, lng: 76.2, note: 'Mysuru' }, b = { lat: 13, lng: 77, note: null };
  it('says set when the point moves and cleared when it goes', () => {
    expect(destinationChange(a, b, true)).toBe('set');
    expect(destinationChange(null, b, true)).toBe('set');
    expect(destinationChange(a, null, true)).toBe('cleared');
  });
  it('says nothing for the same spot (a hand-over, a renamed note), nothing set, or a first look', () => {
    expect(destinationChange(a, { ...a, note: 'Elsewhere' }, true)).toBeNull();
    expect(destinationChange(null, null, true)).toBeNull();
    expect(destinationChange(null, b, false)).toBeNull();
  });
});
