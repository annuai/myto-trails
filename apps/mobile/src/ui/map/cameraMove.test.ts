import { describe, expect, it, vi } from 'vitest';
import { arrowIsFixed, safeMove } from './cameraMove';

describe('safeMove', () => {
  it('runs the move', () => {
    const move = vi.fn(() => Promise.resolve());
    safeMove(move);
    expect(move).toHaveBeenCalledOnce();
  });

  // Sentry MYTO-MOBILE-3/5: the map's camera commands are async native calls, and one sent just as the map closes rejects with "Invalid reactTag ... could not find MLRNCamera".
  it('swallows a move the phone rejects, which would otherwise be an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    safeMove(() => Promise.reject(new Error('Invalid `reactTag` 878, could not find MLRNCamera')));
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('swallows a move that throws at once because the map is not drawn yet', () => {
    expect(() => safeMove(() => { throw new Error('NativeCameraComponent ref is null'); })).not.toThrow();
  });
});

describe('arrowIsFixed', () => {
  it('is fixed while the camera follows', () => expect(arrowIsFixed(true, true, true, false)).toBe(true));
  it('stays a map marker while the map is left where the rider put it', () => expect(arrowIsFixed(true, true, false, false)).toBe(false));
  // Bug: tapping "centre on me" made the arrow jump to the screen centre at once while the map was still flying to the rider.
  it('stays a map marker during the flight back to the rider', () => expect(arrowIsFixed(true, true, true, true)).toBe(false));
});
