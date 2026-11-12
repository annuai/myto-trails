import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Search } from 'lucide-react-native';
import { toTrailLike } from '@/api/status';
import type { TrailSummary } from '@/api/types';
import { useSaved, useTrailSearch } from '@/api/useApi';
import { haversine } from '@/lib/geo';
import { roadDistancesKm } from '@/lib/roadDistance';
import { useAuth } from '@/store/auth';
import { useLocation } from '@/store/location';
import { useDistanceUnit } from '@/store/region';
import { useTrailStore } from '@/store/trails';
import { rhythm, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { NotOpenNotice } from '@/ui/NotOpenNotice';
import { ChoiceChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { Reveal } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { useLayout } from '@/ui/useLayout';
import { Text } from '@/ui/Text';
import { TrailRow, TrailTile } from '@/ui/TrailRow';

const filters = ['All', 'Open', 'Saved', 'Offline'] as const;

export default function Trails() {
  const router = useRouter();
  const { landscape } = useLayout();
  const signedIn = !!useAuth((s) => s.token);
  const offline = useTrailStore((s) => s.offline);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof filters)[number]>('All');
  useDistanceUnit(); // re-draws the list when the unit changes
  useEffect(() => { const id = setTimeout(() => setQ(text), 350); return () => clearTimeout(id); }, [text]);
  const search = useTrailSearch(q);
  const saved = useSaved();
  // Trails nearest the rider first, with how far each is. It needs a position, so the page watches for one.
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  useEffect(() => useLocation.getState().acquire(), []);
  const nearest = useMemo(() => (fix ? (search.data?.items ?? []).map((t) => ({ t, km: haversine({ lat: fix.lat, lng: fix.lng }, { lat: t.lat, lng: t.lon }) / 1000 })).sort((a, b) => a.km - b.km).slice(0, 8) : []), [fix, search.data]);
  // The straight line picks and orders the eight; the road distance replaces it once the router answers, and stays the straight line if it never does.
  // Asked again only when the rider has moved about 2 km, so a list is not re-routed on every GPS fix.
  const [road, setRoad] = useState<Map<string, number>>(new Map());
  const cell = fix ? `${(fix.lat * 50).toFixed(0)},${(fix.lng * 50).toFixed(0)}` : '';
  const slugs = nearest.map((n) => n.t.slug).join();
  useEffect(() => {
    if (!fix || !nearest.length) return;
    const ctl = new AbortController();
    void roadDistancesKm({ lat: fix.lat, lng: fix.lng }, nearest.map((n) => ({ lat: n.t.lat, lng: n.t.lon })), ctl.signal)
      .then((km) => km && setRoad(new Map(nearest.flatMap((n, i) => (km[i] == null ? [] : [[n.t.slug, km[i]!] as const])))))
      .catch(() => undefined);
    return () => ctl.abort();
  }, [cell, slugs]); // eslint-disable-line react-hooks/exhaustive-deps
  const near = useMemo(() => nearest.map((n) => ({ ...n, km: road.get(n.t.slug) ?? n.km, byRoad: road.has(n.t.slug) })).sort((a, b) => a.km - b.km), [nearest, road]);

  const source: TrailSummary[] | undefined =
    f === 'Offline' ? Object.values(offline).map((o) => o.detail)
    : f === 'Saved' ? saved.data?.flatMap((i) => (i.trail ? [i.trail] : []))
    : search.data?.items;
  const list = (source ?? []).filter((t) => f !== 'Open' || (t.accessClass === 'public' && t.condition === 'open'));
  const loading = f === 'Saved' ? saved.loading && !saved.data : f === 'Offline' ? false : search.loading && !search.data;
  const error = f === 'Offline' ? undefined : f === 'Saved' ? saved.error : search.error;

  return (
    <Screen tabs brand>
      <PageTitle>Trails</PageTitle>
      <NotOpenNotice />
      {!q.trim() && f === 'All' ? (
        <>
          <SectionTitle first>Near you</SectionTitle>
          {near.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3], paddingRight: space[5] }} style={landscape ? undefined : { marginHorizontal: -space[5], paddingLeft: space[5] }}>
              {near.map(({ t, km, byRoad }) => <TrailTile key={t.slug} trail={toTrailLike(t)} awayKm={km} byRoad={byRoad} onPress={() => router.push(`/trail/${t.slug}`)} />)}
            </ScrollView>
          ) : <Text variant="label" tone={gpsError ? 'caution' : 'muted'}>{gpsError ?? (fix ? 'Finding trails near you…' : 'Finding your location…')}</Text>}
        </>
      ) : null}
      <View style={!q.trim() && f === 'All' ? { marginTop: rhythm.betweenSections } : undefined}>
        <Field label="Search" placeholder="Trail, town or place" value={text} onChangeText={setText} returnKeyType="search" />
      </View>
      <View style={{ flexDirection: 'row', gap: space[2], marginVertical: space[5], flexWrap: 'wrap' }}>
        {filters.map((x) => <ChoiceChip key={x} label={x} selected={f === x} onPress={() => setF(x)} />)}
      </View>
      {f === 'Saved' && !signedIn ? <EmptyState icon={Search} title="Sign in to see Saved" body="Saved trails follow your account. Sign in from the You tab." /> : (
        <View style={{ gap: space[3] }}>
          {loading ? <Text variant="label" tone="muted">Finding trails…</Text> : null}
          {error ? (
            <View style={{ gap: space[3] }}>
              <EmptyState icon={CloudOff} title="Could not load trails" body={error} />
              <Button variant="soft" label="Try again" onPress={f === 'Saved' ? saved.reload : search.reload} />
            </View>
          ) : null}
          {!loading && !error && list.length === 0 ? <EmptyState icon={Search} pose="map" title={f === 'Offline' ? 'Nothing saved for offline yet' : f === 'Saved' ? 'No saved trails yet' : 'No trails match'} body={f === 'Offline' ? 'Download a trail from its page and it works without signal.' : f === 'Saved' ? 'Tap Save on a trail you want to come back to.' : 'Try another name, or clear the filter.'} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
            {list.map((t, i) => <Reveal key={t.slug} delay={Math.min(i, 8) * 45} style={{ width: landscape ? '48.9%' : '100%' }}><TrailRow trail={toTrailLike(t)} onPress={() => router.push(`/trail/${t.slug}`)} /></Reveal>)}
          </View>
        </View>
      )}
      {search.data && f === 'All' ? <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[6] }}>{search.data.total} published trail{search.data.total === 1 ? '' : 's'}. Status shows access first, then condition.</Text> : null}
    </Screen>
  );
}
