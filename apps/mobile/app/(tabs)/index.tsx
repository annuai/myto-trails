import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Camera, ClipboardList, Luggage, MoreHorizontal, Route as RouteIcon, Trash2 } from 'lucide-react-native';
import { groupByRide, summarise } from '@/lib/journalEntries';
import { journalDate, journalTitle } from '@/lib/journalTitle';
import { notifier } from '@/lib/notifier';
import { usePermission } from '@/lib/usePermission';
import { syncReminders } from '@/NotificationHost';
import { useJournal } from '@/store/journal';
import { useNotifications } from '@/store/notifications';
import { toTrailLike } from '@/api/status';
import { useTrailSearch } from '@/api/useApi';
import { CheckinSheet } from '@/features/CheckinSheet';
import { GroupSheet } from '@/features/GroupSheet';
import { checkinStatus } from '@/lib/checkinCore';
import { clockLabel } from '@/lib/community';
import { useCompanion } from '@/store/companion';
import { PlanTripSheet } from '@/features/trip/PlanTripSheet';
import { startTodaysRide, startTrip } from '@/features/trip/startTrip';
import { TripCard } from '@/features/trip/TripCard';
import { dayIndexOn, soonestTrip, tripStatus } from '@/lib/tripPlan';
import { todayISO } from '@/lib/dates';
import { useTrips } from '@/store/trips';
import { space } from '@/theme/tokens';
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
  const saveRecovered = async () => { const id = await finishRide().catch(() => undefined); await useRecorder.getState().checkRecoverable(); setRecoverOpen(false); if (id) { useTrips.getState().attachToActive(id); router.push(`/story/${id}`); } };
  const continueRecovered = async () => { await useRecorder.getState().recover(); setRecoverOpen(false); router.push('/ride/live'); };
  const discardRecovered = async () => { await useRecorder.getState().discardRecovered(); setRecoverOpen(false); };
  const near = useTrailSearch('');
  const km_ = totalKm(rides);
  const todos = useTodos((s) => s.todos);
  const contacts = useProfile((s) => s.contacts);
  const trail = nextTrip;
  const trips = useTrips((s) => s.trips);
  const today = todayISO();
  const nextTripPlan = soonestTrip(trips, today);
  const planStatus = nextTripPlan ? tripStatus(nextTripPlan, today) : undefined;
  const [planTripOpen, setPlanTripOpen] = useState(false);
  const packs = todos.filter((t) => t.category === 'pack' && !t.tripId);
  const dues = todos.map((t) => ({ t, d: dueInfo(t, km_) })).filter(({ d }) => d.state !== 'done').sort((a, b) => a.d.sortKey - b.d.sortKey);
  const overdue = dues.filter(({ t, d }) => d.state === 'overdue' && !t.tripId);
  // A trip's pack to-dos all fall due on its start date: they are one line under Due soon, not a dozen.
  const dueRows = [
    ...dues.filter(({ t }) => !t.tripId).map(({ t, d }) => ({ key: t.id, sort: d.sortKey, icon: t.category === 'pack' ? Camera : ClipboardList, label: t.title, sub: undefined as string | undefined, value: d.text.replace('Due in ', 'in ').replace('Due ', ''), go: '/todos' })),
    ...trips.filter((tr) => ['active', 'ready', 'upcoming'].includes(tripStatus(tr, today))).flatMap((tr) => {
      const mine = dues.filter(({ t }) => t.tripId === tr.id);
      return mine.length ? [{ key: tr.id, sort: mine[0]!.d.sortKey, icon: Luggage, label: tr.name, sub: `${mine.length} to pack`, value: mine[0]!.d.text.replace('Due in ', 'in ').replace('Due ', ''), go: `/trips/${tr.id}` }] : [];
    }),
  ].sort((a, b) => a.sort - b.sort);
  const latest = rides[0];
  const journals = groupByRide(useJournal((s) => s.entries)).slice(0, 3);
  const journalTitles = useJournal((s) => s.titles);
  const { permission, refresh } = usePermission();
  const asked = useNotifications((s) => s.asked);
  const [remindOpen, setRemindOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const checkin = useCompanion((s) => s.checkin);
  const group = useCompanion((s) => s.group);
  const nowMs = Date.now();

  return (
    <Screen tabs brand overlay={<>
      <Sheet open={menu} title="Next ride" onClose={() => setMenu(false)}>
        <Text variant="label" tone="muted">{trail ? `${trail.name}${trail.date ? `, ${trail.date}` : ''}` : ''}</Text>
        <Button variant="danger" icon={Trash2} label="Cancel this plan" onPress={() => { useTrailStore.getState().cancelPlan(); setMenu(false); }} />
        <Button variant="soft" label="Keep it" onPress={() => setMenu(false)} />
      </Sheet>
      <PlanTripSheet open={planTripOpen} onClose={() => setPlanTripOpen(false)} onCreated={(id) => router.push(`/trips/${id}`)} />
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} />
      <Sheet open={remindOpen} title="Turn on reminders" onClose={() => setRemindOpen(false)}>
        <Text variant="label" tone="muted">Myto Moto can remind you before a to-do is due, and the evening before a ride. Reminders are scheduled on this phone and nothing about them is sent anywhere.</Text>
        <Button label="Allow reminders" onPress={() => { setRemindOpen(false); void notifier.request().then(() => { refresh(); return syncReminders(); }).catch(() => undefined); }} />
        <Button variant="soft" label="Not now" onPress={() => { useNotifications.getState().setAsked(); setRemindOpen(false); }} />
      </Sheet>
      <Sheet open={recoverOpen} title="Recovered ride" onClose={() => setRecoverOpen(false)}>
        <Text variant="label" tone="muted">Myto Moto closed while you were recording. {recoverable ? `${recoverable.points} GPS points were saved on this phone.` : ''}</Text>
        <Button label="Save ride" onPress={() => void saveRecovered()} />
        <Button variant="soft" label="Keep riding" onPress={() => void continueRecovered()} />
        <Button variant="danger" icon={Trash2} label="Discard" onPress={() => void discardRecovered()} />
      </Sheet>
    </>}>
      <Columns
        rightStartsWithSection
        left={<>
      {recoverable ? (
        <View style={{ marginBottom: space[3] }}>
          <Banner eyebrow="Unsaved ride" title={`Recovered a ride from ${new Date(recoverable.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Save it or discard it.`} onPress={() => setRecoverOpen(true)} />
        </View>
      ) : null}
      {checkin ? (
        <View style={{ marginBottom: space[3] }}>
          <Banner eyebrow="I haven't arrived" title={checkinStatus(nowMs, checkin.expectedAt) === 'overdue' ? `You are overdue. ${checkin.contactName} can see where you were last seen.` : `${checkin.contactName} is told if you are not back by ${clockLabel(new Date(checkin.expectedAt).getHours() * 60 + new Date(checkin.expectedAt).getMinutes())}. Tap to change.`} onPress={() => setCheckinOpen(true)} />
        </View>
      ) : null}
      {group ? (
        <View style={{ marginBottom: space[3] }}>
          <Banner eyebrow="Group ride" title={`${group.name} · code ${group.code}`} onPress={() => setGroupOpen(true)} />
        </View>
      ) : null}
      {permission === 'undetermined' && !asked ? (
        <View style={{ marginBottom: space[3] }}>
          <Banner eyebrow="Reminders" title="Get a nudge before a to-do is due or a ride starts" onPress={() => setRemindOpen(true)} />
        </View>
      ) : null}
      {nextTripPlan ? (
        <TripCard trip={nextTripPlan} onOpen={() => router.push(`/trips/${nextTripPlan.id}`)} />
      ) : trail ? (
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
          <Text variant="label" tone="muted">Plan a trip with a date and a route for each day, or pick a trail. It shows up here with its checklist.</Text>
        </HeroCard>
      )}
      <View style={{ marginTop: space[3], gap: space[3] }}>
        {nextTripPlan && planStatus === 'ready' ? <Button variant="accent" label="Start trip" arrow onPress={() => startTrip(nextTripPlan.id, router)} />
          : nextTripPlan && planStatus === 'active' ? <Button variant="accent" label={`Record day ${(dayIndexOn(nextTripPlan, today) ?? 0) + 1}`} arrow onPress={() => startTodaysRide(nextTripPlan.id, router)} />
          : <Button label={trail ? 'Start ride' : 'Find a trail'} arrow onPress={() => router.push(trail ? '/ride' : '/trails')} />}
        <Button variant="soft" label="Plan a trip" onPress={() => setPlanTripOpen(true)} />
        {overdue.length ? (
          <Banner eyebrow="Needs attention" title={overdue.length === 1 ? `${overdue[0].t.title}: ${overdue[0].d.text.toLowerCase()}` : `${overdue.length} things are overdue`} onPress={() => router.push('/todos')} />
        ) : contacts.length === 0 ? (
          <Banner eyebrow="Safety" title="Add an emergency contact so SOS can reach someone" onPress={() => router.push('/documents/contacts')} />
        ) : null}
      </View>

      <SectionTitle onAdd={() => router.push(`/journal/${Date.now()}`)} addLabel="Start a journal">Recent journals</SectionTitle>
      {journals.length ? (
        <>
          <ListCard>
            {journals.map((g) => (
              <Row key={g.rideKey} icon={BookOpen} label={journalTitle(g.rideKey, rides, journalTitles)} sub={`${journalDate(g.rideKey)} · ${summarise(g.entries)}`} onPress={() => router.push(`/journal/${g.rideKey}`)} />
            ))}
          </ListCard>
          <View style={{ marginTop: space[3] }}><Button variant="soft" label="All journals" arrow onPress={() => router.push('/journal')} /></View>
        </>
      ) : <EmptyState icon={BookOpen} title="No journals yet" body="Write a note, record a voice note or add a photo. Tie it to a ride or keep it on its own." />}

      <SectionTitle onAdd={() => router.push('/todos/new')} addLabel="Add a to-do">Due soon</SectionTitle>
      {dueRows.length ? (
        <ListCard>
          {dueRows.slice(0, 3).map((r) => (
            <Row key={r.key} icon={r.icon} label={r.label} sub={r.sub} value={r.value} onPress={() => router.push(r.go as never)} chevron={false} />
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
      ) : <EmptyState icon={RouteIcon} title="No rides yet" body="Tap Ride to log your first ride." />}
      {latest ? <View style={{ marginTop: 12, gap: 12 }}>
        <Button variant="soft" label="View ride story" arrow onPress={() => router.push(`/story/${latest.id}`)} />
        <Button variant="soft" label="All rides" arrow onPress={() => router.push('/rides')} />
      </View> : null}
        </>}
      />
    </Screen>
  );
}
