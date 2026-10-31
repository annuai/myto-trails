import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellRing, Pause, Route as RouteIcon, Users } from 'lucide-react-native';
import { CheckinSheet } from '@/features/CheckinSheet';
import { DestinationOption } from '@/features/trip/DestinationOption';
import { StartBar, TrailHint } from '@/features/trip/RideStartActions';
import { chooseDayRoute, startTodaysRide, startTrip } from '@/features/trip/startTrip';
import { plannedSlots, slotTimeText } from '@/lib/plannedRides';
import { useTrips } from '@/store/trips';
import { space } from '@/theme/tokens';
import { GroupSheet } from '@/features/GroupSheet';
import { clockLabel } from '@/lib/community';
import { useCompanion } from '@/store/companion';
import { useMyRoutes } from '@/store/myRoutes';
import { needsAlwaysExplainer, requestRideLocationAccess, rideLocationAccess } from '@/lib/backgroundLocation';
import { useLocation } from '@/store/location';
import { useRecorder } from '@/store/recorder';
import { OsmMap } from '@/ui/map/OsmMap';
import { dueInfo } from '@/lib/todos';
import { papersSummary, paperStatus } from '@/lib/documentEntries';
import type { TripRoute } from '@/lib/tripPlan';
import { useProfile } from '@/store/profile';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrailStore } from '@/store/trails';
import { Button } from '@/ui/Button';
import { ChoiceChip, StatusChip, type Status } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Columns } from '@/ui/Columns';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

type Check = { label: string; status: Status; word: string; go?: string };

