import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, ClipboardList, MoreHorizontal, Route as RouteIcon, Trash2 } from 'lucide-react-native';
import { toTrailLike } from '@/api/status';
import { useTrailSearch } from '@/api/useApi';
import { useTrailStore } from '@/store/trails';
import { finishRide } from '@/lib/finishRide';
import { useRecorder } from '@/store/recorder';
import { IconButton } from '@/ui/IconButton';
import { Sheet } from '@/ui/Sheet';
import { dueInfo, isDueSoon } from '@/lib/todos';
import { distanceKm, durationParts, speedKmh } from '@/lib/units';
import { useProfile } from '@/store/profile';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Columns } from '@/ui/Columns';
import { useLayout } from '@/ui/useLayout';
import { StatusChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { SectionTitle } from '@/ui/Header';
import { HeroCard, ProgressBar } from '@/ui/HeroCard';
import { ListCard } from '@/ui/ListCard';
import { Row } from '@/ui/ListCard';
import { RideMap } from '@/ui/RideMap';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { TrailTile } from '@/ui/TrailRow';

export default function Home() {
  const router = useRouter();
  const { landscape } = useLayout();
  const rides = useRides((s) => s.rides);
  const nextTrip = useTrailStore((s) => s.nextTrip);
  const [menu, setMenu] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const recoverable = useRecorder((s) => s.recoverable);
  // A ride left on disk by a crash or a kill is offered back, never dropped.
  useEffect(() => { void useRecorder.getState().checkRecoverable(); }, []);
  const saveRecovered = async () => { const id = await finishRide().catch(() => undefined); await useRecorder.getState().checkRecoverable(); setRecoverOpen(false); if (id) router.push(`/story/${id}`); };
  const continueRecovered = async () => { await useRecorder.getState().recover(); setRecoverOpen(false); router.push('/ride/live'); };
  const discardRecovered = async () => { await useRecorder.getState().discardRecovered(); setRecoverOpen(false); };
  const near = useTrailSearch('');
  const km_ = totalKm(rides);
  const todos = useTodos((s) => s.todos);
  const contacts = useProfile((s) => s.contacts);
  const trail = nextTrip;
  const packs = todos.filter((t) => t.category === 'pack');
  const dues = todos.map((t) => ({ t, d: dueInfo(t, km_) })).filter(({ d }) => d.state !== 'done').sort((a, b) => a.d.sortKey - b.d.sortKey);
  const overdue = dues.filter(({ d }) => d.state === 'overdue');
  const latest = rides[0];

  return (
    <Screen tabs brand overlay={<>
      <Sheet open={menu} title="Next ride" onClose={() => setMenu(false)}>
        <Text variant="label" tone="muted">{trail ? `${trail.name}${trail.date ? `, ${trail.date}` : ''}` : ''}</Text>
        <Button variant="danger" icon={Trash2} label="Cancel this plan" onPress={() => { useTrailStore.getState().cancelPlan(); setMenu(false); }} />
        <Button variant="soft" label="Keep it" onPress={() => setMenu(false)} />
      </Sheet>
      <Sheet open={recoverOpen} title="Recovered ride" onClose={() => setRecoverOpen(false)}>
        <Text variant="label" tone="muted">Myto closed while you were recording. {recoverable ? `${recoverable.points} GPS points were saved on this phone.` : ''}</Text>
        <Button label="Save ride" onPress={() => void saveRecovered()} />
        <Button variant="soft" label="Keep riding" onPress={() => void continueRecovered()} />
        <Button variant="danger" icon={Trash2} label="Discard" onPress={() => void discardRecovered()} />
      </Sheet>
    </>}>
      <Columns
        rightStartsWithSection
        left={<>
      {recoverable ? (
        <View style={{ marginBottom: 12 }}>
          <Banner eyebrow="Unsaved ride" title={`Recovered a ride from ${new Date(recoverable.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Save it or discard it.`} onPress={() => setRecoverOpen(true)} />
        </View>
      ) : null}
      {trail ? (
        <HeroCard eyebrow={trail.date ? `Next ride · ${trail.date}` : 'Next ride'} title={trail.name} action={<IconButton icon={MoreHorizontal} label="Next ride options" onPress={() => setMenu(true)} plain />}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip status={trail.status} label={trail.statusLabel} />
          </View>
          {packs.length ? (
            <View style={{ gap: 8 }}>
              <ProgressBar value={packs.filter((p) => p.done).length} max={packs.length} label="Packed" />
              <Text variant="label" tone="muted">{packs.filter((p) => p.done).length} of {packs.length} packed</Text>
            </View>
          ) : null}
        </HeroCard>
      ) : (
        <HeroCard eyebrow="Next ride" title="Plan your next ride">
          <Text variant="label" tone="muted">Pick a trail, set a date, and it shows up here with your checklist.</Text>
        </HeroCard>
      )}
      <View style={{ marginTop: 12, gap: 12 }}>
        <Button label={trail ? 'Start ride' : 'Find a trail'} arrow onPress={() => router.push(trail ? '/ride' : '/trails')} />
        {overdue.length ? (
          <Banner eyebrow="Needs attention" title={overdue.length === 1 ? `${overdue[0].t.title}: ${overdue[0].d.text.toLowerCase()}` : `${overdue.length} things are overdue`} onPress={() => router.push('/todos')} />
        ) : contacts.length === 0 ? (
          <Banner eyebrow="Safety" title="Add an emergency contact so SOS can reach someone" onPress={() => router.push('/documents/contacts')} />
        ) : null}
      </View>

      <SectionTitle onAdd={() => router.push('/todos/new')} addLabel="Add a to-do">Due soon</SectionTitle>
      {dues.length ? (
        <ListCard>
          {dues.slice(0, 3).map(({ t, d }) => (
            <Row key={t.id} icon={t.category === 'pack' ? Camera : ClipboardList} label={t.title} value={d.text.replace('Due in ', 'in ').replace('Due ', '')} onPress={() => router.push('/todos')} chevron={false} />
          ))}
        </ListCard>
      ) : <EmptyState icon={ClipboardList} title="Nothing due" body="Add your PUC, insurance or a chain lube reminder." />}
      <View style={{ marginTop: 12 }}><Button variant="soft" label="See all" arrow onPress={() => router.push('/todos')} /></View>

        </>}
        right={<>
      <SectionTitle>Near you</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={landscape ? undefined : { marginHorizontal: -20, paddingLeft: 20 }}>
        {(near.data?.items ?? []).slice(0, 8).map((t) => <TrailTile key={t.slug} trail={toTrailLike(t)} onPress={() => router.push(`/trail/${t.slug}`)} />)}
        {!near.data ? <Text variant="label" tone="muted">{near.error ?? 'Loading trails…'}</Text> : null}
      </ScrollView>

      <SectionTitle>Your latest ride</SectionTitle>
      {latest ? (
        <Card padded={false}>
          <RideMap points={latest.points} breaks={latest.breaks} />
          <View style={{ padding: 20, gap: 16 }}>
            <Text variant="bodyMedium">{latest.name}{latest.sample ? ' (sample)' : ''}</Text>
            <View style={{ flexDirection: 'row' }}>
              <Stat parts={durationParts(latest.durationSec)} label="Duration" /><Stat parts={distanceKm(latest.distanceKm)} label="Distance" /><Stat parts={speedKmh(latest.maxKmh)} label="Top speed" />
            </View>
          </View>
        </Card>
      ) : <EmptyState icon={RouteIcon} title="No rides yet" body="Tap Record to log your first ride." />}
      {latest ? <View style={{ marginTop: 12, gap: 12 }}>
        <Button variant="soft" label="View ride story" arrow onPress={() => router.push(`/story/${latest.id}`)} />
        <Button variant="soft" label="All rides" arrow onPress={() => router.push('/rides')} />
      </View> : null}
        </>}
      />
    </Screen>
  );
}
