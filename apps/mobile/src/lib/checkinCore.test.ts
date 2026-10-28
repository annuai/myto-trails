import { describe, expect, it } from 'vitest';
import { checkinStatus, shouldPing } from './checkinCore';

const MIN = 60_000;
const here = { lat: 12, lng: 77 };

describe('checkinStatus', () => {
  const expected = 100 * MIN;
  it('is active until the last 15 minutes, then due soon', () => {
    expect(checkinStatus(0, expected)).toBe('active');
    expect(checkinStatus(84 * MIN, expected)).toBe('active');
    expect(checkinStatus(85 * MIN, expected)).toBe('due_soon');
    expect(checkinStatus(99 * MIN, expected)).toBe('due_soon');
  });
  it('is overdue from the expected time on', () => {
    expect(checkinStatus(100 * MIN, expected)).toBe('overdue');
    expect(checkinStatus(500 * MIN, expected)).toBe('overdue');
  });
  it('is arrived whenever the rider arrived, even after the expected time', () => {
    expect(checkinStatus(500 * MIN, expected, 120 * MIN)).toBe('arrived');
    expect(checkinStatus(0, expected, null)).toBe('active');
  });
});

describe('shouldPing', () => {
  it('pings at once when nothing has been sent', () => {
    expect(shouldPing(0, here, null)).toBe(true);
  });
  it('waits a minute while the rider stays put or moves a little', () => {
    expect(shouldPing(30_000, here, { at: 0, position: here })).toBe(false);
    expect(shouldPing(59_000, { lat: 12.001, lng: 77 }, { at: 0, position: here })).toBe(false);
    expect(shouldPing(60_000, here, { at: 0, position: here })).toBe(true);
  });
  it('pings sooner after more than 500 m, but not within 20 s', () => {
    const far = { lat: 12.006, lng: 77 }; // about 660 m
    expect(shouldPing(10_000, far, { at: 0, position: here })).toBe(false);
    expect(shouldPing(20_000, far, { at: 0, position: here })).toBe(true);
    expect(shouldPing(20_000, { lat: 12.003, lng: 77 }, { at: 0, position: here })).toBe(false);
  });
});
