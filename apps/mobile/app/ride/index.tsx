import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellRing, MapPin, Pause, Route as RouteIcon, Users } from 'lucide-react-native';
import { CheckinSheet } from '@/features/CheckinSheet';
import { DestinationOption } from '@/features/trip/DestinationOption';
import { DestinationSheet } from '@/features/group/DestinationSheet';
import { useDirections } from '@/features/ride/useDirections';
import { StartBar, TrailHint } from '@/features/trip/RideStartActions';
import { useGuideTarget } from '@/store/guideTarget';
import { useRideDraft } from '@/store/rideDraft';
import { findHabits } from '@/lib/habit';
import { rideTitle } from '@/lib/rideTitle';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { chooseDayRoute, startTodaysRide, startTrip } from '@/features/trip/startTrip';
import { plannedSlots, slotTimeText } from '@/lib/plannedRides';
import { useTrips } from '@/store/trips';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { GroupSheet } from '@/features/GroupSheet';
import { clockLabel } from '@/lib/community';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { prepareSimRide, SIM_TRAIL_SLUG } from '@/lib/simRide';
import { useSimRide } from '@/store/simRide';
import { useCompanion } from '@/store/companion';
import { useMyRoutes } from '@/store/myRoutes';
import { needsSettings } from '@/lib/rideAccess';
import { needsAlwaysExplainer, requestRideLocationAccess, rideLocationAccess } from '@/lib/backgroundLocation';
import { useLocation } from '@/store/location';
import { useRecorder } from '@/store/recorder';
import { OsmMap } from '@/ui/map/OsmMap';
import { dueInfo } from '@/lib/todos';
import { papersSummary, paperStatus } from '@/lib/documentEntries';
import { todayISO } from '@/lib/dates';
import { dayIndexOn, tripStatus, type TripRoute } from '@/lib/tripPlan';
import { tripChecks } from '@/lib/tripReadiness';
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

