import { describe, expect, it } from 'vitest';
import { canCheckIn, primaryAction, stretchAlert } from './eventCore';
import type { GroupRiderView } from './groupCore';

const HOUR = 3_600_000;
const startsAt = '2026-12-06T00:30:00.000Z';
const t0 = Date.parse(startsAt);
const ev = { lat: 12.9716, lng: 77.5946, radiusM: 150, startsAt };
const fix = { lat: 12.9717, lng: 77.5946, accuracyM: 20 };

describe('canCheckIn', () => {
  it('says yes inside the radius within the window', () => {
    expect(canCheckIn(ev, fix, t0 - 10 * 60_000)).toBe('yes');
  });
  it('says early before the window and closed after it', () => {
    expect(canCheckIn(ev, fix, t0 - HOUR - 1)).toBe('early');
    expect(canCheckIn(ev, fix, t0 + 6 * HOUR + 1)).toBe('closed');
  });
  it('says far outside the radius and no_fix without a usable fix', () => {
    expect(canCheckIn(ev, { ...fix, lat: 12.99 }, t0)).toBe('far');
    expect(canCheckIn(ev, null, t0)).toBe('no_fix');
    expect(canCheckIn(ev, { ...fix, accuracyM: 151 }, t0)).toBe('no_fix');
  });
});

const rider = (id: string, role: string, lat: number | null, lngOffset = 0, ageMs = 0): GroupRiderView => ({
  id, name: id, role, lat, lng: lat === null ? null : 77.5 + lngOffset, at: lat === null ? null : new Date(t0 - ageMs).toISOString(), status: 'ok',
});

describe('stretchAlert', () => {
  const near = rider('near', 'member', 12.9, 0.001);
  it('names riders further than the limit from the leader', () => {
    const far = rider('far', 'member', 12.9, 0.05); // about 5.4 km east
    expect(stretchAlert([rider('me', 'leader', 12.9), near, far], 'me', 3, t0)).toEqual({ names: ['far'] });
  });
  it('is quiet when everyone is close, or alone', () => {
    expect(stretchAlert([rider('me', 'leader', 12.9), near], 'me', 3, t0)).toBeNull();
    expect(stretchAlert([rider('me', 'leader', 12.9)], 'me', 3, t0)).toBeNull();
  });
  it('ignores riders not heard from lately', () => {
    const lost = rider('lost', 'member', 12.9, 0.05, 10 * 60_000);
    expect(stretchAlert([rider('me', 'leader', 12.9), lost], 'me', 3, t0)).toBeNull();
  });
  it('is for the leader only', () => {
    const far = rider('far', 'member', 12.9, 0.05);
    expect(stretchAlert([rider('lead', 'leader', 12.9), far], 'far', 3, t0)).toBeNull();
  });
});

describe('primaryAction', () => {
  const base = { status: 'scheduled' as const, myResponse: null, checkedIn: false, rideLive: false, mine: false };
  it('offers Going first, then check-in once at the meeting point', () => {
    expect(primaryAction(base, false)).toBe('going');
    expect(primaryAction({ ...base, myResponse: 'going' }, false)).toBe('none');
    expect(primaryAction({ ...base, myResponse: 'going' }, true)).toBe('check_in');
  });
  it('offers join_ride to a checked-in rider on a live ride', () => {
    expect(primaryAction({ ...base, status: 'live', rideLive: true, checkedIn: true, myResponse: 'going' }, true)).toBe('join_ride');
  });
  it('offers nothing to a waitlisted rider or after the event', () => {
    expect(primaryAction({ ...base, myResponse: 'waitlisted' }, true)).toBe('none');
    expect(primaryAction({ ...base, status: 'cancelled' }, true)).toBe('none');
  });
});
