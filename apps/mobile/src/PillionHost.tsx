import { useEffect } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { nowMs } from '@/lib/clock';
import { nextVisit, visitForRide } from '@/lib/story/nextVisit';
import { visitOf } from '@/lib/story/visits';
import { useOnboarding } from '@/store/onboarding';
import { usePillion } from '@/store/pillion';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';
import { useStory } from '@/store/story';
import { useTrips } from '@/store/trips';
import { soonestTrip } from '@/lib/tripPlan';
import { PillionDialog } from '@/ui/PillionDialog';

/** An open is a cold start, or coming back to the app after this long away. */
const AWAY_MS = 30 * 60_000;

/**
 * Pillion's visits. Counts opens, plans the greeting, remembers a ride that has just finished, and when the rider is on Home with nothing
 * else going on shows the visit that is due (greeting, a finished ride, a trip about to start). One at a time, and counted with the
 * story's Moments: a session that already showed one gets no visit. A notification opens a visit directly (`/pillion?visit=`), which
 * skips the checks, because the rider chose it.
 */
export function PillionHost() {
  const router = useRouter();
  const path = usePathname();
  const current = usePillion((s) => s.current);
  const onboarded = useOnboarding((s) => s.done);
  const riding = useRecorder((s) => s.status !== 'idle');
  const pending = usePillion((s) => s.pending);
  const plan = usePillion((s) => s.plan);
  const trips = useTrips((s) => s.trips);

  // Opens: once at start, and again after a while away.
  useEffect(() => {
    usePillion.getState().noteOpen(nowMs());
    const app = AppState.addEventListener('change', (s) => {
      const last = usePillion.getState().lastOpenAt ?? 0;
      if (s === 'active' && nowMs() - last > AWAY_MS) usePillion.getState().noteOpen(nowMs());
    });
    return () => app.remove();
  }, []);

  // Whether the rider arrived before or after this was added, decided once; the greeting is planned when that is known.
  useEffect(() => {
    usePillion.getState().observeOnboarding(onboarded, nowMs());
    usePillion.getState().ensurePlan(Math.random);
  }, [onboarded]);
  useEffect(() => usePillion.subscribe((s, prev) => { if (s.opens !== prev.opens || s.onboardedAt !== prev.onboardedAt || s.origin !== prev.origin) s.ensurePlan(Math.random); }), []);

  // A ride that has just finished earns a visit, shown the next time the rider is on Home.
  useEffect(() => useRides.subscribe((s, prev) => {
    if (s.rides.length <= prev.rides.length) return;
    const r = s.rides[s.rides.length - 1];
    const v = visitForRide(r, nowMs());
    if (v) usePillion.getState().queue(v);
  }), []);

  const home = path === '/' || path === '/index' || path === '/home';
  useEffect(() => {
    const p = usePillion.getState();
    const trip = soonestTrip(trips);
    const next = nextVisit({
      now: nowMs(), home, riding, onboarded,
      busy: !!p.current || useStory.getState().shownThisSession.length > 0,
      greeting: { opens: p.opens, origin: p.origin, onboardedAt: p.onboardedAt, plan: p.plan, greeted: p.greeted },
      pending: p.pending, shown: p.shown,
      trip: trip?.startDate ? { id: trip.id, name: trip.name, startDate: trip.startDate } : undefined,
    });
    if (!next) return;
    p.show(visitOf(next.id, { trip: next.trip }), next.key, nowMs());
    useStory.getState().noteShown(`visit:${next.key}`);
  }, [home, riding, onboarded, pending, plan, trips, current]);

  if (!current) return null;
  const { visit } = current;
  return <PillionDialog key={current.key} visit={visit} onClose={() => usePillion.getState().dismiss()} onAction={() => visit.route && router.push(visit.route as never)} />;
}
