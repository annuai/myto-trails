import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react-native';
import { searchPlaces, type Place } from '@/lib/placeSearch';
import type { LatLng } from '@/lib/geo';
import { Field } from '@/ui/Field';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';

const MIN_CHARS = 3;
const WAIT_MS = 350;

/** Search as you type. Picking a result hands it up and clears the box, ready for the next stop. */
export function PlaceSearch({ near, onPick }: { near?: LatLng; onPick: (p: Place) => void }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Place[]>();
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const query = q.trim();

  useEffect(() => {
    setOffline(false);
    if (query.length < MIN_CHARS) { setFound(undefined); setBusy(false); return; }
    setBusy(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(query, { near, signal: ctl.signal })
        .then((r) => { setFound(r); setBusy(false); })
        .catch((e: Error) => { if (e.name === 'AbortError') return; setFound(undefined); setOffline(true); setBusy(false); });
    }, WAIT_MS);
    return () => { clearTimeout(t); ctl.abort(); };
    // `near` only biases the order of results; a new stop must not restart a search that is already running.
  }, [query]);

  return (
    <>
      <Field label="Add a place" value={q} onChangeText={setQ} placeholder="Search a town, viewpoint or address" autoCorrect={false} returnKeyType="search" />
      {offline ? <Text variant="label" tone="stop">Search needs a connection. You can still tap the map to add points.</Text> : null}
      {found?.length ? (
        <ListCard>
          {found.map((p, i) => <Row key={`${p.name}-${i}`} icon={MapPin} label={p.name} sub={p.detail || undefined} chevron={false} onPress={() => { onPick(p); setQ(''); setFound(undefined); }} />)}
        </ListCard>
      ) : found && !busy ? <Text variant="label" tone="muted">Nothing found for “{query}”. Try another spelling, or tap the map.</Text> : null}
    </>
  );
}
