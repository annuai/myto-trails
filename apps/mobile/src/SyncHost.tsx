import { useEffect } from 'react';
import { AppState } from 'react-native';
import { scanNow, syncNow } from '@/lib/sync/syncNow';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useSync } from '@/store/sync';
import { useTodos } from '@/store/todos';
import { useTrips } from '@/store/trips';

const EDIT_QUIET_MS = 10_000;
const EVERY_MS = 5 * 60_000;

/**
 * Keeps a rider's phones in step when sync is on: on start, when the app comes back, every five minutes, and a few seconds after
 * an edit (so "waiting to sync" is right at once and a finished ride is on its way before the phone is put away).
 */
export function SyncHost() {
  useEffect(() => {
    void syncNow();
    const timer = setInterval(() => void syncNow(), EVERY_MS);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') void syncNow(); });
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const edited = () => {
      if (!useSync.getState().enabled) return;
      scanNow();
      clearTimeout(quiet);
      quiet = setTimeout(() => void syncNow(), EDIT_QUIET_MS);
    };
    const unsubs = [useRides.subscribe(edited), useTodos.subscribe(edited), useTrips.subscribe(edited), useAuth.subscribe((s, p) => { if (s.token && !p.token) void syncNow(); })];
    return () => { clearInterval(timer); clearTimeout(quiet); app.remove(); unsubs.forEach((u) => u()); };
  }, []);
  return null;
}
