import { describe, expect, it } from 'vitest';
import { CATEGORIES, clockShortText, clockText, helpSentNotice, isRideAction, rideNotice, rideSurfaceProps } from './rideActions';

describe('rideNotice', () => {
  it('offers Pause alone on a solo ride', () => {
    const n = rideNotice({ paused: false, group: false });
    expect(n.category).toBe('ride');
    expect(CATEGORIES[n.category].map((a) => a.label)).toEqual(['Pause']);
  });
  it('offers Resume once paused', () => {
    expect(CATEGORIES[rideNotice({ paused: true, group: false }).category].map((a) => a.label)).toEqual(['Resume']);
  });
  it('adds Help on a group ride, with Pause or Resume first', () => {
    expect(CATEGORIES[rideNotice({ paused: false, group: true }).category].map((a) => a.label)).toEqual(['Pause', 'Help']);
    expect(CATEGORIES[rideNotice({ paused: true, group: true }).category].map((a) => a.label)).toEqual(['Resume', 'Help']);
  });
  it('never needs more than three buttons (Android)', () => {
    for (const as of Object.values(CATEGORIES)) expect(as.length).toBeLessThanOrEqual(3);
  });
  it('says it is paused', () => {
    expect(rideNotice({ paused: true, group: false }).title).toBe('Ride paused');
  });
});

describe('help', () => {
  it('is followed by an Undo button', () => {
    expect(CATEGORIES[helpSentNotice.category].map((a) => a.id)).toEqual(['ride.undo-help']);
  });
  it('recognises only its own actions', () => {
    expect(isRideAction('ride.help')).toBe(true);
    expect(isRideAction('expo.modules.notifications.actions.DEFAULT')).toBe(false);
  });
});

describe('rideSurfaceProps', () => {
  const base = { group: false, elapsedMs: 65_000, meters: 12_345, now: 1_000_000 };
  it('leads with Pause while riding, solo or group, and the clock counts from when the ride would have started', () => {
    for (const group of [false, true]) {
      const p = rideSurfaceProps({ ...base, paused: false, group });
      expect(p.primaryId).toBe('ride.pause');
      expect(p.primaryLabel).toBe('Pause');
      expect(p.since).toBe(1_000_000 - 65_000);
    }
  });
  it('leads with Resume while paused and stops the clock', () => {
    const p = rideSurfaceProps({ ...base, paused: true });
    expect(p).toMatchObject({ primaryId: 'ride.resume', primaryLabel: 'Resume', since: 0, title: 'Ride paused', clock: '1:05' });
  });
  it('shows distance to one decimal', () => { expect(rideSurfaceProps({ ...base, paused: false }).km).toBe('12.3'); });
  it('uses a button id the action handler accepts', () => { expect(isRideAction(rideSurfaceProps({ ...base, paused: false }).primaryId)).toBe(true); });
});

describe('clock text', () => {
  it('writes hours only when there are some', () => {
    expect(clockText(5_000)).toBe('0:05');
    expect(clockText(3_725_000)).toBe('1:02:05');
    expect(clockText(-5)).toBe('0:00');
  });
  it('writes whole minutes for Android', () => {
    expect(clockShortText(59_000)).toBe('0 min');
    expect(clockShortText(3_900_000)).toBe('1 h 05 min');
  });
});
