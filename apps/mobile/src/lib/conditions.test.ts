import { describe, expect, it } from 'vitest';
import { enqueue, markFailed, markSent, nextBatch, OUTBOX_CAP, type Outbox, type ReportDraft } from './conditions';

const draft = (o: Partial<ReportDraft> = {}): ReportDraft => ({ slug: 'nandi-hills', kind: 'blocked', at: '2026-11-01T06:00:00Z', ...o });

describe('outbox', () => {
  it('queues a report with a client id, ready to send now', () => {
    const box = enqueue([], draft(), 1000, 'c1');
    expect(box).toEqual([{ ...draft(), clientId: 'c1', tries: 0, nextAt: 1000 }]);
  });
  it('hands out due reports oldest first, in batches', () => {
    let box: Outbox = [];
    for (let i = 0; i < 7; i++) box = enqueue(box, draft(), 1000, `c${i}`);
    expect(nextBatch(box, 1000, 5).map((i) => i.clientId)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
    expect(nextBatch(box, 999)).toEqual([]);
  });
  it('removes a report once it is sent', () => {
    const box = enqueue(enqueue([], draft(), 0, 'a'), draft(), 0, 'b');
    expect(markSent(box, 'a').map((i) => i.clientId)).toEqual(['b']);
  });
  it('backs off after a failure: 30 s, 1 min, 2 min, capped at an hour', () => {
    let box = enqueue([], draft(), 0, 'a');
    box = markFailed(box, 'a', 0);
    expect(box[0]).toMatchObject({ tries: 1, nextAt: 30_000 });
    box = markFailed(box, 'a', 30_000);
    expect(box[0]).toMatchObject({ tries: 2, nextAt: 30_000 + 60_000 });
    for (let i = 0; i < 20; i++) box = markFailed(box, 'a', 0);
    expect(box[0].nextAt).toBe(3_600_000);
    expect(nextBatch(box, 3_599_999)).toEqual([]);
    expect(nextBatch(box, 3_600_000)).toHaveLength(1);
  });
  it('drops a report the server refused for good', () => {
    const box = enqueue([], draft(), 0, 'a');
    expect(markFailed(box, 'a', 0, true)).toEqual([]);
  });
  it('keeps only the newest 50', () => {
    let box: Outbox = [];
    for (let i = 0; i < OUTBOX_CAP + 5; i++) box = enqueue(box, draft(), 0, `c${i}`);
    expect(box).toHaveLength(OUTBOX_CAP);
    expect(box[0].clientId).toBe('c5');
  });
  it('makes its own client id when none is given', () => {
    const box = enqueue(enqueue([], draft(), 0), draft(), 0);
    expect(box[0].clientId).not.toBe(box[1].clientId);
  });
});
