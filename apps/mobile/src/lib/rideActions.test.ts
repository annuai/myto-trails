import { describe, expect, it } from 'vitest';
import { CATEGORIES, helpSentNotice, isRideAction, rideNotice } from './rideActions';

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
