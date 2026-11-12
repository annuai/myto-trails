import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Download, Luggage, Megaphone, Pencil, Share2, Trash2, Upload } from 'lucide-react-native';
import { TellHome } from '@/features/group/TellHome';
import { ReportSheet } from '@/features/ReportSheet';
import { RideFuelCard } from '@/features/RideFuelCard';
import { ShareRideSheet } from '@/features/ShareRideSheet';
import { useJournal } from '@/store/journal';
import { useTrips } from '@/store/trips';
import { Sheet } from '@/ui/Sheet';
import { exportGpx } from '@/lib/exportGpx';
import { trimNearPlaces } from '@/lib/geo';
import { gpxForExport } from '@/lib/privacy';
import { useSavedPlaces } from '@/lib/savedPlaces';
import { segmentsOf, trackStats } from '@/lib/track';
import { asText, distanceKm, durationParts, speedKmh } from '@/lib/units';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { Card } from '@/ui/Card';
import { ListCard, Row } from '@/ui/ListCard';
import { sharingOn, useOsm } from '@/store/osm';
import { StatusChip } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { RideTimeline } from '@/features/RideTimeline';
import { fetchOutcome } from '@/api/submissionOutcome';
import { nowMs } from '@/lib/clock';
import { HomeOfferCard } from '@/features/home/HomeOfferCard';
import { justFinishedRide } from '@/lib/justFinished';
import { shouldAskCondition } from '@/lib/conditions';
import { outcomeText } from '@/lib/submissionOutcome';
import { useAuth } from '@/store/auth';
import { RideMap } from '@/ui/RideMap';
import { Columns } from '@/ui/Columns';
import { Screen } from '@/ui/Screen';
import { Measure } from '@/ui/Measure';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { Theme, useTheme } from '@/theme/ThemeProvider';
import { newGround } from '@/lib/newGround';
import { Reveal } from '@/ui/motion';
import { motion } from '@/theme/tokens';
import { useCountUp, useOnce } from '@/ui/motionHooks';
import { TextButton } from '@/ui/TextButton';
import { radius, space } from '@/theme/tokens';

export default function Story() {
  return <Theme mode="dark" screen><StoryBody /></Theme>;
}

function StoryBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const ride = useRides((s) => s.rides.find((r) => r.id === id));
  const journalCount = useJournal((s) => s.entries.filter((e) => e.rideKey === ride?.startedAt).length);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Straight after a ride of a trail ends, ask once how the trail was: it is the cheapest way to keep conditions fresh.
  const [reportOpen, setReportOpen] = useState(() => !!ride && shouldAskCondition(ride, nowMs()));
  const [tripOpen, setTripOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const trips = useTrips((s) => s.trips);
  // A rider who said yes but has not signed in to OpenStreetMap yet is asked here, with a ride waiting to be sent.
  const osmNeedsSignIn = useOsm((s) => sharingOn(s) && !s.connected && s.pending.length > 0);
  const token = useAuth((s) => s.token);
  const slug = ride?.submission?.slug;
  // Ask the site what the moderators did with a ride that was sent for review. Offline or signed out, the last answer stays.
  useEffect(() => {
    if (!token || !slug || !ride) return;
    let cancelled = false;
    fetchOutcome(token, slug).then((o) => { if (o && !cancelled) useRides.getState().setOutcome(ride.id, o); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [token, slug, ride?.id]);
  useEffect(() => { if (reportOpen && ride && !ride.conditionAsked) useRides.getState().markConditionAsked(ride.id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const allRides = useRides((s) => s.rides);
  const places = useSavedPlaces();
  const ground = useMemo(() => (ride ? newGround(ride, allRides) : undefined), [ride, allRides]);
  // The first time a ride's story opens its route is inked onto the map and the figures count up with it. Later visits just show the finished ride; Replay plays it again.
  const first = useOnce(ride && !ride.sample ? `ink:${ride.id}` : undefined);
  const [run, setRun] = useState(0);
  const play = first || run > 0;
  const shownKm = useCountUp(ride?.distanceKm ?? 0, play, { ms: motion.duration.trace, delay: motion.traceDelay, run, steps: Math.round(ride?.distanceKm ?? 0) });
  const shownSec = useCountUp(ride?.durationSec ?? 0, play, { ms: motion.duration.trace, delay: motion.traceDelay, run, steps: 0 });
  if (!ride) return <Screen><BackHeader /><Text>Ride not found.</Text></Screen>;
  const deleteRide = () => { useJournal.getState().removeForRide(ride.startedAt); useTrips.getState().forgetRide(ride.id); useRides.getState().removeRide(ride.id); router.dismissTo('/rides'); };
  const sub = ride.submission;
  const inTrips = trips.filter((t) => t.rideIds.includes(ride.id));
  // The "Ride home" offer shows only on the story of the ride that just finished (the Dash's just-finished window).
  const justEnded = !ride.sample && justFinishedRide(allRides, nowMs())?.id === ride.id;
  const gapM = trackStats(segmentsOf(ride.points, ride.breaks)).gapM;
  // What leaves the phone (a GPX file, a condition report's position) never shows the ends near Home or Work.
  const gpx = gpxForExport(ride.name, ride.points, places, ride.waypoints, ride.breaks);
  const away = trimNearPlaces(ride.points, places);
  return (
    <Screen overlay={<>
      <ShareRideSheet ride={ride} open={shareOpen} onClose={() => setShareOpen(false)} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} at={away[away.length - 1]} trailSlug={ride.trailSlug} />
      <Sheet open={renaming} title="Rename this ride" onClose={() => setRenaming(false)}>
        <Field label="Name" value={draftName} onChangeText={setDraftName} maxLength={80} autoFocus returnKeyType="done" onSubmitEditing={() => { useRides.getState().renameRide(ride.id, draftName); setRenaming(false); }} />
        <Button label="Save name" disabled={!draftName.trim()} onPress={() => { useRides.getState().renameRide(ride.id, draftName); setRenaming(false); }} />
      </Sheet>
      <Sheet open={tripOpen} title="Add to a trip" onClose={() => setTripOpen(false)}>
        {trips.map((t) => <Button key={t.id} variant="soft" label={t.rideIds.includes(ride.id) ? `${t.name} · added` : t.name} onPress={() => { useTrips.getState().addRide(t.id, ride.id); setTripOpen(false); }} />)}
        <Button label="Start a new trip with this ride" onPress={() => { const id = useTrips.getState().create({ name: ride.name }); useTrips.getState().addRide(id, ride.id); setTripOpen(false); router.push(`/trips/${id}`); }} />
      </Sheet>
      <Sheet open={confirmDelete} title="Delete this ride?" onClose={() => setConfirmDelete(false)}>
        <Text variant="label" tone="muted">The ride and its journal ({journalCount} {journalCount === 1 ? 'entry' : 'entries'}, with their photos and voice notes) are removed from this phone. This cannot be undone.</Text>
        <Button variant="danger" icon={Trash2} label="Delete ride and journal" onPress={deleteRide} />
        <Button variant="soft" label="Keep it" onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </>}>
      <BackHeader title="Ride story" right={<IconButton icon={Pencil} label="Rename this ride" onPress={() => { setDraftName(ride.name); setRenaming(true); }} plain />} />
      <PageTitle sub={formatDate(new Date(ride.startedAt).toISOString().slice(0, 10)) + (ride.sample ? ' · sample' : '')}>{ride.name}</PageTitle>
      <Columns
        left={<>
      {justEnded ? <HomeOfferCard /> : null}
      <View style={{ backgroundColor: c.accent, borderRadius: radius.card, padding: space[6], gap: space[1] }}>
        <Text variant="label" style={{ color: c.accentInk }}>You rode</Text>
        <Measure parts={distanceKm(play ? +shownKm.toFixed(1) : ride.distanceKm)} size="liveCompact" color={c.accentInk} />
        <Text variant="label" style={{ color: c.accentInk }}>in {asText(durationParts(play ? Math.round(shownSec) : ride.durationSec))}</Text>
        {ground && ground.km >= 1 ? <Reveal delay={play ? motion.stagger.max : 0}><Text variant="label" style={{ color: c.accentInk, marginTop: space[2] }}>{asText(distanceKm(+ground.km.toFixed(1)))} of it on ground you had not ridden before</Text></Reveal> : null}
      </View>
      <SectionTitle>Timeline</SectionTitle>
      <View style={{ marginBottom: space[3] }}><RideTimeline ride={ride} /></View>
      <SectionTitle>Highlights</SectionTitle>
      <Card style={{ flexDirection: 'row', marginBottom: space[3] }}>
        <Stat parts={speedKmh(ride.maxKmh)} label="Top speed" />
        <Stat value={`${ride.waypoints.length}`} label="Waypoints" />
        {gapM > 0 ? <Stat parts={distanceKm(+(gapM / 1000).toFixed(1))} label="GPS gap" /> : <Stat value={`${ride.points.length}`} label="Points" />}
      </Card>
      {ride.groupId && !ride.sample ? <View style={{ marginBottom: space[3] }}><TellHome groupId={ride.groupId} /></View> : null}
      <View style={{ marginBottom: space[3] }}><RideFuelCard ride={ride} /></View>
        </>}
        right={<>
      <View style={{ marginTop: 0 }}><RideMap radius={radius.card} points={ride.points} breaks={ride.breaks} waypoints={ride.waypoints} ink={{ play, run }} /></View>
      {!ride.sample && ride.points.length >= 2 ? <View style={{ alignItems: 'flex-start', marginTop: space[2] }}><TextButton label="Replay" onPress={() => setRun((r) => r + 1)} /></View> : null}
      {osmNeedsSignIn && !ride.sample ? (
        <Card style={{ gap: space[3], marginTop: space[4] }}>
          <Text variant="bodyMedium">Send this ride to OpenStreetMap</Text>
          <Text variant="label" tone="muted">Sign in to your free OpenStreetMap account once and this ride, and the ones after it, go to the map without your name.</Text>
          <Button variant="soft" label="Sign in to OpenStreetMap" onPress={() => router.push('/osm')} />
        </Card>
      ) : null}
      <SectionTitle>Share it</SectionTitle>
      {sub ? (
        <Card style={{ gap: space[3] }}>
          {sub.status === 'queued' ? <StatusChip status="unknown" label="Waiting for a signal" />
            : sub.status === 'failed' ? <StatusChip status="stop" label="Not sent" />
            : (() => { const o = sub.outcome ? outcomeText(sub.outcome.status, sub.outcome.feedback) : undefined; return <StatusChip status={o?.tone ?? 'good'} label={o ? o.label : 'Sent for review'} />; })()}
          <Text variant="label" tone="muted">{sub.status === 'queued' ? `${sub.trailName}. It is saved on this phone and goes by itself when you have a signal. You can close the app.`
            : sub.status === 'failed' ? `${sub.trailName}. ${sub.error ?? 'The site did not accept it.'} Change it and upload again.`
            : `${sub.trailName}. Moderators check it before anything is published.`}</Text>
          {sub.outcome ? (() => { const o = outcomeText(sub.outcome.status, sub.outcome.feedback); return o.note ? <Text variant="label">{o.note}</Text> : null; })() : null}
        </Card>
      ) : null}
      <View style={{ gap: space[3], marginTop: sub ? space[3] : 0 }}>
        <Button icon={Share2} label="Share this ride" arrow onPress={() => setShareOpen(true)} />
        {ride.trailSlug ? <Button variant="soft" icon={Megaphone} label="Report the trail's condition" onPress={() => setReportOpen(true)} /> : null}
        <Button variant="soft" icon={Upload} label={sub ? 'Upload again' : 'Upload to Moto Trails'} arrow onPress={() => router.push(`/story/submit?id=${ride.id}`)} />
        <Button variant="soft" icon={BookOpen} label={journalCount ? `Journal · ${journalCount}` : 'Journal'} onPress={() => router.push(`/journal/${ride.startedAt}`)} />
        <Button variant="soft" icon={Download} label="Export GPX file" disabled={!gpx} onPress={() => gpx && exportGpx(ride.name, gpx)} />
        <ListCard><Row icon={Luggage} label="Trip" value={inTrips.length ? inTrips.map((t) => t.name).join(', ') : 'Not in a trip'} onPress={() => setTripOpen(true)} /></ListCard>
        <Button variant="danger" icon={Trash2} label="Delete this ride" onPress={() => (journalCount ? setConfirmDelete(true) : deleteRide())} />
      </View>
        </>}
      />
    </Screen>
  );
}
