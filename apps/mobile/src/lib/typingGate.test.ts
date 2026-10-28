import { describe, expect, it } from 'vitest';
import { canTypeNow } from './typingGate';

describe('canTypeNow', () => {
  it('is open when no ride is recording or waiting to be recovered', () => {
    expect(canTypeNow({ riding: false, unfinished: false, stopped: false })).toBe(true);
  });
  it('is closed while a ride is recording and the vehicle is not reliably stopped', () => {
    expect(canTypeNow({ riding: true, unfinished: false, stopped: false })).toBe(false);
  });
  it('opens while recording only when the vehicle is reliably stopped', () => {
    expect(canTypeNow({ riding: true, unfinished: false, stopped: true })).toBe(true);
  });
  it('stays closed when a ride was left unfinished (the phone may still be recording) until it is resumed and stopped', () => {
    expect(canTypeNow({ riding: false, unfinished: true, stopped: false })).toBe(false);
    expect(canTypeNow({ riding: true, unfinished: false, stopped: true })).toBe(true);
  });
});
