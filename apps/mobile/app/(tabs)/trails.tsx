import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Search } from 'lucide-react-native';
import { toTrailLike } from '@/api/status';
import type { TrailSummary } from '@/api/types';
import { useSaved, useTrailSearch } from '@/api/useApi';
import { useAuth } from '@/store/auth';
import { useDistanceUnit } from '@/store/region';
import { useTrailStore } from '@/store/trails';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { NotOpenNotice } from '@/ui/NotOpenNotice';
import { ChoiceChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { PageTitle } from '@/ui/Header';
import { Reveal } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { useLayout } from '@/ui/useLayout';
import { Text } from '@/ui/Text';
import { TrailRow } from '@/ui/TrailRow';

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
      <Field label="Search" placeholder="Trail, town or place" value={text} onChangeText={setText} returnKeyType="search" />
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 20, flexWrap: 'wrap' }}>
        {filters.map((x) => <ChoiceChip key={x} label={x} selected={f === x} onPress={() => setF(x)} />)}
      </View>
      {f === 'Saved' && !signedIn ? <EmptyState icon={Search} title="Sign in to see Saved" body="Saved trails follow your account. Sign in from the You tab." /> : (
        <View style={{ gap: 12 }}>
          {loading ? <Text variant="label" tone="muted">Finding trails…</Text> : null}
          {error ? (
            <View style={{ gap: 12 }}>
              <EmptyState icon={CloudOff} title="Could not load trails" body={error} />
              <Button variant="soft" label="Try again" onPress={f === 'Saved' ? saved.reload : search.reload} />
            </View>
          ) : null}
          {!loading && !error && list.length === 0 ? <EmptyState icon={Search} title={f === 'Offline' ? 'Nothing saved for offline yet' : f === 'Saved' ? 'No saved trails yet' : 'No trails match'} body={f === 'Offline' ? 'Download a trail from its page and it works without signal.' : f === 'Saved' ? 'Tap Save on a trail you want to come back to.' : 'Try another name, or clear the filter.'} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {list.map((t, i) => <Reveal key={t.slug} delay={Math.min(i, 8) * 45} style={{ width: landscape ? '48.9%' : '100%' }}><TrailRow trail={toTrailLike(t)} onPress={() => router.push(`/trail/${t.slug}`)} /></Reveal>)}
          </View>
        </View>
      )}
      {search.data && f === 'All' ? <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 24 }}>{search.data.total} published trail{search.data.total === 1 ? '' : 's'}. Status shows access first, then condition.</Text> : null}
    </Screen>
  );
}
