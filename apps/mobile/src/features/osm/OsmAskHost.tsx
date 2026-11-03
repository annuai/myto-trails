import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useOnboarding } from '@/store/onboarding';
import { useOsm } from '@/store/osm';
import { useRecorder } from '@/store/recorder';

/**
 * The one-time question for riders who already use the app when this arrives: the same "Help improve the map." page the welcome flow
 * shows new riders, opened the first time the app is open on a quiet screen. It is asked once: a rider who answered in the welcome flow
 * never sees it, and answering (Continue) is what stops it. Not during the welcome flow, not while a ride is recording.
 */
export function OsmAskHost() {
  const router = useRouter();
  const path = usePathname();
  const onboarded = useOnboarding((s) => s.done);
  const asked = useOsm((s) => s.asked);
  const riding = useRecorder((s) => s.status === 'running');
  const [loaded, setLoaded] = useState(useOsm.persist.hasHydrated() && useOnboarding.persist.hasHydrated());
  const sent = useRef(false);
  useEffect(() => {
    if (loaded) return;
    const stops = [useOsm.persist.onFinishHydration(() => setLoaded(useOsm.persist.hasHydrated() && useOnboarding.persist.hasHydrated())), useOnboarding.persist.onFinishHydration(() => setLoaded(useOsm.persist.hasHydrated() && useOnboarding.persist.hasHydrated()))];
    return () => stops.forEach((s) => s());
  }, [loaded]);
  const quiet = path === '/' || path === '/you' || path === '/trails' || path === '/clubs';
  useEffect(() => {
    if (sent.current || !loaded || !onboarded || asked || riding || !quiet) return;
    sent.current = true;
    router.push({ pathname: '/onboarding', params: { step: 'maps', update: '1' } });
  }, [loaded, onboarded, asked, riding, quiet, router]);
  return null;
}
