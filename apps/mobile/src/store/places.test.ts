import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { placesSlice } from './placesCore';

const store = () => create(placesSlice());
const here = { lat: 51.5, lng: -0.12, label: 'Home street' };

describe('places store', () => {
  it('setPlace(home) stores label and coordinates with setAt', () => {
    const s = store();
    s.getState().setPlace('home', here, 1000);
    expect(s.getState().home).toEqual({ ...here, setAt: 1000 });
    expect(s.getState().work).toBeUndefined();
  });
  it('setPlace replaces an earlier place of the same kind and leaves the other kind alone', () => {
    const s = store();
    s.getState().setPlace('home', here, 1);
    s.getState().setPlace('work', { lat: 1, lng: 2, label: 'Office' }, 2);
    s.getState().setPlace('home', { lat: 3, lng: 4, label: 'New home' }, 3);
    expect(s.getState().home).toEqual({ lat: 3, lng: 4, label: 'New home', setAt: 3 });
    expect(s.getState().work?.label).toBe('Office');
  });
  it('clearPlace removes it', () => {
    const s = store();
    s.getState().setPlace('work', here, 1);
    s.getState().clearPlace('work');
    expect(s.getState().work).toBeUndefined();
  });
  it('setPlace rejects a non-finite or out-of-range coordinate and keeps the old place', () => {
    const s = store();
    s.getState().setPlace('home', here, 1);
    s.getState().setPlace('home', { ...here, lat: 91 }, 2);
    s.getState().setPlace('home', { ...here, lng: NaN }, 3);
    s.getState().setPlace('home', { ...here, lng: 181 }, 4);
    expect(s.getState().home).toEqual({ ...here, setAt: 1 });
  });
  it('addStrike increments one kind, clearStrikes resets it, and replacing a place resets its strikes', () => {
    const s = store();
    s.getState().addStrike('home'); s.getState().addStrike('home'); s.getState().addStrike('work');
    expect(s.getState().endStrikes).toEqual({ home: 2, work: 1 });
    s.getState().clearStrikes('home');
    expect(s.getState().endStrikes).toEqual({ home: 0, work: 1 });
    s.getState().addStrike('work');
    s.getState().setPlace('work', here, 5);
    expect(s.getState().endStrikes).toEqual({ home: 0, work: 0 });
  });
});