/** Record, ready: where are you going, the map, what we can truly check before a ride, then one big Start. */
export default function RideReady() {
  const router = useRouter();
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();
  const running = useRecorder((s) => s.status === 'running');
  const [source, setSource] = useState<'gps' | 'sim'>('gps');
  const [explain, setExplain] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const checkin = useCompanion((s) => s.checkin);
  const group = useCompanion((s) => s.group);
  const autoPause = useCompanion((s) => s.autoPause);
  const myRoute = useMyRoutes((s) => s.routes.find((r) => r.id === s.followId));
  const { licence, vehicle, contacts } = useProfile();
  const rides = useRides((s) => s.rides);
  const { offline, nextTrip } = useTrailStore();
  const todos = useTodos((s) => s.todos);
  const overdue = todos.filter((t) => dueInfo(t, totalKm(rides)).state === 'overdue').length;
  const trail = nextTrip;
  const trips = useTrips((s) => s.trips);
  // Planned rides for today, closest to the time now first. A trail picked on its own page (no trip) gets a card too.
  const slots = useMemo(() => plannedSlots(trips, new Map(trips.map((t) => [t.id, rides.filter((r) => t.rideIds.includes(r.id)).map((r) => r.startedAt)]))), [trips, rides]);
  const loneTrail = trail && !slots.some((s) => { const r = s.trip.days?.[s.dayIndex]?.route; return r?.kind === 'trail' && r.slug === trail.slug; }) ? trail : undefined;
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  // Start looking for the rider as soon as this screen opens, so a fix is ready by the time the ride starts.
  useEffect(() => (source === 'gps' ? useLocation.getState().acquire() : undefined), [source]);
  const here = useMemo(() => (fix ? { lat: fix.lat, lng: fix.lng } : undefined), [fix]);

  const gps: Check = source === 'sim' ? { label: 'GPS', status: 'unknown', word: 'Simulated' }
    : fix ? (fix.accuracy === undefined || fix.accuracy <= 30 ? { label: 'GPS', status: 'good', word: fix.accuracy ? `Good, ±${Math.round(fix.accuracy)} m` : 'Good' } : { label: 'GPS', status: 'caution', word: `Weak, ±${Math.round(fix.accuracy)} m` })
    : gpsError ? { label: 'GPS', status: 'stop', word: 'No location' } : { label: 'GPS', status: 'unknown', word: 'Looking…' };
  const checks: Check[] = [
    gps,
    contacts.length ? { label: 'Emergency contact', status: 'good', word: 'Set', go: '/documents/contacts' } : { label: 'Emergency contact', status: 'caution', word: 'Add one', go: '/documents/contacts' },
    overdue ? { label: 'To-dos', status: 'caution', word: `${overdue} overdue`, go: '/todos' } : { label: 'To-dos', status: 'good', word: 'Up to date' },
  ];
  // Papers are a one-time, optional setup. Here they are one row, and only while something needs the rider's attention.
  const papers = papersSummary(paperStatus(licence, vehicle));
  if (papers) checks.push({ label: 'Documents', status: papers.status, word: papers.word, go: '/documents' });
  if (trail) checks.push(offline[trail.slug] ? { label: `Offline pack: ${trail.name}`, status: 'good', word: 'Ready' } : { label: `Offline pack: ${trail.name}`, status: 'caution', word: 'Not downloaded', go: `/trail/${trail.slug}` });

  // The answers to "Where are you going?", closest planned ride first. The first is chosen until the rider picks another.
  type Choice = { key: string; title: string; sub?: string; route?: TripRoute; word: string; chip?: { status: Status; label: string }; onNavigate?: () => void; onStart: () => void };
  const [picked, setPicked] = useState<string>();
  const choices: Choice[] = [
    ...slots.map((s): Choice => {
      const first = s.dayIndex === 0 && !s.trip.startedAt;
      const route = s.trip.days?.[s.dayIndex]?.route;
      return { key: `${s.trip.id}:${s.dayIndex}`, title: s.trip.name, sub: slotTimeText(s.sinceMin, s.trip.startTime ?? 0), route, word: first ? 'Start trip' : `Record day ${s.dayIndex + 1}`, chip: route?.kind === 'trail' ? { status: route.status, label: route.statusLabel } : undefined,
        onNavigate: () => chooseDayRoute(s.trip.id, s.date), onStart: () => (first ? startTrip(s.trip.id, router) : startTodaysRide(s.trip.id, router)) };
    }),
    ...(loneTrail ? [{ key: 'trail', title: loneTrail.name, sub: 'Your next ride', route: { kind: 'trail', slug: loneTrail.slug, name: loneTrail.name, status: loneTrail.status, statusLabel: loneTrail.statusLabel } as TripRoute, word: 'Start ride', chip: { status: loneTrail.status, label: loneTrail.statusLabel }, onStart: () => void start() }] : []),
    ...(myRoute && !slots.length ? [{ key: 'mine', title: myRoute.name, sub: 'A route you made', word: 'Start ride', onStart: () => void start() }] : []),
    { key: 'free', title: 'Just ride', sub: 'No destination. Record wherever you go.', word: 'Start ride', onStart: () => { useMyRoutes.getState().follow(undefined); useTrailStore.getState().cancelPlan(); void start(); } },
  ];
  const chosen = choices.find((c) => c.key === picked) ?? choices[0]!;

  const begin = async () => {
    // false means an unfinished ride is still on disk: go home, where it is offered for saving or discarding.
    const ok = running || (await useRecorder.getState().start(source));
    router.replace(ok ? '/ride/live' : '/');
  };
  // Before the system asks for Always location, say why: without it, recording stops when the phone locks.
  const start = async () => { if (!running && source === 'gps' && (await needsAlwaysExplainer())) setExplain(true); else await begin(); };
  // Always location is asked for; where the system will not ask again the rider goes to Settings, and presses Start when back.
  const allow = async () => { setExplain(false); const before = await rideLocationAccess(); const now = await requestRideLocationAccess(); if (now === 'denied' || (now === 'foreground' && before === 'foreground')) { await Linking.openSettings(); return; } await begin(); };
  // Start trip and Record day open this screen already decided: recording starts at once (the Always-location question still comes first).
  const autostarted = useRef(false);
  useEffect(() => { if (autostart === '1' && !autostarted.current && !running) { autostarted.current = true; void start(); } }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen footer={running ? <Button big variant="accent" label="Back to your ride" onPress={() => void start()} /> : <StartBar route={chosen.route} label={chosen.word} onNavigate={chosen.onNavigate} onStart={chosen.onStart} />} overlay={<>
      <Sheet open={explain} title="Keep recording when your phone is locked" onClose={() => setExplain(false)}>
        <Text variant="label" tone="muted">Choose Always Allow on the next screen. Without it, your ride stops recording whenever the screen locks or another app, like Google Maps, is in front.</Text>
        <Button label="Allow always" onPress={() => void allow()} />
        <Button variant="soft" label="Not now" onPress={() => { setExplain(false); void begin(); }} />
      </Sheet>
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} position={here} />
    </>}>
      <BackHeader />
      {/* With nothing planned there is nothing to choose between: no cards, no extra buttons. The rider tapped Ride on purpose. */}
      {choices.length === 1 ? <PageTitle sub="No planned routes. Record wherever you go.">Ready to ride?</PageTitle> : <PageTitle sub="Pick one, then start.">Where are you going?</PageTitle>}
      {choices.length > 1 ? <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
        {choices.map((c) => (
          <DestinationOption key={c.key} title={c.title} sub={c.sub} selected={c.key === chosen.key} onSelect={() => setPicked(c.key)}>
            {c.chip ? <View style={{ flexDirection: 'row' }}><StatusChip status={c.chip.status} label={c.chip.label} /></View> : null}
            {c.key === chosen.key && c.route?.kind === 'trail' ? <TrailHint slug={c.route.slug} onStart={c.onStart} /> : null}
          </DestinationOption>
        ))}
      </View> : null}
      {source === 'gps' ? <View style={{ marginTop: space[4] }}><OsmMap height={220} radius={24} follow position={here} /></View> : null}
      <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>
        {source === 'sim' ? 'Moves along a test loop so you can try recording on a laptop. Not a real ride.'
          : fix ? 'Your position is shown above. It is only saved once you start.'
          : gpsError ?? 'Finding your location. If asked, allow location access.'}
      </Text>
      <SectionTitle>Before you go</SectionTitle>
      <Columns rightStartsWithSection left={<>
      <ListCard>
        {checks.map((c) => <Row key={c.label} label={c.label} right={<StatusChip status={c.status} label={c.word} />} onPress={c.go ? () => router.push(c.go as never) : undefined} chevron={false} />)}
      </ListCard>
      <SectionTitle>Options</SectionTitle>
      <ListCard>
        <Row icon={RouteIcon} label="Route" value={myRoute?.name ?? trail?.name ?? 'None'} onPress={() => router.push('/plan')} />
        <Row icon={Users} label="Group" value={group ? `Code ${group.code}` : 'Off'} onPress={() => setGroupOpen(true)} />
        <Row icon={Pause} label="Pause when stopped" sub="After 5 minutes still. It carries on when you move." value={autoPause ? 'On' : 'Off'} onPress={() => useCompanion.getState().setAutoPause(!autoPause)} chevron={false} />
        <Row icon={BellRing} label="I haven't arrived" value={checkin ? `Back by ${clockLabel(new Date(checkin.expectedAt).getHours() * 60 + new Date(checkin.expectedAt).getMinutes())}` : 'Off'} onPress={() => setCheckinOpen(true)} />
      </ListCard>
      </>} right={<>
      <SectionTitle>Location</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ChoiceChip label="Phone GPS" selected={source === 'gps'} onPress={() => setSource('gps')} />
        <ChoiceChip label="Simulated (testing)" selected={source === 'sim'} onPress={() => setSource('sim')} />
      </View>
      </>} />
    </Screen>
  );
}
