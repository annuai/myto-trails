import { describe, expect, it } from 'vitest';
import { dueSubmission, enqueueSubmission, removeSubmission, retryLater } from './submissionQueue';

const form = { name: 'Lake loop' } as never;
const item = (rideId: string) => ({ rideId, clientId: `c-${rideId}`, trim: 200, form });

describe('submission queue', () => {
  it('is due straight away and one ride is queued once', () => {
    let q = enqueueSubmission([], item('a'), 1000);
    q = enqueueSubmission(q, { ...item('a'), trim: 500 }, 2000);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ trim: 500, tries: 0, nextAt: 2000 });
    expect(dueSubmission(q, 2000)?.rideId).toBe('a');
  });
  it('backs off 30 s, 1 min, 2 min and caps at an hour', () => {
    let q = enqueueSubmission([], item('a'), 0);
    q = retryLater(q, 'a', 0); expect(q[0]!.nextAt).toBe(30_000);
    q = retryLater(q, 'a', 0); expect(q[0]!.nextAt).toBe(60_000);
    q = retryLater(q, 'a', 0); expect(q[0]!.nextAt).toBe(120_000);
    for (let i = 0; i < 10; i++) q = retryLater(q, 'a', 0);
    expect(q[0]!.nextAt).toBe(3_600_000);
  });
  it('does not offer one that is waiting, and offers the next that is due', () => {
    let q = enqueueSubmission(enqueueSubmission([], item('a'), 0), item('b'), 0);
    q = retryLater(q, 'a', 0);
    expect(dueSubmission(q, 1000)?.rideId).toBe('b');
    expect(dueSubmission(removeSubmission(q, 'b'), 1000)).toBeUndefined();
  });
});
