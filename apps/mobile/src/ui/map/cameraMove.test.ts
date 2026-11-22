import { describe, expect, it, vi } from 'vitest';
import { safeMove } from './cameraMove';

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
