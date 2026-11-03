import { useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { asText, distanceKm, speedKmh } from '@/lib/units';
import { isWeak, startGpsHealth, stepGpsHealth } from '@/lib/gpsHealth';
import { shownSpeedKmh } from '@/lib/liveSpeed';
import { AppState, Linking, Platform, Pressable, Share, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Eye, EyeOff, Flag, Megaphone, Mic, Minus, Pause, PenLine, Phone, Play, Share2, Square, Siren, Users } from 'lucide-react-native';
import { CheckinSheet } from '@/features/CheckinSheet';
import { DocumentsSheet } from '@/features/DocumentsSheet';
import { useEmergency } from '@/features/emergency/useEmergency';
import { GroupSheet } from '@/features/GroupSheet';
import { NoteSheet } from '@/features/NoteSheet';
import { ReportSheet } from '@/features/ReportSheet';
import { clockLabel } from '@/lib/community';
import { telUrl } from '@/lib/crashAlert';
import { startFollow, stepFollow } from '@/lib/routeFollow';
import { compassWord, prepareTrail, startGuide, stepGuide, type Guide } from '@/lib/trailGuide';
import { WAYPOINT_KINDS, WAYPOINT_LABEL } from '@/lib/waypointKinds';
import { RiderSheet } from '@/features/group/RiderSheet';
import { GroupRail, StatsStrip, TurnCard } from '@/features/ride/LiveHud';
import { useDirections } from '@/features/ride/useDirections';
import { useSmoothedRide } from '@/features/ride/useSmoothedRide';
import { fromDirections, fromTrail, type Instruction } from '@/lib/guidance';
import { SIM_GROUP_ID, SIM_ROUTE } from '@/lib/groupSim';
import { useSimRide } from '@/store/simRide';
import { queueRideForOsm } from '@/lib/osmShare';
import { useGuideTarget } from '@/store/guideTarget';
import { useCanNavigate } from '@/features/group/useCanNavigate';
import { riderSlots, riderTiles, sortRiders } from '@/lib/groupCore';
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
import { Button } from '@/ui/Button';
import { buzz } from '@/lib/haptics';
import { EmergencyEditor } from '@/ui/EmergencyEditor';
import { HoldButton } from '@/ui/HoldButton';
import { haversine, travelHeading } from '@/lib/geo';
import type { RiderMark } from '@/lib/riderClusters';
import { OsmMap } from '@/ui/map/OsmMap';
import { useRouteLine } from '@/api/useApi';
import { useTrailStore } from '@/store/trails';
import { useLocation } from '@/store/location';
import { Screen } from '@/ui/Screen';
import { useLayout } from '@/ui/useLayout';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';
import { fixed, layout, radius, size, space } from '@/theme/tokens';
import { Theme, useTheme } from '@/theme/ThemeProvider';
import { nowMs } from '@/lib/clock';

/** Live riding: dark, no tab bar, big numbers, nothing that needs text input. */
export default function Live() {
  return <Theme mode="dark"><LiveBody /></Theme>;
}

function LiveBody() {
  const router = useRouter();
  const { c } = useTheme();
  const { landscape } = useLayout();
  const r = useRecorder();
  const contacts = useProfile((s) => s.contacts);
  const medical = useProfile((s) => s.medical);
  const emergency = useEmergency();
  const planned = useTrailStore((s) => s.nextTrip);
  const trailLine = useRouteLine(planned?.slug);
  // A route the rider built or imported wins over a published trail's line.
  const mine = useMyRoutes((s) => s.routes.find((x) => x.id === s.followId));
  const group = useCompanion((s) => s.group);
  const simGroup = group?.id === SIM_GROUP_ID;
  // A simulated group rides the real road to a trail when one was found (guided by its own turns), else the built-in test loop.
  const simRoad = useSimRide((s) => (simGroup ? s.ride : undefined));
  const routeLine = simGroup ? (simRoad ? undefined : SIM_ROUTE) : mine?.points ?? trailLine;
  const checkin = useCompanion((s) => s.checkin);
  const live = useCompanion((s) => s.live);
  const canNavigate = useCanNavigate();
  /** The rider whose tile was tapped: the sheet shows where they are and how far they have to go. */
  const [riderId, setRiderId] = useState<string>();
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  const lastPoint = r.points[r.points.length - 1];
  const breaks = useMemo(() => mergeBreaks(breaksOf(splitSegments(r.points)), r.pauseBreaks), [r.points.length, r.pauseBreaks]); // eslint-disable-line react-hooks/exhaustive-deps
  // The dot follows the live GPS fix straight away; on a simulated ride it follows the simulated track.
  const last = r.source === 'sim' ? lastPoint : fix ? { lat: fix.lat, lng: fix.lng } : lastPoint;
  // The same spot as an object that only changes when the position does, so the map is not redrawn every second.
  const lastSpot = useMemo(() => last, [last?.lat, last?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  // The riders of the group on the map: a colour each, the leader and anyone who needs help first. This phone is drawn at its own live position.
  const riderMarks = useMemo<RiderMark[]>(() => {
    if (!group || live.riders.length < 2) return [];
    const slots = riderSlots(live.riders);
    // This phone is the arrow on the map, so it is not one of the pins.
    return sortRiders(live.riders, live.me ?? '').flatMap((x) => (x.id !== live.me && x.lat != null && x.lng != null ? [{ id: x.id, name: x.name, slot: slots.get(x.id) ?? 0, lat: x.lat, lng: x.lng, status: x.status }] : []));
  }, [group, live.riders, live.me]);
  // Where the rider is being guided: a place they asked to be taken to, else the group's destination.
  const baseTarget = useGuideTarget((s) => s.to);
  // A rider the rider has set off to help comes first; ending it ("Continue the ride") goes back to the place, route or destination underneath.
  const rescue = useGuideTarget((s) => s.rescue);
  const rescueRider = rescue ? live.riders.find((x) => x.id === rescue.riderId) : undefined;
  const rescueLat = rescueRider?.lat, rescueLng = rescueRider?.lng;
  const rescueSpot = useMemo(() => (rescue && rescueLat != null && rescueLng != null ? { lat: rescueLat, lng: rescueLng, name: rescue.name } : undefined), [rescue?.name, rescueLat, rescueLng]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = rescueSpot ?? baseTarget;
  const regroup = useMemo(() => (live.regroup ? { lat: live.regroup.lat, lng: live.regroup.lng, name: live.regroup.note ?? undefined } : undefined), [live.regroup]);
  const destination = target ?? regroup;
  const clearTarget = useGuideTarget.getState().clear;
  const endRescue = useGuideTarget.getState().endRescue;
  // The direction of travel from the track: the raw material for the heading, which is steadied below.
  const course = useMemo(() => travelHeading(r.points), [r.points]);
  const [, tick] = useState(0);
  // Help on a solo ride's lock screen card opens this screen with the SOS sheet up.
  const { sos: sosParam } = useLocalSearchParams<{ sos?: string }>();
  const [sos, setSos] = useState(!!sosParam);
  const [seenSosParam, setSeenSosParam] = useState(sosParam);
  if (sosParam !== seenSosParam) { setSeenSosParam(sosParam); if (sosParam) setSos(true); }
  // The screen stays on while the rider is looking at the ride (a bike mount). Locking the phone still records through the background task.
  useEffect(() => {
    if (r.paused) return;
    void activateKeepAwakeAsync('myto-live-screen').catch(() => undefined);
    return () => { void Promise.resolve(deactivateKeepAwake('myto-live-screen')).catch(() => undefined); };
  }, [r.paused]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  /** When the rider last dropped a waypoint: for a few seconds the screen asks what it marks. */
  const [dropAt, setDropAt] = useState(0);
  const [off, setOff] = useState(false);
  /** How tall the turn card and notices over the top of the map are, so the camera can keep the rider clear of them. */
  const [hudH, setHudH] = useState(0);
  /** The same for the group row and numbers over the bottom of the map. */
  const [footH, setFootH] = useState(0);
  /** Only the navigation: the numbers and the group row are hidden, and the map takes their room. Everything shows by default. */
  const [quiet, setQuiet] = useState(false);
  /** Sideways, how wide the column of turn card and numbers over the left of the map is. */
  const [sideW, setSideW] = useState(0);
  /** The list of riders in a tapped map badge is open: the turn card steps aside so it is not covered. */
  const [picking, setPicking] = useState(false);
  const follow = useRef(startFollow);
  const j = useJournalActions(r.startedAt);
  const stopping = useRef(false);
  const [health, setHealth] = useState(startGpsHealth);
  const [resumedAt, setResumedAt] = useState(0);
  useEffect(() => { const sub = AppState.addEventListener('change', (st) => { if (st === 'active') setResumedAt(nowMs()); }); return () => sub.remove(); }, []);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (r.status === 'idle' && !stopping.current) router.replace('/'); }, [r.status, router]);
  // A place the rider asked to be guided to is for this ride only.
  useEffect(() => () => { if (useRecorder.getState().status === 'idle') { useGuideTarget.getState().clear(); useSimRide.getState().clear(); } }, []);
  // Heading to the start, then along the trail. Off the route for 20 seconds (only once on the trail): buzz and say so. Back within 60 m: clear it.
  const trail = useMemo(() => (routeLine ? prepareTrail(routeLine) : undefined), [routeLine]);
  const guideState = useRef(startGuide);
  const [guide, setGuide] = useState<Guide>();
  useEffect(() => {
    if (!trail || !last || r.paused) return;
    const before = guideState.current.phase;
    const g = stepGuide(guideState.current, trail, last);
    guideState.current = g.state;
    setGuide(g.guide);
    if (g.state.phase === 'finished' && before !== 'finished') Vibration.vibrate([0, 300, 150, 300]);
    if (g.state.phase !== 'on_trail') { follow.current = startFollow; setOff(false); return; }
    const step = stepFollow(follow.current, g.guide.offM, Date.now());
    follow.current = step.state;
    if (step.wentOff) { setOff(true); Vibration.vibrate([0, 400, 200, 400]); }
    if (step.backOn) setOff(false);
  }, [last?.lat, last?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  // What to tell the rider next. A route in hand is followed by its own bends; before its start, and with no route, the road to a place is asked for.
  const start = routeLine?.[0];
  const toStart = !!routeLine && guide?.phase === 'to_start';
  const roadTo = rescueSpot ? rescueSpot : simRoad ? undefined : routeLine ? (toStart ? target ?? start : undefined) : destination;
  const { directions, failed: roadFailed } = useDirections(lastSpot, roadTo);
  // The position and heading the map and the turn card show are steadied, not raw: on a road they are the road's, elsewhere the fix and the smoothed direction of travel.
  const followLine = rescueSpot ? directions?.line : simRoad?.directions.line ?? (roadTo ? directions?.line : undefined) ?? routeLine;
  const smooth = useSmoothedRide({ position: lastSpot, speedMps: r.speedKmh / 3.6, course, line: followLine });
  const heading = smooth.heading;
  const spot = smooth.position ?? lastSpot;
  const instruction = useMemo<Instruction | undefined>(() => {
    if (!spot) return undefined;
    if (simRoad && !rescueSpot) return fromDirections(simRoad.directions, spot, simRoad.name);
    if (roadTo) {
      const eyebrow = rescueSpot ? `To ${rescueSpot.name}` : toStart ? 'To the start' : target ? target.name ?? 'Navigation' : 'Group destination';
      if (directions) return fromDirections(directions, spot, eyebrow);
      return { kind: 'straight', distM: haversine(spot, roadTo), text: `Head ${compassWord(spot, roadTo)}. ${roadFailed ? 'The road service could not be reached' : 'Finding the road…'}`, eyebrow, remainingM: null, etaMin: null, off: false, arrived: false };
    }
    return routeLine && guide ? fromTrail(guide, start, spot, off) : undefined;
  }, [spot, roadTo?.lat, roadTo?.lng, toStart, target, rescueSpot, directions, roadFailed, routeLine, simRoad, guide, start, off]); // eslint-disable-line react-hooks/exhaustive-deps
  // On reaching the rider, or when they say they are OK, the card asks whether to carry on: one tap goes back to the ride as it was.
  const helpResolved = !!rescue && !!rescueRider && rescue.startStatus !== 'ok' && rescueRider.status === 'ok';
  const helpPrompt = rescue && (instruction?.arrived || helpResolved) ? { text: helpResolved ? `${rescue.name} is OK now.` : `You have reached ${rescue.name}.`, action: 'Help given, continue the ride', onAction: endRescue } : undefined;
  const shareHere = () => last && Share.share({ message: `I need help. My position: https://maps.google.com/?q=${last.lat.toFixed(5)},${last.lng.toFixed(5)}` });

  const stop = async () => {
    buzz.stop();
    stopping.current = true;
    const recordedByGps = r.source === 'gps';
    // If the ride could not be written, it stays on the phone and Home offers it back for saving.
    const id = await finishRide().catch(() => undefined);
    // A ride recorded while a trip is under way belongs to it.
    if (id) useTrips.getState().attachToActive(id);
    // With the rider's yes, the route goes to OpenStreetMap, trimmed and anonymous. A simulated ride never does.
    if (id) queueRideForOsm(id, recordedByGps);
    router.replace(id ? `/story/${id}` : '/');
  };

  const shown = r.paused ? 0 : r.source === 'sim' ? r.speedKmh : shownSpeedKmh(r.speedKmh, r.lastFixAt, nowMs());
  const speed = shown === null ? { value: '–', unit: speedKmh(0).unit } : speedKmh(shown);
  const distance = distanceKm(r.meters / 1000);
  const ageSec = r.lastFixAt ? Math.max(0, Math.round((nowMs() - r.lastFixAt) / 1000)) : 0;
  // Fixes keep coming while stopped, so a long silence is a real loss; the warning needs one to raise and a steady run of fixes to clear.
  const nextHealth = r.source === 'gps' && !r.paused ? stepGpsHealth(health, { now: nowMs(), lastFixAt: r.lastFixAt, resumedAt }) : startGpsHealth;
  if (nextHealth.lost !== health.lost || nextHealth.freshSince !== health.freshSince) setHealth(nextHealth);
  const lostSignal = nextHealth.lost;
  const weakSignal = !lostSignal && r.source === 'gps' && !r.paused && isWeak(fix?.accuracy);
  // The background task is what keeps recording with the screen locked; tell the rider when it is not running.
  const foregroundOnly = r.source === 'gps' && !r.paused && Platform.OS !== 'web' && !r.backgrounded && nowMs() - r.startedAt > 3000;
  // One quiet line under the numbers: how fresh the position is, and while guided by a route, how far the group's meeting place is.
  const regroupKm = regroup && last ? haversine(last, regroup) / 1000 : null;
  const fixNote = [
    r.source === 'gps' && !fix && gpsError ? gpsError : r.paused ? 'Paused. Nothing is recorded until you resume.' : r.lastFixAt ? `Last fix ${ageSec} s ago${fix?.accuracy ? ` · GPS ±${Math.round(fix.accuracy)} m` : ''}` : 'Waiting for a GPS fix…',
    regroup && regroupKm !== null && (target || routeLine) ? `${regroup.name ?? 'Regroup'} ${asText(distanceKm(regroupKm))}` : '',
  ].filter(Boolean).join(' · ');
  const stats = <StatsStrip distance={distance} time={clock(r.elapsedMs(nowMs()))} speed={speed} paused={r.paused} note={fixNote} />;
  const status = (
    <View style={{ gap: space[2] }}>
      {r.error ? <Banner eyebrow="Storage" title={r.error} /> : null}
      {lostSignal ? <Banner eyebrow="GPS" title="Lost GPS signal, still recording" /> : weakSignal ? <Banner eyebrow="GPS" title="Weak GPS signal. The route may be rough here." /> : null}
      {dropAt && nowMs() - dropAt < 6000 && r.waypoints.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {WAYPOINT_KINDS.map((k) => <ChoiceChip key={k} label={WAYPOINT_LABEL[k]} onPress={() => { void r.retypeLastWaypoint(k); setDropAt(0); }} />)}
        </View>
      ) : null}
      {checkin ? <Pressable accessibilityRole="button" onPress={() => setCheckinOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="label" tone="muted">Check-in on · back by {clockLabel(new Date(checkin.expectedAt).getHours() * 60 + new Date(checkin.expectedAt).getMinutes())}</Text></Pressable> : null}
      {foregroundOnly ? <Banner eyebrow="Heads up" title="Recording stops if you lock the phone. Tap to allow Always in Settings." onPress={() => void Linking.openSettings()} /> : null}
    </View>
  );
  // The other riders of the group ride, with how far they are and a way to navigate to them (once stopped).
  const tiles = group ? riderTiles(live.riders, live.me, last, nowMs()) : [];
  const groupRail = group && live.riders.length > 1 ? <GroupRail tiles={tiles} onSelect={(t) => setRiderId(t.id)} onAll={() => setGroupOpen(true)} /> : null;
  const picked = tiles.find((t) => t.id === riderId);
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

  // The map is the stage of the screen: the turn card floats over its top, and the group and the numbers sit under it.
  const mapData = { line: simRoad?.directions.line ?? routeLine, track: r.points, trackBreaks: breaks, position: spot, waypoints: r.waypoints, riderMarks, destination, guide: roadTo ? directions?.line : undefined, heading, glideMs: smooth.glideMs };
  // On the map's top right corner, where the turn card and the numbers it controls are.
  const quietBtn = <View style={{ position: 'absolute', top: space[3], right: space[3] }}><IconButton size={size.compact} icon={quiet ? Eye : EyeOff} label={quiet ? 'Show ride and group details' : 'Hide ride and group details'} onPress={() => setQuiet(!quiet)} /></View>;
  const stage = (
    // The map takes all the height between the header and the buttons: the turn card floats over its top edge, the group and the numbers over its bottom edge.
    <View style={{ flex: 1 }}>
      <OsmMap height="fill" radius={radius.card} follow pointer covered={{ top: hudH ? hudH + space[3] : 0, bottom: footH && !quiet ? footH + space[3] : 0 }} onPicker={setPicking} {...mapData} />
      <View pointerEvents="box-none" onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); if (h > 0) setHudH(h); }} style={{ position: 'absolute', top: space[3], left: space[3], right: space[3] + size.compact + space[2], gap: space[2] }}>
        {picking ? null : instruction ? <TurnCard instruction={instruction} compact={landscape} onStop={rescue ? endRescue : target ? clearTarget : undefined} stopLabel={rescue ? 'Continue the ride' : undefined} prompt={helpPrompt} /> : null}
        {picking ? null : status}
      </View>
      {quietBtn}
      {quiet ? null : (
        <View pointerEvents="box-none" onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); if (h > 0) setFootH(h); }} style={{ position: 'absolute', left: space[3], right: space[3], bottom: space[3], gap: space[2] }}>
          {groupRail}
          {stats}
        </View>
      )}
    </View>
  );
  const holdStop = (h: number) => <HoldButton label="Hold to stop" icon={Square} color={fixed.stopFill} minHeight={h} onComplete={stop} />;
  const quickRow = (h: number) => <View style={{ flexDirection: 'row', gap: space[3] }}>{sosBtn(h)}{smallBtn('Report', Megaphone, () => setReportOpen(true), h)}{smallBtn('Group', Users, () => setGroupOpen(true), h)}</View>;
  // The main actions stay at the foot of the screen, whatever else the page holds.
  const actions = (h: number, q: number) => (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', gap: space[3] }}>{pauseBtn(h)}{waypointBtn(h)}{holdStop(h)}</View>
      {quickRow(q)}
    </View>
  );

  return (
    <Screen scroll={false} footer={landscape ? undefined : actions(88, size.button)} overlay={<>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} at={last} />
      <GroupSheet open={groupOpen} onClose={() => setGroupOpen(false)} position={last} onRider={(id) => { setGroupOpen(false); setRiderId(id); }} />
      {picked ? <RiderSheet tile={picked} destination={regroup} canNavigate={canNavigate} onClose={() => setRiderId(undefined)} /> : null}
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <DocumentsSheet open={docsOpen} onClose={() => setDocsOpen(false)} />
      <NoteSheet open={noteOpen} canType={j.canType} onSave={j.addNote} onClose={() => setNoteOpen(false)} />
      <Sheet open={journalOpen} title="Ride journal" onClose={() => setJournalOpen(false)}>
        <Button icon={j.recording ? Square : Mic} label={j.recording ? `Stop recording ${Math.floor(j.seconds / 60)}:${String(j.seconds % 60).padStart(2, '0')}` : 'Record a voice note'} onPress={() => void j.toggleVoice()} />
        <Button variant="soft" icon={Camera} label="Take photo" onPress={() => void j.addPhoto('camera')} />
        <Button variant="soft" icon={PenLine} label={j.canType ? 'Write a note' : 'Write a note (when stopped)'} onPress={() => { setJournalOpen(false); setNoteOpen(true); }} />
        {j.problem ? <Text variant="label" tone="stop">{j.problem}</Text> : null}
      </Sheet>
      <Sheet open={sos} title="SOS" onClose={() => setSos(false)}>
        <Text variant="label" tone="muted">Call for help. This does not replace emergency services.</Text>
        <Button label={`Call ${emergency.number} (emergency)`} variant="emergency" icon={Phone} onPress={() => Linking.openURL(telUrl(emergency.number))} />
        <EmergencyEditor choice={emergency} />
        <Button variant="soft" icon={Share2} label="Share my position" onPress={() => void shareHere()} />
        {medical.bloodGroup || medical.notes ? <Text variant="label" tone="muted">Emergency card: {[medical.bloodGroup && `blood group ${medical.bloodGroup}`, medical.notes].filter(Boolean).join(' · ')}</Text> : null}
        {contacts.map((c) => <Button key={c.id} variant="soft" icon={Phone} label={`${c.name}${c.primary ? ' (main)' : ''}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} />)}
        {contacts.length === 0 ? <Text variant="label" tone="muted">No emergency contacts yet. Add them under You, Documents and emergency.</Text> : null}
      </Sheet>
    </>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: size.target }}>
        <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <View accessible accessibilityLabel={r.paused ? 'Paused' : 'Recording'} style={{ width: size.dot, height: size.dot, borderRadius: radius.chip, backgroundColor: r.paused ? c.muted : c.stop }} />
          {/* Upright there is no room for a word beside the buttons: the dot says recording (red) or paused (grey), and Pause turns into Resume. */}
          {landscape ? <Text variant="labelMedium" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{r.paused ? 'Paused' : r.source === 'sim' ? 'Recording (simulated)' : 'Recording'}</Text> : null}
        </View>
        <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          {landscape ? <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Report</Text></Pressable> : null}
          {landscape ? <Pressable accessibilityRole="button" onPress={() => setGroupOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Group</Text></Pressable> : null}
          <Pressable accessibilityRole="button" onPress={() => setDocsOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Documents</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setJournalOpen(true)} style={{ minHeight: size.target, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Journal</Text></Pressable>
          <IconButton plain tone="accent" size={size.target} icon={Minus} label="Minimise" onPress={() => router.replace('/')} />
        </View>
      </View>
      {landscape ? (
        // Turned on its side (a handlebar mount): the map takes the whole height, the turn card and numbers float over its left, and the four big buttons stand in a column on the right where a thumb falls.
        <View style={{ flex: 1, flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <OsmMap height="fill" radius={radius.card} follow pointer covered={{ top: 0, bottom: 0, left: sideW ? sideW + space[3] : 0 }} onPicker={setPicking} {...mapData} />
            <View pointerEvents="box-none" onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); if (w > 0) setSideW(w); }} style={{ position: 'absolute', top: space[3], bottom: space[3], left: space[3], width: '46%', maxWidth: layout.barMax, justifyContent: 'space-between' }}>
              <View style={{ gap: space[2] }}>{picking ? null : instruction ? <TurnCard instruction={instruction} compact onStop={rescue ? endRescue : target ? clearTarget : undefined} stopLabel={rescue ? 'Continue the ride' : undefined} prompt={helpPrompt} /> : null}{picking ? null : status}</View>
              {quiet ? null : <View style={{ gap: space[2] }}>{groupRail}{stats}</View>}
            </View>
            {quietBtn}
          </View>
          <View style={{ width: size.ride + space[8], gap: space[3] }}>{pauseBtn(size.button)}{waypointBtn(size.button)}{holdStop(size.button)}{sosBtn(size.button)}</View>
        </View>
      ) : (
        <View style={{ flex: 1, marginTop: space[2] }}>{stage}</View>
      )}
    </Screen>
  );
}
