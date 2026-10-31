import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { requestRideLocationAccess, rideLocationAccess } from './backgroundLocation';

export type RideAccess = 'always' | 'foreground' | 'denied' | 'unknown';

/**
 * Where the rider stands on Always location, read again whenever the app comes back to the front (they may have changed it in Settings).
 * `ask` shows the system question; where the system will not ask again it opens Settings instead. The browser cannot grant background
 * location, so there it reads as 'always' and nothing is asked.
 */
export function useRideLocationAccess() {
  const [access, setAccess] = useState<RideAccess>(Platform.OS === 'web' ? 'always' : 'unknown');
  const refresh = useCallback(() => { if (Platform.OS !== 'web') void rideLocationAccess().then(setAccess).catch(() => undefined); }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);
  /** Resolves true when Always is on, false when the rider was sent to Settings or chose less. */
  const ask = useCallback(async (): Promise<boolean> => {
    const before = await rideLocationAccess().catch(() => 'unknown' as const);
    const now = await requestRideLocationAccess();
    setAccess(now);
    if (now === 'denied' || (now === 'foreground' && before === 'foreground')) { await Linking.openSettings(); return false; }
    return now === 'always';
  }, []);
  return { access, refresh, ask };
}
