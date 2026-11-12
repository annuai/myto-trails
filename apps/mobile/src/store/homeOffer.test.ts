import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { homeOfferSlice } from './homeOfferCore';

const store = () => create(homeOfferSlice());

describe('home offer store', () => {
  it('starts empty', () => {
    expect(store().getState().dismissals).toEqual([]);
  });

  it('dismiss appends the time and keeps at most 10', () => {
    const s = store();
    for (let i = 1; i <= 12; i++) s.getState().dismiss(i * 1000);
    expect(s.getState().dismissals).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => n * 1000));
  });

  it('clear forgets them', () => {
    const s = store();
    s.getState().dismiss(5);
    s.getState().clear();
    expect(s.getState().dismissals).toEqual([]);
  });
});
