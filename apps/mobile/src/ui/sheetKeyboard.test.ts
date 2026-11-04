import { describe, expect, it } from 'vitest';
import { keyboardLift } from './sheetKeyboard';

describe('keyboardLift', () => {
  it('is nothing with no keyboard', () => { expect(keyboardLift('android', 0, 48)).toBe(0); expect(keyboardLift('ios', 0, 34)).toBe(0); });
  it('is the keyboard height on iOS', () => expect(keyboardLift('ios', 336, 34)).toBe(336));
  it('adds the navigation bar the keyboard covers on Android', () => expect(keyboardLift('android', 290, 48)).toBe(338));
});
