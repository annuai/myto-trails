import { describe, expect, it } from 'vitest';
import { nextOpen } from './accordion';

describe('nextOpen', () => {
  it('opens a tapped section when none is open', () => expect(nextOpen(null, 'tyres')).toBe('tyres'));
  it('closes the open section when it is tapped again', () => expect(nextOpen('tyres', 'tyres')).toBeNull());
  it('moves to another section, so only one is ever open', () => expect(nextOpen('tyres', 'brakes')).toBe('brakes'));
});
