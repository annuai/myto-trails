import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Search } from 'lucide-react-native';
import { toTrailLike } from '@/api/status';
import type { TrailSummary } from '@/api/types';
import { useSaved, useTrailSearch } from '@/api/useApi';
import { useAuth } from '@/store/auth';
import { useTrailStore } from '@/store/trails';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { BrandHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TrailRow } from '@/ui/TrailRow';

const filters = ['All', 'Open', 'Saved', 'Offline'] as const;

export default function Trails() {
  const router = useRouter();
  const signedIn = !!useAuth((s) => s.token);
  const offline = useTrailStore((s) => s.offline);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof filters)[number]>('All');
  useEffect(() => { const id = setTimeout(() => setQ(text), 350); return () => clearTimeout(id); }, [text]);
  const search = useTrailSearch(q);
  const saved = useSaved();

  const source: TrailSummary[] | undefined =
    f === 'Offline' ? Object.values(offline).map((o) => o.detail)
    : f === 'Saved' ? saved.data?.flatMap((i) => (i.trail ? [i.trail] : []))
    : search.data?.items;
  const list = (source ?? []).filter((t) => f !== 'Open' || (t.accessClass === 'public' && t.condition === 'open'));
  const loading = f === 'Saved' ? saved.loading && !saved.data : f === 'Offline' ? false : search.loading && !search.data;
  const error = f === 'Offline' ? undefined : f === 'Saved' ? saved.error : search.error;

  return (
    <Screen tabs>
      <BrandHeader />
      <PageTitle>Trails</PageTitle>
      <Field label="Search" placeholder="Trail, town or place" value={text} onChangeText={setText} returnKeyType="search" />
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 20, flexWrap: 'wrap' }}>
        {filters.map((x) => <ChoiceChip key={x} label={x} selected={f === x} onPress={() => setF(x)} />)}
      </View>
      {f === 'Saved' && !signedIn ? <EmptyState icon={Search} title="Sign in to see Saved" body="Saved trails follow your account. Sign in from the You tab." /> : (
        <View style={{ gap: 12 }}>
          {loading ? <Text variant="label" tone="muted">Loading trails…</Text> : null}
          {error ? (
            <View style={{ gap: 12 }}>
              <EmptyState icon={CloudOff} title="Could not load trails" body={error} />
              <Button variant="soft" label="Try again" onPress={f === 'Saved' ? saved.reload : search.reload} />
            </View>
          ) : null}
          {!loading && !error && list.length === 0 ? <EmptyState icon={Search} title="No trails" body={f === 'Offline' ? 'Download a trail from its page to use it without a connection.' : 'Try another name or clear the filter.'} /> : null}
          {list.map((t) => <TrailRow key={t.slug} trail={toTrailLike(t)} onPress={() => router.push(`/trail/${t.slug}`)} />)}
        </View>
      )}
      {search.data && f === 'All' ? <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 24 }}>{search.data.total} published trail{search.data.total === 1 ? '' : 's'}. Status shows access first, then condition.</Text> : null}
    </Screen>
  );
}
