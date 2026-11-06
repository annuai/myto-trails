import { describe, expect, it } from 'vitest';
import { duePost, enqueuePost, forClub, giveUp, patchPost, removePost, retryLater, retryNow, type OutboxPost } from './photoOutbox';

const NOW = 1_700_000_000_000;
const item = (id: string, over: Partial<OutboxPost> = {}): Omit<OutboxPost, 'tries' | 'nextAt'> => ({ id, clubId: 'c1', body: '', photos: [], ...over });

describe('photo outbox', () => {
  it('queues posts in order, each due straight away, and hands out the oldest due one', () => {
    const q = enqueuePost(enqueuePost([], item('a'), NOW), item('b'), NOW);
    expect(q.map((i) => i.id)).toEqual(['a', 'b']);
    expect(duePost(q, NOW)?.id).toBe('a');
    expect(duePost(removePost(q, 'a'), NOW)?.id).toBe('b');
  });

  it('backs off 30 s, 1 min, 2 min and so on, up to an hour', () => {
    let q = enqueuePost([], item('a'), NOW);
    const waits: number[] = [];
    for (let i = 0; i < 9; i++) { q = retryLater(q, 'a', NOW); waits.push(q[0]!.nextAt - NOW); }
    expect(waits.slice(0, 3)).toEqual([30_000, 60_000, 120_000]);
    expect(Math.max(...waits)).toBe(3_600_000);
    expect(duePost(q, NOW)).toBeUndefined();
    expect(duePost(q, NOW + 3_600_000)?.id).toBe('a');
  });

  it('keeps a refused post with its reason until the rider retries it', () => {
    let q = giveUp(enqueuePost([], item('a'), NOW), 'a', 'One of the photos did not arrive.');
    expect(q[0]).toMatchObject({ error: 'One of the photos did not arrive.', nextAt: Infinity });
    expect(duePost(q, NOW + 1e12)).toBeUndefined();
    q = retryNow(q, 'a', NOW + 5);
    expect(q[0]).toMatchObject({ error: undefined, nextAt: NOW + 5, tries: 0 });
    expect(duePost(q, NOW + 5)?.id).toBe('a');
  });

  it('patches one post and lists a club\'s own', () => {
    const q = [...enqueuePost(enqueuePost([], item('a'), NOW), item('b', { clubId: 'c2' }), NOW)];
    expect(patchPost(q, 'a', { posting: true })[0]!.posting).toBe(true);
    expect(forClub(q, 'c2').map((i) => i.id)).toEqual(['b']);
  });
});
