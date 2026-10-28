import { describe, expect, it } from 'vitest';
import { canTypeNow, nextUnlocked, noteFieldShown } from './typingGate';

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

describe('noteFieldShown', () => {
  it('stays shown once typing was allowed, even when the vehicle starts moving', () => {
    expect(noteFieldShown({ open: true, canType: false, unlocked: true })).toBe(true);
  });
  it('is hidden while moving when typing was never allowed, and when closed', () => {
    expect(noteFieldShown({ open: true, canType: false, unlocked: false })).toBe(false);
    expect(noteFieldShown({ open: false, canType: true, unlocked: true })).toBe(false);
  });
  it('unlocks when typing is allowed while open, and re-locks on close', () => {
    expect(nextUnlocked(false, { open: true, canType: true })).toBe(true);
    expect(nextUnlocked(true, { open: true, canType: false })).toBe(true);
    expect(nextUnlocked(true, { open: false, canType: false })).toBe(false);
  });
});
