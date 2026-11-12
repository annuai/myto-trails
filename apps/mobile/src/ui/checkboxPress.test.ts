import { describe, expect, it, vi } from 'vitest';
import { checkboxPress } from './checkboxPress';

describe('checkboxPress', () => {
  it('a disabled checkbox neither changes nor ticks', () => {
    const change = vi.fn(); const tick = vi.fn();
    checkboxPress(false, true, change, tick);
    expect(change).not.toHaveBeenCalled(); expect(tick).not.toHaveBeenCalled();
  });
  it('an enabled one ticks only when turning on, and always changes', () => {
    const change = vi.fn(); const tick = vi.fn();
    checkboxPress(false, undefined, change, tick);
    expect(change).toHaveBeenCalledWith(true); expect(tick).toHaveBeenCalledTimes(1);
    checkboxPress(true, false, change, tick);
    expect(change).toHaveBeenLastCalledWith(false); expect(tick).toHaveBeenCalledTimes(1);
  });
});
