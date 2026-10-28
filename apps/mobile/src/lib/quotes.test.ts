import { describe, expect, it } from 'vitest';
import { RIDE_QUOTES } from '../data/rideQuotes';
import { drawQuote } from './quotes';

describe('drawQuote', () => {
  it('shows every line once before any repeats', () => {
    let queue: number[] = [];
    let last: number | undefined;
    const seen: number[] = [];
    for (let i = 0; i < RIDE_QUOTES.length; i++) {
      const d = drawQuote(queue, RIDE_QUOTES.length, last);
      seen.push(d.index); queue = d.queue; last = d.index;
    }
    expect(new Set(seen).size).toBe(RIDE_QUOTES.length);
  });
  it('starts a new round without repeating the last line first', () => {
    for (let n = 0; n < 50; n++) {
      const d = drawQuote([], 5, 3, () => 0.999);
      expect(d.index).not.toBe(3);
      expect(d.queue).toHaveLength(4);
    }
  });
  it('drops indexes that no longer exist', () => {
    expect(drawQuote([9, 2], 4, undefined).index).toBe(2);
  });
  it('has no repeated lines', () => {
    expect(new Set(RIDE_QUOTES).size).toBe(RIDE_QUOTES.length);
  });
});
