import { beforeEach, describe, expect, it } from 'vitest';
import { FRESH_MS, cacheDelete, cacheGet, cacheSet, clearUserCache, isFresh } from './cacheStore';

const keys = ['saved', 'me', 'clubs', 'club:1', 'club:1:posts', 'comments:a:in', 'comments:a:out', 'trail:a', 'search:q=x', 'bikes:makes'];

describe('cacheStore', () => {
  beforeEach(() => {
    clearUserCache();
    for (const k of keys) cacheDelete(k);
  });

  it('an entry is fresh for five minutes and stale after', () => {
    cacheSet('trail:a', { n: 1 }, 1_000);
    expect(cacheGet<{ n: number }>('trail:a')?.data).toEqual({ n: 1 });
    expect(isFresh('trail:a', 1_000 + FRESH_MS - 1)).toBe(true);
    expect(isFresh('trail:a', 1_000 + FRESH_MS)).toBe(false);
    expect(isFresh('never-set', 1_000)).toBe(false);
  });

  it('deleting an entry makes it not fresh, so an edit forces a refetch', () => {
    cacheSet('comments:a:out', [], 1_000);
    cacheDelete('comments:a:out');
    expect(isFresh('comments:a:out', 1_001)).toBe(false);
    expect(cacheGet('comments:a:out')).toBeUndefined();
  });

  it('clearUserCache removes saved, me, clubs, club:* and signed-in comments but keeps public entries', () => {
    for (const k of keys) cacheSet(k, 1, 1_000);
    clearUserCache();
    for (const k of ['saved', 'me', 'clubs', 'club:1', 'club:1:posts', 'comments:a:in']) expect(cacheGet(k)).toBeUndefined();
    for (const k of ['comments:a:out', 'trail:a', 'search:q=x', 'bikes:makes']) expect(cacheGet(k)).toBeDefined();
  });
});
