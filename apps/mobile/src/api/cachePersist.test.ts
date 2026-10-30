import { describe, expect, it } from 'vitest';
import { MAX_AGE_MS, MAX_ENTRIES, isPersistable, parseSnapshot, snapshotOf } from './cachePersist';

const NOW = 10 * 86_400_000;
const e = (at: number, data: unknown = { n: 1 }) => ({ data, at });

describe('cachePersist', () => {
  it('saves only public keys, never anything that belongs to an account', () => {
    for (const k of ['trail:a', 'search:q=x', 'bikes:makes', 'countries']) expect(isPersistable(k)).toBe(true);
    for (const k of ['saved', 'me', 'clubs', 'club:1', 'club:1:posts', 'comments:a:in', 'comments:a:out', 'checkin:1']) expect(isPersistable(k)).toBe(false);
  });
  it('keeps the newest entries up to the limit and drops the old and the oversize', () => {
    const entries: [string, { data: unknown; at: number }][] = [];
    for (let i = 0; i < MAX_ENTRIES + 5; i++) entries.push([`trail:${i}`, e(NOW - i * 1000)]);
    entries.push(['trail:ancient', e(NOW - MAX_AGE_MS - 1)]);
    entries.push(['me', e(NOW)]);
    const out = JSON.parse(snapshotOf(entries, NOW)) as [string, unknown][];
    expect(out).toHaveLength(MAX_ENTRIES);
    expect(out.map(([k]) => k)).not.toContain('trail:ancient');
    expect(out.map(([k]) => k)).not.toContain('me');
    expect(out[0]![0]).toBe('trail:0');
  });
  it('drops entries until the saved text fits', () => {
    const big = 'x'.repeat(400_000);
    const out = JSON.parse(snapshotOf([['trail:a', e(NOW, big)], ['trail:b', e(NOW - 1, big)], ['trail:c', e(NOW - 2, big)], ['trail:d', e(NOW - 3, big)]], NOW, 1_000_000)) as unknown[];
    expect(out.length).toBeLessThan(4);
    expect(out.length).toBeGreaterThan(0);
  });
  it('reads a saved snapshot back with the original times, so freshness is unchanged', () => {
    const text = snapshotOf([['trail:a', e(NOW - 5000, { n: 2 })]], NOW);
    expect(parseSnapshot(text, NOW)).toEqual([['trail:a', { data: { n: 2 }, at: NOW - 5000 }]]);
  });
  it('ignores damaged, old or non-public entries in a snapshot', () => {
    expect(parseSnapshot('not json', NOW)).toEqual([]);
    expect(parseSnapshot(JSON.stringify([['me', { data: 1, at: NOW }], ['trail:old', { data: 1, at: NOW - MAX_AGE_MS - 5 }], ['trail:ok', { data: 1, at: NOW }], ['trail:bad', 5]]), NOW).map(([k]) => k)).toEqual(['trail:ok']);
  });
});
