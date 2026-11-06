import { describe, expect, it } from 'vitest';
import { parseQuotes, QUOTES_MAX, QUOTES_REFRESH_AFTER_MS, QUOTES_RETRY_AFTER_MS, QUOTE_MAX_LENGTH, quotesRefreshDue } from './quoteSync';

const NOW = 1_800_000_000_000;

describe('quotesRefreshDue', () => {
  it('is due on the first open', () => expect(quotesRefreshDue(0, 0, NOW)).toBe(true));
  it('is not due while the copy is under a week old', () => expect(quotesRefreshDue(NOW - QUOTES_REFRESH_AFTER_MS + 1, 0, NOW)).toBe(false));
  it('is due once the copy is a week old', () => expect(quotesRefreshDue(NOW - QUOTES_REFRESH_AFTER_MS, 0, NOW)).toBe(true));
  it('is due when the stored time is in the future', () => expect(quotesRefreshDue(NOW + 1000, 0, NOW)).toBe(true));
  it('waits after a recent attempt even with no copy yet', () => {
    expect(quotesRefreshDue(0, NOW - 1000, NOW)).toBe(false);
    expect(quotesRefreshDue(0, NOW - QUOTES_RETRY_AFTER_MS, NOW)).toBe(true);
  });
  it('ignores an attempt time in the future', () => expect(quotesRefreshDue(0, NOW + 1000, NOW)).toBe(true));
});

describe('parseQuotes', () => {
  it('takes the lines, trimmed', () => expect(parseQuotes({ quotes: [' One road. ', 'Two wheels.'] })).toEqual(['One road.', 'Two wheels.']));
  it('skips what is not usable and repeats', () => {
    expect(parseQuotes({ quotes: ['A', 3, null, '', '   ', 'A', 'x'.repeat(QUOTE_MAX_LENGTH + 1), 'B'] })).toEqual(['A', 'B']);
  });
  it('is null for a reply that is not a list of lines', () => {
    for (const bad of [null, undefined, 'x', 5, [], {}, { quotes: 'x' }, { quotes: [] }, { quotes: [1, ''] }, { error: { code: 'x' } }]) expect(parseQuotes(bad)).toBeNull();
  });
  it('stops at the maximum', () => {
    expect(parseQuotes({ quotes: Array.from({ length: QUOTES_MAX + 50 }, (_, i) => `Line ${i}`) })).toHaveLength(QUOTES_MAX);
  });
});
