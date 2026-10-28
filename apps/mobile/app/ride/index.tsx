import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellRing, Pause, Route as RouteIcon, Users } from 'lucide-react-native';
import { CheckinSheet } from '@/features/CheckinSheet';
import { GroupSheet } from '@/features/GroupSheet';
import { clockLabel } from '@/lib/community';
import { useCompanion } from '@/store/companion';
import { useMyRoutes } from '@/store/myRoutes';
import { needsAlwaysExplainer, requestRideLocationAccess } from '@/lib/backgroundLocation';
import { useLocation } from '@/store/location';
import { useRecorder } from '@/store/recorder';
import { OsmMap } from '@/ui/map/OsmMap';
import { dueInfo } from '@/lib/todos';
import { daysUntil } from '@/lib/dates';
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

function validity(label: string, iso: string | undefined, go: string): Check {
  if (!iso) return { label, status: 'unknown', word: 'Not added', go };
  const d = daysUntil(iso);
  return d < 0 ? { label, status: 'stop', word: 'Expired', go } : d <= 30 ? { label, status: 'caution', word: `Expires in ${d} days`, go } : { label, status: 'good', word: 'Valid', go };
}

/** Record, ready: what we can truly check before a ride, then one big Start. */
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
    validity('Driving licence', licence?.validTill, '/documents/licence'),
    validity('Insurance', vehicle?.insuranceValidTill, '/documents/vehicle'),
    validity('PUC', vehicle?.pucValidTill, '/documents/vehicle'),
    contacts.length ? { label: 'Emergency contact', status: 'good', word: 'Set', go: '/documents/contacts' } : { label: 'Emergency contact', status: 'caution', word: 'Add one', go: '/documents/contacts' },
    overdue ? { label: 'To-dos', status: 'caution', word: `${overdue} overdue`, go: '/todos' } : { label: 'To-dos', status: 'good', word: 'Up to date' },
  ];
  if (trail) checks.push(offline[trail.slug] ? { label: `Offline pack: ${trail.name}`, status: 'good', word: 'Ready' } : { label: `Offline pack: ${trail.name}`, status: 'caution', word: 'Not downloaded', go: `/trail/${trail.slug}` });

  const begin = async () => {
    // false means an unfinished ride is still on disk: go home, where it is offered for saving or discarding.
    const ok = running || (await useRecorder.getState().start(source));
    router.replace(ok ? '/ride/live' : '/');
  };
  // Before the system asks for Always location, say why: without it, recording stops when the phone locks.
  const start = async () => { if (!running && source === 'gps' && (await needsAlwaysExplainer())) setExplain(true); else await begin(); };
  const allow = async () => { setExplain(false); await requestRideLocationAccess(); await begin(); };
  // Start trip and Record day open this screen already decided: recording starts at once (the Always-location question still comes first).
  const autostarted = useRef(false);
  useEffect(() => { if (autostart === '1' && !autostarted.current && !running) { autostarted.current = true; void start(); } }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen footer={<Button big variant="accent" label={running ? 'Back to your ride' : 'Start ride'} onPress={() => void start()} />} overlay={<>
      <Sheet open={explain} title="Keep recording when your phone is locked" onClose={() => setExplain(false)}>
        <Text variant="label" tone="muted">Choose Always Allow on the next screen. Without it, your ride stops recording whenever the screen locks or another app, like Google Maps, is in front.</Text>
        <Button label="Allow always" onPress={() => void allow()} />
        <Button variant="soft" label="Not now" onPress={() => { setExplain(false); void begin(); }} />
      </Sheet>
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} position={here} />
    </>}>
      <BackHeader />
      <PageTitle sub="These checks never stop you from starting.">Ready to ride?</PageTitle>
      <Columns rightStartsWithSection left={<>
      <ListCard>
        {checks.map((c) => <Row key={c.label} label={c.label} right={<StatusChip status={c.status} label={c.word} />} onPress={c.go ? () => router.push(c.go as never) : undefined} chevron={false} />)}
      </ListCard>
      <SectionTitle>Options</SectionTitle>
      <ListCard>
        <Row icon={RouteIcon} label="Route" value={myRoute?.name ?? trail?.name ?? 'None'} onPress={() => router.push('/plan')} />
        <Row icon={Users} label="Group ride" value={group ? `Code ${group.code}` : 'Off'} onPress={() => setGroupOpen(true)} />
        <Row icon={Pause} label="Pause when stopped" sub="After 5 minutes still. It carries on when you move." value={autoPause ? 'On' : 'Off'} onPress={() => useCompanion.getState().setAutoPause(!autoPause)} chevron={false} />
        <Row icon={BellRing} label="I haven't arrived" value={checkin ? `Back by ${clockLabel(new Date(checkin.expectedAt).getHours() * 60 + new Date(checkin.expectedAt).getMinutes())}` : 'Off'} onPress={() => setCheckinOpen(true)} />
      </ListCard>
      </>} right={<>
      <SectionTitle>Location</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ChoiceChip label="Phone GPS" selected={source === 'gps'} onPress={() => setSource('gps')} />
        <ChoiceChip label="Simulated (testing)" selected={source === 'sim'} onPress={() => setSource('sim')} />
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
        {source === 'sim' ? 'Moves along a test loop so you can try recording on a laptop. Not a real ride.'
          : fix ? 'Your position is shown below. It is only saved once you start.'
          : gpsError ?? 'Finding your location. If asked, allow location access.'}
      </Text>
      {source === 'gps' ? <View style={{ marginTop: 16 }}><OsmMap height={220} radius={24} follow position={here} /></View> : null}
      </>} />
    </Screen>
  );
}
