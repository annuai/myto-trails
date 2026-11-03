import { describe, expect, it } from 'vitest';
import type { GroupRiderView, RiderTile } from './groupCore';
import { batteryStep, leadCandidates, leadNotice, suggestSuccessor, type BatteryStage } from './leadCore';

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
