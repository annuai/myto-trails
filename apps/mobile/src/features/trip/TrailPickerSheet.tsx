import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { CloudOff, Search } from 'lucide-react-native';
import { toTrailLike } from '@/api/status';
import type { TrailSummary } from '@/api/types';
import { useTrailSearch } from '@/api/useApi';
import { haversine } from '@/lib/geo';
import { useLocation } from '@/store/location';
import { space } from '@/theme/tokens';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TrailRow } from '@/ui/TrailRow';

/** Trails shown before the rider searches. */
export const NEARBY_COUNT = 5;
/** The most results shown for a search, so a broad word does not make a very long list. */
export const SEARCH_COUNT = 20;

/** The nearest `n` trails to a position, nearest first. Without a position, the first `n` as the site lists them. */
export function nearestTrails(items: TrailSummary[], at: { lat: number; lng: number } | undefined, n: number): TrailSummary[] {
  if (!at) return items.slice(0, n);
  return items.map((t) => ({ t, km: haversine(at, { lat: t.lat, lng: t.lon }) })).sort((a, b) => a.km - b.km).slice(0, n).map((x) => x.t);
}

/**
 * A list of published trails with their pictures, like the Trails page, in a sheet of its own so it opens over another sheet.
 * Five trails near the rider to begin with; whatever they type searches every trail.
 */
export function TrailPickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (trail: TrailSummary) => void }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const id = setTimeout(() => setQ(text), 350); return () => clearTimeout(id); }, [text]);
  const search = useTrailSearch(q);
  const fix = useLocation((s) => s.fix);
  useEffect(() => (open ? useLocation.getState().acquire() : undefined), [open]);
  const searching = q.trim().length > 0;
  const items = search.data?.items;
  const list = useMemo(() => (!items ? [] : searching ? items.slice(0, SEARCH_COUNT) : nearestTrails(items, fix ? { lat: fix.lat, lng: fix.lng } : undefined, NEARBY_COUNT)), [items, searching, fix]);
  const pick = (t: TrailSummary) => { onPick(t); onClose(); setText(''); setQ(''); };
  return (
    <Sheet open={open} title="Choose a trail" onClose={onClose}>
      <Field label="Search" placeholder="Trail, town or place" value={text} onChangeText={setText} returnKeyType="search" />
      {!searching && items ? <Text variant="label" tone="muted">{fix ? 'Near you. Search for any other trail.' : 'Search for a trail by name or place. Turn on location to see the ones near you.'}</Text> : null}
      <View style={{ gap: space[3] }}>
        {search.loading && !items ? <Text variant="label" tone="muted">Finding trails…</Text> : null}
        {search.error ? <EmptyState icon={CloudOff} title="Could not load trails" body={search.error} /> : null}
        {!search.loading && !search.error && list.length === 0 ? <EmptyState icon={Search} pose="map" title="No trails match" body="Try another name or place." /> : null}
        {list.map((t) => <TrailRow key={t.slug} trail={toTrailLike(t)} onPress={() => pick(t)} />)}
      </View>
    </Sheet>
  );
}
