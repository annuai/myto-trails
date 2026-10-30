import { useState } from 'react';
import { useBrowsingCountry } from '@/api/useApi';
import { mapStart, type MapStart } from '@/lib/mapStart';
import { useLocation } from '@/store/location';

/** Where a map opens before it has a route to show. Decided once, when the map first draws, so it never jumps while the rider looks at it. */
export function useMapStart(): MapStart {
  const fix = useLocation((s) => s.fix);
  const browsing = useBrowsingCountry();
  const [start] = useState<MapStart>(() => mapStart({ position: fix ? { lat: fix.lat, lng: fix.lng } : null, browsing }));
  return start;
}
