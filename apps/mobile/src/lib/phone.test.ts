import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('reads Indian numbers whichever way they are typed', () => {
    expect(normalizePhone('98123 45678')).toBe('+919812345678');
    expect(normalizePhone('+91-98123-45678')).toBe('+919812345678');
    expect(normalizePhone('919812345678')).toBe('+919812345678');
    expect(normalizePhone('098123 45678')).toBe('+919812345678');
  });
  it('reads a number as the home country own when there is no +', () => {
    expect(normalizePhone('(415) 555-2671', 'US')).toBe('+14155552671');
    expect(normalizePhone('07911 123456', 'GB')).toBe('+447911123456');
  });
  it('keeps a number that carries its own country code', () => {
    expect(normalizePhone('+919812345678', 'US')).toBe('+919812345678');
  });
  it('rejects text that is not a number', () => {
    expect(normalizePhone('hello')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });
});
