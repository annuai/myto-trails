import { describe, expect, it } from 'vitest';
import { homeFocus } from './homeFocus';

const base = { recording: false, rideCount: 3, now: 10_000_000 };

describe('homeFocus', () => {
  it('resumes a ride that is being recorded, before anything else', () => {
    expect(homeFocus({ ...base, recording: true, tripPhase: 'active' }).kind).toBe('resume');
  });
  it('puts a trip under way, then one ready to start, first', () => {
    expect(homeFocus({ ...base, tripPhase: 'active' })).toEqual({ kind: 'trip', phase: 'active' });
    expect(homeFocus({ ...base, tripPhase: 'ready' })).toEqual({ kind: 'trip', phase: 'ready' });
  });
  it('offers the recap of a ride that finished in the last day, ahead of a trip that is only coming up', () => {
    const last = { id: 'r1', endedAt: base.now - 3_600_000 };
    expect(homeFocus({ ...base, lastRide: last, tripPhase: 'upcoming' })).toEqual({ kind: 'recap', rideId: 'r1' });
    expect(homeFocus({ ...base, lastRide: { id: 'r1', endedAt: base.now - 3 * 86_400_000 }, tripPhase: 'upcoming' })).toEqual({ kind: 'trip', phase: 'upcoming' });
  });
  it('welcomes a rider with no rides, and otherwise suggests planning the next one', () => {
    expect(homeFocus({ ...base, rideCount: 0 }).kind).toBe('first');
    expect(homeFocus({ ...base }).kind).toBe('plan');
  });
});