/** The phone's position as soon as there is one, or nothing after `ms`. */
async function fixWithin(ms: number): Promise<{ lat: number; lng: number } | undefined> {
  const end = Date.now() + ms;
  for (;;) {
    const f = useLocation.getState().fix;
    if (f) return { lat: f.lat, lng: f.lng };
    if (Date.now() >= end) return undefined;
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Record, ready: where are you going, the map, what we can truly check before a ride, then one big Start. */
export default function RideReady() {
  const router = useRouter();
  const { c: colors } = useTheme();
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();
  const running = useRecorder((s) => s.status === 'running');
  const [source, setSource] = useState<'gps' | 'sim'>('gps');
  /** A simulated ride with a made-up group riding the test route, for trying the live map, the turns and the group on one phone. */
  const [simGroup, setSimGroup] = useState(false);
  /** What the simulated ride is doing before it starts: finding the phone's position, then the road to the trail. */
  const [simNote, setSimNote] = useState<string>();
  const noisy = useSimRide((s) => s.noisy);
  const lowBattery = useSimRide((s) => s.lowBattery);
  const mapDebug = useSimRide((s) => s.mapDebug);
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
  // The trip under way (or ready to start) adds its own rows: today's route and how much of the pack list is done.
  const trip = useTrips((s) => s.trips.find((t) => { const st = tripStatus(t, todayISO()); return st === 'active' || st === 'ready'; }));
  const pack = todos.filter((t) => !!trip && t.tripId === trip.id);
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  // Start looking for the rider as soon as this screen opens, so a fix is ready by the time the ride starts.
  useEffect(() => (source === 'gps' || simGroup ? useLocation.getState().acquire() : undefined), [source, simGroup]);
  const here = useMemo(() => (fix ? { lat: fix.lat, lng: fix.lng } : undefined), [fix]);
  /** The place the rider chose to ride to, and the road to it from where they are: shown on the map with the time it takes. */
  // Kept for this session so leaving this page and coming back finds the place still chosen (see store/rideDraft).
  const dest = useRideDraft((s) => s.dest);
  const setDest = useRideDraft((s) => s.setDest);
  const [destOpen, setDestOpen] = useState(false);
  const { directions: toDest, failed: toDestFailed } = useDirections(here, dest, { reroute: false });

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
  if (trip) {
    const day = trip.days?.[dayIndexOn(trip, todayISO()) ?? 0];
    for (const c of tripChecks({ route: day?.route, pack: { total: pack.length, done: pack.filter((t) => t.done).length } })) checks.push({ ...c, go: `/trips/${trip.id}` });
  }
  if (trail) checks.push(offline[trail.slug] ? { label: `Offline pack: ${trail.name}`, status: 'good', word: 'Ready' } : { label: `Offline pack: ${trail.name}`, status: 'caution', word: 'Not downloaded', go: `/trail/${trail.slug}` });

  // The answers to "Where are you going?", closest planned ride first. The first is chosen until the rider picks another.
  type Choice = { key: string; title: string; sub?: string; route?: TripRoute; word: string; chip?: { status: Status; label: string }; onNavigate?: () => void; onStart: () => void };
  const picked = useRideDraft((s) => s.picked);
  const setPicked = useRideDraft((s) => s.setPicked);
  const choices: Choice[] = [
    ...slots.map((s): Choice => {
      const first = s.dayIndex === 0 && !s.trip.startedAt;
      const route = s.trip.days?.[s.dayIndex]?.route;
      return { key: `${s.trip.id}:${s.dayIndex}`, title: s.trip.name, sub: slotTimeText(s.sinceMin, s.trip.startTime ?? 0), route, word: first ? 'Start trip' : `Record day ${s.dayIndex + 1}`, chip: route?.kind === 'trail' ? { status: route.status, label: route.statusLabel } : undefined,
        onNavigate: () => chooseDayRoute(s.trip.id, s.date), onStart: () => (first ? startTrip(s.trip.id, router) : startTodaysRide(s.trip.id, router)) };
    }),
    ...(loneTrail ? [{ key: 'trail', title: loneTrail.name, sub: 'Your next ride', route: { kind: 'trail', slug: loneTrail.slug, name: loneTrail.name, status: loneTrail.status, statusLabel: loneTrail.statusLabel } as TripRoute, word: 'Start ride', chip: { status: loneTrail.status, label: loneTrail.statusLabel }, onStart: () => void start() }] : []),
    ...(myRoute && !slots.length ? [{ key: 'mine', title: myRoute.name, sub: 'A route you made', word: 'Start ride', onStart: () => void start() }] : []),
    // A place of their own: the road to it, and how long it takes, show on the map before the ride starts.
    ...(source === 'gps' ? [{ key: 'place', title: 'Set a destination', sub: dest ? dest.name : 'Pick a place and see the road, and how long it takes.', word: dest ? 'Start ride' : 'Choose a place first', onStart: () => { if (dest) void start(); } }] : []),
    { key: 'free', title: 'Roam free', sub: 'Nowhere to be. Ride wherever the road pulls you.', word: 'Start ride', onStart: () => { useMyRoutes.getState().follow(undefined); useTrailStore.getState().cancelPlan(); useGuideTarget.getState().clear(); void start(); } },
  ];
  // Planned rides first; with none, roaming is the quick answer and the rider opens "Set a destination" when they want one.
  // One greeting for the moment, from the day, the hour and the rider's usual times. It always fits on two lines.
  const [clockNow] = useState(Date.now);
  const title = rideTitle({ now: new Date(clockNow), habits: useMemo(() => findHabits(rides, clockNow), [rides, clockNow]), rides: rides.length, planned: slots.length > 0 || !!loneTrail || !!myRoute });
  const chosen = choices.find((c) => c.key === picked) ?? choices.find((c) => c.key !== 'place')!;

  /** The simulated group rides the real road from where this phone is to the trail's start. Without a position or a connection it rides the built-in test loop instead, and says so. */
  const prepareSim = async () => {
    useSimRide.getState().clear();
    setSimNote('Finding your location…');
    const here = await fixWithin(10_000);
    if (!here) { setSimNote('No location yet, so the built-in test loop is used.'); return; }
    setSimNote('Finding the road to the trail…');
    try { useSimRide.getState().set(await prepareSimRide(here, SIM_TRAIL_SLUG)); setSimNote(undefined); }
    catch { setSimNote('The road could not be found, so the built-in test loop is used.'); }
  };
  const begin = async () => {
    // false means an unfinished ride is still on disk: go home, where it is offered for saving or discarding.
    if (!running && source === 'sim' && simGroup) await prepareSim();
    if (!running && source === 'sim' && simGroup) useCompanion.getState().setGroup({ id: SIM_GROUP_ID, code: 'SIMGRP', name: 'Simulated group ride', role: 'leader' });
    if (!running && chosen.key === 'place' && dest) useGuideTarget.getState().set(dest);
    const ok = running || (await useRecorder.getState().start(source));
    // The place chosen here is the ride's own now; the next visit to this page starts clean.
    if (ok && !running) useRideDraft.getState().clear();
    router.replace(ok ? '/ride/live' : '/');
  };
  // Before the system asks for Always location, say why: without it, recording stops when the phone locks.
  const start = async () => { if (!running && source === 'gps' && (await needsAlwaysExplainer())) setExplain(true); else await begin(); };
  // Always location is asked for; where the system will not ask again the rider goes to Settings, and presses Start when back.
  const allow = async () => { setExplain(false); const before = await rideLocationAccess(); const now = await requestRideLocationAccess(); if (needsSettings(before, now, Platform.OS)) { await Linking.openSettings(); return; } await begin(); };
  // Start trip and Record day open this screen already decided: recording starts at once (the Always-location question still comes first).
  const autostarted = useRef(false);
  useEffect(() => { if (autostart === '1' && !autostarted.current && !running) { autostarted.current = true; void start(); } });

  return (
    <Screen footer={running ? <Button big variant="accent" label="Back to your ride" onPress={() => void start()} /> : <StartBar route={chosen.route} label={chosen.word} onNavigate={chosen.onNavigate} onStart={chosen.onStart} />} overlay={<>
      <Sheet open={explain} title="Keep recording when your phone is locked" onClose={() => setExplain(false)}>
        <Text variant="label" tone="muted">{Platform.OS === 'android' ? 'Settings opens next. Tap Permissions, then Location, then choose Allow all the time, and come back to press Start.' : 'Choose Always Allow on the next screen.'} Without it, your ride stops recording whenever the screen locks or another app, like Google Maps, is in front.</Text>
        <Button label="Allow always" onPress={() => void allow()} />
        <Button variant="soft" label="Not now" onPress={() => { setExplain(false); void begin(); }} />
      </Sheet>
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} position={here} />
      <DestinationSheet open={destOpen} onClose={() => setDestOpen(false)} near={here} current={dest} onSet={(p, name) => setDest({ lat: p.lat, lng: p.lng, name: name ?? 'A spot on the map' })} />
    </>}>
      <BackHeader />
      <PageTitle fit sub={choices.length === 1 ? 'No plans. Record wherever you go.' : 'Pick a place to ride to, or roam free.'}>{title}</PageTitle>
      {choices.length > 1 ? <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
        {choices.map((c) => (
          <DestinationOption key={c.key} title={c.title} sub={c.sub} selected={c.key === chosen.key} onSelect={() => setPicked(c.key)}>
            {c.chip ? <View style={{ flexDirection: 'row' }}><StatusChip status={c.chip.status} label={c.chip.label} /></View> : null}
            {c.key === 'place' && c.key === chosen.key ? <Button variant="soft" onCard icon={MapPin} arrow label={dest ? 'Somewhere else?' : 'Where to?'} onPress={() => setDestOpen(true)} /> : null}
            {c.key === chosen.key && c.route?.kind === 'trail' ? <TrailHint slug={c.route.slug} onNavigate={() => { c.onNavigate?.(); }} /> : null}
          </DestinationOption>
        ))}
      </View> : null}
      {source === 'gps' ? (
        <View style={{ marginTop: space[4] }}>
          {dest && chosen.key === 'place'
            ? <OsmMap height={260} radius={24} interactive={false} position={here} line={toDest?.line} destination={dest} />
            : <OsmMap height={220} radius={24} follow interactive={false} position={here} />}
          {dest && chosen.key === 'place' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: space[3], bottom: space[3], right: space[3], borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: space[4], paddingVertical: space[3], gap: space.half }}>
              <Text variant="bodyMedium" numberOfLines={1}>{dest.name}</Text>
              <Text variant="label" tone="muted">{toDest ? `${asText(distanceKm(toDest.totalM / 1000))} · about ${asText(durationParts(Math.max(1, toDest.etaMin) * 60))}` : toDestFailed ? 'The road service could not be reached. You will still be guided once you are riding.' : here ? 'Finding the road…' : 'Finding your location…'}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <ChoiceChip label="Phone GPS" selected={source === 'gps'} onPress={() => { setSource('gps'); setSimGroup(false); }} />
        <ChoiceChip label="Simulated (testing)" selected={source === 'sim' && !simGroup} onPress={() => { setSource('sim'); setSimGroup(false); }} />
      </View>
      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2], flexWrap: 'wrap' }}>
        <ChoiceChip icon={Users} label="Simulated group ride (testing)" selected={source === 'sim' && simGroup} onPress={() => { setSource('sim'); setSimGroup(true); }} />
        {source === 'sim' ? <ChoiceChip label="Noisy GPS" selected={noisy} onPress={() => useSimRide.getState().setNoisy(!noisy)} /> : null}
        {source === 'sim' ? <ChoiceChip label="Map numbers" selected={mapDebug} onPress={() => useSimRide.getState().setMapDebug(!mapDebug)} /> : null}
        {source === 'sim' && simGroup ? <ChoiceChip label="Low battery" selected={lowBattery} onPress={() => useSimRide.getState().setLowBattery(!lowBattery)} /> : null}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {source === 'sim' && simGroup ? (simNote ?? 'Rides the real road from where you are to the Manchanabele Dam trail with Annuai, Pranab, Jithin and Abha: Pranab leads, Jithin asks to wait and later for help, Abha stops for fuel. Not a real ride.')
          : source === 'sim' ? 'Moves along a test loop so you can try recording on a laptop. Not a real ride.'
          : fix ? 'Your position is shown above. It is only saved once you start.'
          : gpsError ?? 'Finding your location. If asked, allow location access.'}
      </Text>
      </>} />
    </Screen>
  );
}
