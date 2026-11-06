import { describe, expect, it } from 'vitest';
import { inAppNudge } from './inApp';
import type { Nudge } from './types';

const NOW = 1_700_000_000_000;
const H = 3_600_000;
const n = (id: string, fireAt: number): Nudge => ({ id, type: 'weekend', fireAt, title: id, body: 'b', lock: 'l', route: '/r', score: 1 });

describe('inAppNudge', () => {
  it('shows the soonest nudge due within the next 18 hours', () => {
    expect(inAppNudge([n('later', NOW + 10 * H), n('soon', NOW + 2 * H), n('far', NOW + 30 * H)], [], {}, NOW)?.id).toBe('soon');
  });
  it('shows one that came due in the last 12 hours and was not opened, but not an older one or an opened one', () => {
    const history = [{ id: 'recent', type: 'weekend' as const, fireAt: NOW - 3 * H }, { id: 'old', type: 'weekend' as const, fireAt: NOW - 20 * H }, { id: 'done', type: 'weekend' as const, fireAt: NOW - 2 * H, opened: NOW - H }];
    const planned = [n('recent', NOW - 3 * H), n('old', NOW - 20 * H), n('done', NOW - 2 * H)];
    expect(inAppNudge(planned, history, {}, NOW)?.id).toBe('recent');
  });
  it('does not show one the rider has already seen', () => {
    expect(inAppNudge([n('a', NOW + H)], [], { a: NOW }, NOW)).toBeUndefined();
  });
  it('shows nothing when nothing is near', () => {
    expect(inAppNudge([n('far', NOW + 40 * H)], [], {}, NOW)).toBeUndefined();
    expect(inAppNudge([], [], {}, NOW)).toBeUndefined();
  });
});
