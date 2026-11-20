import { useEffect, useRef, useState } from 'react';
import { Globe, MapPin } from 'lucide-react-native';
import { searchPlaces, type Place, type PlaceResults } from '@/lib/placeSearch';
import { searchCentre, type SearchScope } from '@/lib/placeScope';
import type { LatLng } from '@/lib/geo';
import { asText, distanceKm } from '@/lib/units';
import { useLocation } from '@/store/location';
import { usePlaces } from '@/store/places';
import { Field } from '@/ui/Field';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';

const MIN_CHARS = 3;
const WAIT_MS = 350;

/** How a place is described: where it is, and how far when it is beyond "nearby". */
export const placeSub = (p: Place): string | undefined => [p.detail, p.farKm ? `${asText(distanceKm(p.farKm))} away` : ''].filter(Boolean).join(' · ') || undefined;

/**
 * Search as you type, around the rider: `near` (the map or last stop being planned), else where the phone is, else Home. Far places are left out
 * unless nothing is nearby or the rider taps "Search everywhere". Picking a result hands it up and clears the box, ready for the next stop.
 */
export function PlaceSearch({ near, onPick, label = 'Add a place', disabled }: { near?: LatLng; onPick: (p: Place) => void; label?: string; /** Typing is not allowed now (the bike is moving): the box is shown but cannot be written in. */ disabled?: boolean }) {
  const fix = useLocation((s) => s.fix);
  const home = usePlaces((s) => s.home);
  const centre = searchCentre(near, fix, home);
  const centreRef = useRef(centre);
  useEffect(() => { centreRef.current = centre; });
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<SearchScope>('nearby');
  const [found, setFound] = useState<PlaceResults>();
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const query = q.trim();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a request: it has to mark itself as loading before the answer comes back
    setOffline(false);
    if (query.length < MIN_CHARS) { setFound(undefined); setBusy(false); return; }
    setBusy(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(query, { near: centreRef.current, scope, signal: ctl.signal })
        .then((r) => { setFound(r); setBusy(false); })
        .catch((e: Error) => { if (e.name === 'AbortError') return; setFound(undefined); setOffline(true); setBusy(false); });
    }, WAIT_MS);
    return () => { clearTimeout(t); ctl.abort(); };
    // The centre is read when the search starts; moving the map or adding a stop must not restart a search that is already running.
  }, [query, scope]);

  return (
    <>
      <Field label={label} value={q} onChangeText={(t) => { setQ(t); setScope('nearby'); }} placeholder="Search a town, viewpoint or address" autoCorrect={false} returnKeyType="search" editable={!disabled} />
      {disabled ? <Text variant="label" tone="muted">Stop to search. You can still choose on the map.</Text> : null}
      {offline ? <Text variant="label" tone="stop">Search needs a connection. You can still tap the map to add points.</Text> : null}
      {found?.widened ? <Text variant="label" tone="muted">Nothing nearby, so this searched everywhere.</Text> : null}
      {found?.places.length ? (
        <ListCard>
          {found.places.map((p, i) => <Row key={`${p.name}-${i}`} icon={MapPin} label={p.name} sub={placeSub(p)} chevron={false} onPress={() => { onPick(p); setQ(''); setFound(undefined); setScope('nearby'); }} />)}
          {found.limited ? <Row icon={Globe} label="Search everywhere" sub="Not what you wanted? Look beyond this area." chevron={false} onPress={() => setScope('everywhere')} /> : null}
        </ListCard>
      ) : found && !busy ? <Text variant="label" tone="muted">Nothing found for “{query}”. Try another spelling, or tap the map.</Text> : null}
    </>
  );
}
