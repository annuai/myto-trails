import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Download, Luggage, Megaphone, Pencil, Share2, Trash2, Upload } from 'lucide-react-native';
import { ReportSheet } from '@/features/ReportSheet';
import { ShareRideSheet } from '@/features/ShareRideSheet';
import { useJournal } from '@/store/journal';
import { useTrips } from '@/store/trips';
import { Sheet } from '@/ui/Sheet';
import { exportGpx } from '@/lib/exportGpx';
import { buildGpx } from '@/lib/gpx';
import { segmentsOf, trackStats } from '@/lib/track';
import { asText, distanceKm, durationParts, speedKmh } from '@/lib/units';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { Theme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { RideTimeline } from '@/features/RideTimeline';
import { fetchOutcome } from '@/api/submissionOutcome';
import { outcomeText } from '@/lib/submissionOutcome';
import { useAuth } from '@/store/auth';
import { RideMap } from '@/ui/RideMap';
import { Columns } from '@/ui/Columns';
import { Screen } from '@/ui/Screen';
import { Measure } from '@/ui/Measure';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function Story() {
  return <Theme mode="dark"><StoryBody /></Theme>;
}

function StoryBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const ride = useRides((s) => s.rides.find((r) => r.id === id));
  const journalCount = useJournal((s) => s.entries.filter((e) => e.rideKey === ride?.startedAt).length);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const trips = useTrips((s) => s.trips);
  const token = useAuth((s) => s.token);
  const slug = ride?.submission?.slug;
  // Ask the site what the moderators did with a ride that was sent for review. Offline or signed out, the last answer stays.
  useEffect(() => {
    if (!token || !slug || !ride) return;
    let cancelled = false;
    fetchOutcome(token, slug).then((o) => { if (o && !cancelled) useRides.getState().setOutcome(ride.id, o); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [token, slug, ride?.id]);
  if (!ride) return <Screen><BackHeader /><Text>Ride not found.</Text></Screen>;
  const deleteRide = () => { useJournal.getState().removeForRide(ride.startedAt); useTrips.getState().forgetRide(ride.id); useRides.getState().removeRide(ride.id); router.replace('/rides'); };
  const sub = ride.submission;
  const gapM = trackStats(segmentsOf(ride.points, ride.breaks)).gapM;
  return (
    <Screen overlay={<>
      <ShareRideSheet ride={ride} open={shareOpen} onClose={() => setShareOpen(false)} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} at={ride.points[ride.points.length - 1]} />
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
      <View style={{ backgroundColor: c.accent, borderRadius: radius.card, padding: space[6], gap: space[1] }}>
        <Text variant="label" style={{ color: c.accentInk }}>You rode</Text>
        <Measure parts={distanceKm(ride.distanceKm)} size="liveCompact" color={c.accentInk} />
        <Text variant="label" style={{ color: c.accentInk }}>in {asText(durationParts(ride.durationSec))}</Text>
      </View>
      <SectionTitle>Timeline</SectionTitle>
      <View style={{ marginBottom: space[3] }}><RideTimeline ride={ride} /></View>
      <SectionTitle>Highlights</SectionTitle>
      <Card style={{ flexDirection: 'row', marginBottom: space[3] }}>
        <Stat parts={speedKmh(ride.maxKmh)} label="Top speed" />
        <Stat value={`${ride.waypoints.length}`} label="Waypoints" />
        {gapM > 0 ? <Stat parts={distanceKm(+(gapM / 1000).toFixed(1))} label="GPS gap" /> : <Stat value={`${ride.points.length}`} label="Points" />}
      </Card>
        </>}
        right={<>
      <View style={{ marginTop: 0 }}><RideMap radius={radius.card} points={ride.points} breaks={ride.breaks} waypoints={ride.waypoints} /></View>
      <SectionTitle>Share it</SectionTitle>
      {sub ? (
        <Card style={{ gap: space[3] }}>
          {(() => { const o = sub.outcome ? outcomeText(sub.outcome.status, sub.outcome.feedback) : undefined; return <StatusChip status={o?.tone ?? 'good'} label={o ? o.label : 'Sent for review'} />; })()}
          <Text variant="label" tone="muted">{sub.trailName}. Moderators check it before anything is published.</Text>
          {sub.outcome ? (() => { const o = outcomeText(sub.outcome.status, sub.outcome.feedback); return o.note ? <Text variant="label">{o.note}</Text> : null; })() : null}
        </Card>
      ) : null}
      <View style={{ gap: space[3], marginTop: sub ? space[3] : 0 }}>
        <Button icon={Share2} label="Share this ride" arrow onPress={() => setShareOpen(true)} />
        <Button variant="soft" icon={Megaphone} label="Report the trail's condition" onPress={() => setReportOpen(true)} />
        <Button variant="soft" icon={Luggage} label="Add to a trip" onPress={() => setTripOpen(true)} />
        <Button variant="soft" icon={Upload} label={sub ? 'Upload again' : 'Upload to Moto Trails'} arrow onPress={() => router.push(`/story/submit?id=${ride.id}`)} />
        <Button variant="soft" icon={BookOpen} label={journalCount ? `Journal · ${journalCount}` : 'Journal'} onPress={() => router.push(`/journal/${ride.startedAt}`)} />
        <Button variant="soft" icon={Download} label="Export GPX file" onPress={() => exportGpx(ride.name, buildGpx(ride.name, ride.points, ride.waypoints, ride.breaks))} />
        <Button variant="danger" icon={Trash2} label="Delete this ride" onPress={() => (journalCount ? setConfirmDelete(true) : deleteRide())} />
      </View>
        </>}
      />
    </Screen>
  );
}
