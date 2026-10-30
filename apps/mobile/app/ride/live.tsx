import { useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { distanceKm, speedKmh } from '@/lib/units';
import { Linking, Platform, Share, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Flag, Megaphone, Mic, Pause, PenLine, Phone, Play, Share2, Square, Siren, Users } from 'lucide-react-native';
import { CheckinSheet } from '@/features/CheckinSheet';
import { useEmergency } from '@/features/emergency/useEmergency';
import { GroupSheet } from '@/features/GroupSheet';
import { NoteSheet } from '@/features/NoteSheet';
import { ReportSheet } from '@/features/ReportSheet';
import { clockLabel } from '@/lib/community';
import { telUrl } from '@/lib/crashAlert';
import { distanceToLine, startFollow, stepFollow } from '@/lib/routeFollow';
import { WAYPOINT_KINDS, WAYPOINT_LABEL } from '@/lib/waypointKinds';
import { RiderTiles } from '@/features/group/RiderTiles';
import { useCanNavigate } from '@/features/group/useCanNavigate';
import { riderTiles } from '@/lib/groupCore';
import { useCompanion } from '@/store/companion';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrips } from '@/store/trips';
import { ChoiceChip } from '@/ui/Chip';
import { useJournalActions } from '@/lib/useJournalActions';
import { Banner } from '@/ui/Banner';
import { clock } from '@/lib/format';
import { finishRide } from '@/lib/finishRide';
import { breaksOf, mergeBreaks, splitSegments } from '@/lib/track';
import { useProfile } from '@/store/profile';
import { useRecorder } from '@/store/recorder';
import { Theme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { buzz } from '@/lib/haptics';
import { EmergencyEditor } from '@/ui/EmergencyEditor';
import { HoldButton } from '@/ui/HoldButton';
import { OsmMap } from '@/ui/map/OsmMap';
import { useRouteLine } from '@/api/useApi';
import { useTrailStore } from '@/store/trails';
import { useLocation } from '@/store/location';
import { Screen } from '@/ui/Screen';
import { useLayout } from '@/ui/useLayout';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Pressable } from 'react-native';
import { Icon } from '@/ui/Icon';
import { fixed, radius, size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** Live riding: dark, no tab bar, big numbers, nothing that needs text input. */
export default function Live() {
  return <Theme mode="dark"><LiveBody /></Theme>;
}

function LiveBody() {
  const router = useRouter();
  const { c } = useTheme();
  const { landscape, height } = useLayout();
  const r = useRecorder();
  const contacts = useProfile((s) => s.contacts);
  const medical = useProfile((s) => s.medical);
  const emergency = useEmergency();
  const planned = useTrailStore((s) => s.nextTrip);
  const trailLine = useRouteLine(planned?.slug);
  // A route the rider built or imported wins over a published trail's line.
  const mine = useMyRoutes((s) => s.routes.find((x) => x.id === s.followId));
  const routeLine = mine?.points ?? trailLine;
  const checkin = useCompanion((s) => s.checkin);
  const group = useCompanion((s) => s.group);
  const live = useCompanion((s) => s.live);
  const canNavigate = useCanNavigate();
  const others = useMemo(() => live.riders.filter((x) => x.id !== live.me && x.lat != null && x.lng != null).map((x) => ({ lat: x.lat!, lng: x.lng! })), [live.riders, live.me]);
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  const lastPoint = r.points[r.points.length - 1];
  const breaks = useMemo(() => mergeBreaks(breaksOf(splitSegments(r.points)), r.pauseBreaks), [r.points.length, r.pauseBreaks]); // eslint-disable-line react-hooks/exhaustive-deps
  // The dot follows the live GPS fix straight away; on a simulated ride it follows the simulated track.
  const last = r.source === 'sim' ? lastPoint : fix ? { lat: fix.lat, lng: fix.lng } : lastPoint;
  const [, tick] = useState(0);
  const [sos, setSos] = useState(false);
  // Help on a solo ride's lock screen card opens this screen with the SOS sheet up.
  const { sos: sosParam } = useLocalSearchParams<{ sos?: string }>();
  useEffect(() => { if (sosParam) setSos(true); }, [sosParam]);
  // The screen stays on while the rider is looking at the ride (a bike mount). Locking the phone still records through the background task.
  useEffect(() => {
    if (r.paused) return;
    void activateKeepAwakeAsync('myto-live-screen').catch(() => undefined);
    return () => { void deactivateKeepAwake('myto-live-screen'); };
  }, [r.paused]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  /** When the rider last dropped a waypoint: for a few seconds the screen asks what it marks. */
  const [dropAt, setDropAt] = useState(0);
  const [off, setOff] = useState(false);
  const follow = useRef(startFollow);
  const j = useJournalActions(r.startedAt);
  const stopping = useRef(false);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (r.status === 'idle' && !stopping.current) router.replace('/'); }, [r.status, router]);
  // Off the route for 20 seconds: buzz and say so. Back within 60 m: clear it.
  useEffect(() => {
    if (!routeLine || !last || r.paused) return;
    const step = stepFollow(follow.current, distanceToLine(routeLine, last), Date.now());
    follow.current = step.state;
    if (step.wentOff) { setOff(true); Vibration.vibrate([0, 400, 200, 400]); }
    if (step.backOn) setOff(false);
  }, [last?.lat, last?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const shareHere = () => last && Share.share({ message: `I need help. My position: https://maps.google.com/?q=${last.lat.toFixed(5)},${last.lng.toFixed(5)}` });

  const stop = async () => {
    buzz.stop();
    stopping.current = true;
    // If the ride could not be written, it stays on the phone and Home offers it back for saving.
    const id = await finishRide().catch(() => undefined);
    // A ride recorded while a trip is under way belongs to it.
    if (id) useTrips.getState().attachToActive(id);
    router.replace(id ? `/story/${id}` : '/');
  };

  const distance = distanceKm(r.meters / 1000);
  const speed = speedKmh(r.paused ? 0 : r.speedKmh);
  const stats = (
    <Card style={{ gap: landscape ? space[3] : space[5], paddingVertical: landscape ? space[4] : space[5] }}>
      <View style={{ gap: space[1] }}>
        <Text variant="label" tone="muted">Distance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
          <Text variant={landscape ? 'liveCompact' : 'live'}>{distance.value}</Text><Text variant="bodyMedium" tone="muted">{distance.unit}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}><Text variant="label" tone="muted">{r.paused ? 'Paused' : 'Time'}</Text><Text variant={landscape ? 'liveSecondaryCompact' : 'liveSecondary'}>{clock(r.elapsedMs(Date.now()))}</Text></View>
        <View style={{ flex: 1 }}><Text variant="label" tone="muted">{`Speed (${speed.unit})`}</Text><Text variant={landscape ? 'liveSecondaryCompact' : 'liveSecondary'}>{speed.value}</Text></View>
      </View>
    </Card>
  );
  const ageSec = r.lastFixAt ? Math.max(0, Math.round((Date.now() - r.lastFixAt) / 1000)) : 0;
  // The background recorder sends no fixes while the phone is still (5 m distance filter), so only a rider who was moving can have lost the signal.
  const lostSignal = r.source === 'gps' && !r.paused && r.moving && r.lastFixAt > 0 && ageSec >= 15;
  // The background task is what keeps recording with the screen locked; tell the rider when it is not running.
  const foregroundOnly = r.source === 'gps' && !r.paused && Platform.OS !== 'web' && !r.backgrounded && Date.now() - r.startedAt > 3000;
  const status = (
    <View style={{ gap: space[2] }}>
      {r.error ? <Banner eyebrow="Storage" title={r.error} /> : null}
      {lostSignal ? <Banner eyebrow="GPS" title="Lost GPS signal, still recording" /> : null}
      {off ? <Banner eyebrow="Route" title="You are off the route" /> : null}
      {dropAt && Date.now() - dropAt < 6000 && r.waypoints.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {WAYPOINT_KINDS.map((k) => <ChoiceChip key={k} label={WAYPOINT_LABEL[k]} onPress={() => { void r.retypeLastWaypoint(k); setDropAt(0); }} />)}
        </View>
      ) : null}
      {checkin ? <Pressable accessibilityRole="button" onPress={() => setCheckinOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="label" tone="muted">Check-in on · back by {clockLabel(new Date(checkin.expectedAt).getHours() * 60 + new Date(checkin.expectedAt).getMinutes())}</Text></Pressable> : null}
      {live.regroup ? <Banner eyebrow="Group" title="The leader dropped a regroup pin" onPress={() => setGroupOpen(true)} /> : null}
      {foregroundOnly ? <Banner eyebrow="Heads up" title="Recording stops if you lock the phone. Tap to allow Always in Settings." onPress={() => void Linking.openSettings()} /> : null}
      {r.source === 'gps' && !fix && gpsError ? <Text variant="label" tone="caution">{gpsError}</Text>
        : <Text variant="label" tone="muted" style={{ textAlign: landscape ? 'left' : 'center' }}>{r.paused ? 'Paused. Nothing is recorded until you resume.' : r.lastFixAt ? `Last fix ${ageSec} s ago${fix?.accuracy ? ` · GPS ±${Math.round(fix.accuracy)} m` : ''}` : 'Waiting for a GPS fix…'}</Text>}
    </View>
  );
  // The other riders of the group ride, with how far they are and a way to navigate to them (once stopped).
  const groupTiles = group && live.riders.length > 1 ? <RiderTiles tiles={riderTiles(live.riders, live.me, last, Date.now())} canNavigate={canNavigate} /> : null;
  const pauseBtn = (h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={r.paused ? 'Resume ride' : 'Pause ride'} onPress={() => { (r.paused ? buzz.resume : buzz.pause)(); void (r.paused ? r.resume() : r.pause()); }} style={({ pressed }) => ({ flex: 1, minHeight: h, borderRadius: radius.control, backgroundColor: r.paused ? c.accent : pressed ? fixed.darkPressed : c.raised, alignItems: 'center', justifyContent: 'center', gap: space[2] })}>
      <Icon icon={r.paused ? Play : Pause} size={h > 70 ? 26 : 22} />
      <Text variant="labelMedium" style={r.paused ? { color: c.accentInk } : undefined}>{r.paused ? 'Resume' : 'Pause'}</Text>
    </Pressable>
  );
  const waypointBtn = (h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Drop a waypoint" onPress={() => { buzz.waypoint(); void useRecorder.getState().addWaypoint().then(() => setDropAt(Date.now())); }} style={({ pressed }) => ({ flex: 1, minHeight: h, borderRadius: radius.control, backgroundColor: pressed ? fixed.darkPressed : c.raised, alignItems: 'center', justifyContent: 'center', gap: space[2] })}>
      <Icon icon={Flag} size={h > 70 ? 26 : 22} /><Text variant="labelMedium">Waypoint{r.waypoints.length ? ` · ${r.waypoints.length}` : ''}</Text>
    </Pressable>
  );
  // SOS is held, like Stop, so a glove or a bump cannot open it. A shorter hold than Stop, because it is the one a hurt rider reaches for.
  const sosBtn = (h: number) => (
    <HoldButton label="SOS" icon={Siren} color={c.stop} tone="stop" row borderOnly ms={700} minHeight={h} onComplete={() => { buzz.help(); setSos(true); }} />
  );

  const smallBtn = (label: string, icon: typeof Users, onPress: () => void, h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: h, borderRadius: radius.control, backgroundColor: pressed ? fixed.darkPressed : c.raised, flexDirection: 'row', gap: space[3], alignItems: 'center', justifyContent: 'center' })}>
      <Icon icon={icon} size={22} /><Text variant="bodyMedium">{label}</Text>
    </Pressable>
  );

  return (
    <Screen scroll={false} overlay={<>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} at={last} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} position={last} />
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <NoteSheet open={noteOpen} canType={j.canType} onSave={j.addNote} onClose={() => setNoteOpen(false)} />
      <Sheet open={journalOpen} title="Ride journal" onClose={() => setJournalOpen(false)}>
        <Button icon={j.recording ? Square : Mic} label={j.recording ? `Stop recording ${Math.floor(j.seconds / 60)}:${String(j.seconds % 60).padStart(2, '0')}` : 'Record a voice note'} onPress={() => void j.toggleVoice()} />
        <Button variant="soft" icon={Camera} label="Take photo" onPress={() => void j.addPhoto('camera')} />
        <Button variant="soft" icon={PenLine} label={j.canType ? 'Write a note' : 'Write a note (when stopped)'} onPress={() => { setJournalOpen(false); setNoteOpen(true); }} />
        {j.problem ? <Text variant="label" tone="stop">{j.problem}</Text> : null}
      </Sheet>
      <Sheet open={sos} title="SOS" onClose={() => setSos(false)}>
        <Text variant="label" tone="muted">Call for help. This does not replace emergency services.</Text>
        <Button label={`Call ${emergency.number} (emergency)`} variant="danger" icon={Phone} onPress={() => Linking.openURL(telUrl(emergency.number))} />
        <EmergencyEditor choice={emergency} />
        <Button variant="soft" icon={Share2} label="Share my position" onPress={() => void shareHere()} />
        {medical.bloodGroup || medical.notes ? <Text variant="label" tone="muted">Emergency card: {[medical.bloodGroup && `blood group ${medical.bloodGroup}`, medical.notes].filter(Boolean).join(' · ')}</Text> : null}
        {contacts.map((c) => <Button key={c.id} variant="soft" icon={Phone} label={`${c.name}${c.primary ? ' (main)' : ''}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} />)}
        {contacts.length === 0 ? <Text variant="label" tone="muted">No emergency contacts yet. Add them under You, Documents and emergency.</Text> : null}
      </Sheet>
    </>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: size.target }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <View style={{ width: size.dot, height: size.dot, borderRadius: radius.chip, backgroundColor: r.paused ? c.muted : c.stop }} />
          <Text variant="labelMedium" tone="muted">{r.paused ? 'Paused' : r.source === 'sim' ? 'Recording (simulated)' : 'Recording'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[5] }}>
          {landscape ? <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Report</Text></Pressable> : null}
          {landscape ? <Pressable accessibilityRole="button" onPress={() => setGroupOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Group</Text></Pressable> : null}
          <Pressable accessibilityRole="button" onPress={() => setJournalOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Journal</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Minimise</Text></Pressable>
        </View>
      </View>
      {landscape ? (
        // Turned on its side (a handlebar mount): numbers on the left, map and big buttons on the right, no scrolling.
        <View style={{ flex: 1, flexDirection: 'row', gap: space[4] }}>
          <View style={{ flex: 1, gap: space[3] }}>{stats}{status}{groupTiles}</View>
          <View style={{ flex: 1.25, gap: space[3] }}>
            <OsmMap height={Math.max(110, height - 48 - 16 - 76 - 12 - 12 - 16)} radius={radius.card} follow line={routeLine} track={r.points} trackBreaks={breaks} position={last} waypoints={r.waypoints} riders={others} regroup={live.regroup ?? undefined} />
            <View style={{ flexDirection: 'row', gap: space[3] }}>{pauseBtn(64)}{waypointBtn(64)}<HoldButton label="Hold to stop" icon={Square} color={fixed.stopFill} minHeight={64} onComplete={stop} />{sosBtn(64)}</View>
          </View>
        </View>
      ) : (
        <>
          <View style={{ marginTop: space[2] }}>{stats}</View>
          <View style={{ marginTop: space[3] }}>
            <OsmMap height={200} radius={radius.card} follow line={routeLine} track={r.points} trackBreaks={breaks} position={last} waypoints={r.waypoints} riders={others} regroup={live.regroup ?? undefined} />
          </View>
          <View style={{ marginTop: space[3], gap: space[3] }}>{status}{groupTiles}</View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: space[3] }}>{pauseBtn(88)}{waypointBtn(88)}<HoldButton label="Hold to stop" icon={Square} color={fixed.stopFill} onComplete={stop} /></View>
          <View style={{ marginTop: space[3], flexDirection: 'row', gap: space[3] }}>{sosBtn(56)}{smallBtn('Report', Megaphone, () => setReportOpen(true), 56)}{smallBtn('Group', Users, () => setGroupOpen(true), 56)}</View>
        </>
      )}
    </Screen>
  );
}
