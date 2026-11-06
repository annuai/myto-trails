import { describe, expect, it, vi } from 'vitest';
import { goBack } from './goBack';

const make = (can: boolean) => ({ canGoBack: () => can, back: vi.fn(), replace: vi.fn() });

describe('goBack', () => {
  it('goes one step back when there is a screen behind', () => {
    const r = make(true);
    goBack(r, '/clubs');
    expect(r.back).toHaveBeenCalledOnce();
    expect(r.replace).not.toHaveBeenCalled();
  });
  it('goes to the fallback when nothing is behind', () => {
    const r = make(false);
    goBack(r, '/trips');
    expect(r.replace).toHaveBeenCalledWith('/trips');
    expect(r.back).not.toHaveBeenCalled();
  });
});
