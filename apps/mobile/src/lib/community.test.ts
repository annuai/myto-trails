import { describe, expect, it } from 'vitest';
import { canEditComment, clockLabel, formatPosted, formatRideWhen, hasLink, nextWeek, rideAtISO } from './community';

describe('ride times (India time)', () => {
  it('builds the instant the server expects', () => {
    expect(rideAtISO('2026-06-07', 6 * 60 + 30)).toBe('2026-06-07T06:30:00+05:30');
    expect(new Date(rideAtISO('2026-06-07', 6 * 60 + 30)).toISOString()).toBe('2026-06-07T01:00:00.000Z');
  });
  it('shows a ride in India time whatever the phone clock says', () => {
    expect(formatRideWhen('2026-06-07T01:00:00Z')).toBe('Sun, 7 Jun · 6:30 AM');
    expect(formatRideWhen('2026-06-07T19:00:00Z')).toBe('Mon, 8 Jun · 12:30 AM');
  });
  it('writes clock times', () => {
    expect(clockLabel(0)).toBe('12:00 AM');
    expect(clockLabel(12 * 60)).toBe('12:00 PM');
    expect(clockLabel(18 * 60 + 15)).toBe('6:15 PM');
  });
  it('dates a post, adding the year only for another year', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(formatPosted('2026-03-02T10:00:00Z', now)).toBe('2 Mar');
    expect(formatPosted('2025-12-31T10:00:00Z', now)).toBe('31 Dec 2025');
  });
});

describe('comments', () => {
  it('can be edited for ten minutes', () => {
    const at = '2026-06-01T10:00:00Z', t = new Date(at).getTime();
    expect(canEditComment(at, t + 9 * 60_000)).toBe(true);
    expect(canEditComment(at, t + 11 * 60_000)).toBe(false);
  });
  it('spots web addresses', () => {
    expect(hasLink('see example.com/x')).toBe(true);
    expect(hasLink('https://a.b')).toBe(true);
    expect(hasLink('Gate is locked at 5pm')).toBe(false);
  });
});

describe('repeating a ride plan', () => {
  it('moves it exactly one week on, at the same time of day', () => {
    expect(nextWeek('2026-11-01T04:30:00.000Z')).toBe('2026-11-08T04:30:00.000Z');
    expect(nextWeek('2026-12-28T00:00:00.000Z')).toBe('2027-01-04T00:00:00.000Z');
  });
});
