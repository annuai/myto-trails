import { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ImagePlus, Send } from 'lucide-react-native';
import { ACCESS_BASES, CARRY_ITEMS, CARRY_ITEM_LABEL, INDIA_STATES, TERRAINS } from '@moto-trails/domain';
import type { CarryItem } from '@moto-trails/domain';
import { ApiFailure } from '@/api/client';
import { asText, distanceKm } from '@/lib/units';
import { newUuid } from '@/lib/uuid';
import { pathLength, trimEnds } from '@/lib/geo';
import { startSignIn } from '@/lib/signIn';
import { submitRide } from '@/lib/submit';
import { MAX_SUBMISSION_PHOTOS } from '@/lib/submitPhotos';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { ARRIVAL_NOTE_MAX, CARRY_NOTES_MAX, carryFields, carryProblem } from '@/lib/trailCarry';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useSubmissionQueue } from '@/store/submissionQueue';
import { enqueueSubmission } from '@/lib/submissionQueue';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { TimeField } from '@/ui/TimeField';
import { Text } from '@/ui/Text';

import { space } from '@/theme/tokens';
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const DIFFICULTY = ['easy', 'moderate', 'hard', 'expert'];
const SHAPES = [['loop', 'Loop'], ['out_and_back', 'Out and back'], ['point_to_point', 'Point to point']] as const;
const ACCESS = [['unknown', 'Not sure'], ['public', 'Public'], ['permission_required', 'Permission needed'], ['restricted', 'Restricted']] as const;
const BASIS = ACCESS_BASES.filter((b) => b !== 'none');
const TRIMS = [0, 200, 500] as const;
/** Where the best-time window starts when a rider adds one: 6:00 AM to 8:00 AM, in minutes after midnight. */
const DEFAULT_FROM = 360;
const DEFAULT_TO = 480;

const Chips = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>{children}</View>;

/** Send a ride to Moto Trails as a draft: the same steps as the website's submit form. Moderators review it; it is never published automatically. */
export default function Submit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ride = useRides((s) => s.rides.find((r) => r.id === id));
  const token = useAuth((s) => s.token);
  const [name, setName] = useState(ride?.name ?? '');
  const [summary, setSummary] = useState('');
  const [state, setState] = useState<{ name: string; slug: string }>();
  const [district, setDistrict] = useState('');
  const [town, setTown] = useState('');
  const [difficulty, setDifficulty] = useState('moderate');
  const [terrain, setTerrain] = useState<string[]>([]);
  const [shape, setShape] = useState<string>('loop');
  const [access, setAccess] = useState<string>('unknown');
  const [basis, setBasis] = useState<string>('rider_observed');
  const [evidence, setEvidence] = useState('');
  const [permission, setPermission] = useState('');
  const [water, setWater] = useState('');
  const [items, setItems] = useState<CarryItem[]>([]);
  const [carryNotes, setCarryNotes] = useState('');
  const [arrival, setArrival] = useState<{ from: number; to: number } | null>(null);
  const [arrivalNote, setArrivalNote] = useState('');
  const [trim, setTrim] = useState<number>(200);
  const [photos, setPhotos] = useState<{ mediaId: string; uri: string; width: number; height: number; altText: string }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const points = useMemo(() => (ride ? trimEnds(ride.points, trim) : []), [ride, trim]);
  if (!ride) return <Screen><BackHeader /><Text>Ride not found.</Text></Screen>;
  const km = pathLength(points) / 1000;

  const problem = (() => {
    if (name.trim().length < 3) return 'Give the trail a name of at least 3 letters.';
    if (summary.trim().length < 40) return `Describe the trail in at least 40 characters (${summary.trim().length} so far).`;
    if (/(https?:\/\/|www\.)/i.test(summary)) return 'Describe the trail in words, without web addresses.';
    if (!state) return 'Choose the state.';
    if (!district.trim() || !town.trim()) return 'Add the district and the nearest town.';
    if (!terrain.length) return 'Choose at least one terrain.';
    if (access !== 'unknown' && !evidence.trim()) return 'Say how you know the access, in a few words.';
    if (access === 'permission_required' && permission.trim().length < 10) return 'Explain how a rider gets permission.';
    const carryIssue = carryProblem({ water, notes: carryNotes, arrival, arrivalNote });
    if (carryIssue) return carryIssue;
    if (photos.some((p) => !p.altText.trim())) return 'Describe each photo in a few words, for people who cannot see it.';
    if (points.length < 2) return 'Nothing is left of the track after trimming. Choose a smaller trim.';
    if (!agreed) return 'Accept the contribution licence to submit.';
    return undefined;
  })();

  const send = async () => {
    if (problem || !token || !state) return setError(problem);
    setError(undefined);
    const clientId = ride.clientId ?? newUuid();
    useRides.setState((s) => ({ rides: s.rides.map((r) => (r.id === ride.id ? { ...r, clientId } : r)) }));
    const form = {
      name: name.trim(), summary: summary.trim(), state: state.slug, district: district.trim(), nearestTown: town.trim(), difficulty, terrain, routeShape: shape,
      accessClass: access, basis, evidence: evidence.trim(), permissionInstructions: permission.trim(),
      carry: carryFields({ water, items, notes: carryNotes, arrival, arrivalNote }), photos: photos.map((p) => ({ mediaId: p.mediaId, altText: p.altText })),
    };
    try {
      const res = await submitRide(token, { ...form, clientId, points, waypoints: ride.waypoints }, setBusy);
      useRides.getState().setSubmission(ride.id, { status: 'submitted', at: Date.now(), trailName: name.trim(), slug: res.slug, clientId });
      router.replace(`/story/${ride.id}`);
    } catch (e) {
      // No signal: keep the form on the phone and send it when there is one, so the rider can put the phone away.
      if (e instanceof ApiFailure && e.status === 0) {
        useSubmissionQueue.getState().setItems(enqueueSubmission(useSubmissionQueue.getState().items, { rideId: ride.id, clientId, trim, form }, Date.now()));
        useRides.getState().setSubmission(ride.id, { status: 'queued', at: Date.now(), trailName: name.trim(), slug: '', clientId });
        router.replace(`/story/${ride.id}`);
        return;
      }
      setError(e instanceof ApiFailure ? (e.fields ? `${e.message} ${Object.values(e.fields).join(' ')}` : e.message) : 'Something went wrong. Try again.');
    } finally { setBusy(undefined); }
  };

  const addPhoto = async () => {
    if (!token) return;
    setError(undefined); setBusy('Uploading the photo');
    try {
      const up = await pickAndUploadImage(token, null);
      if (up) setPhotos((x) => [...x, { ...up, altText: '' }]);
    } catch (e) { setError(e instanceof ApiFailure ? e.message : 'The photo could not be added. Try again.'); }
    finally { setBusy(undefined); }
  };

  const states = INDIA_STATES.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Screen
      footer={token ? <Button icon={Send} label={busy ?? 'Send for review'} disabled={!!busy} onPress={send} /> : <Button label="Sign in to upload" onPress={() => void startSignIn().catch((e: Error) => setError(e.message))} />}
      overlay={
        <Sheet open={picking} title="Choose the state" onClose={() => setPicking(false)}>
          <Field label="Search" value={filter} onChangeText={setFilter} />
          <ListCard>{states.map((s) => <Row key={s.slug} label={s.name} onPress={() => { setState(s); setPicking(false); }} chevron={false} />)}</ListCard>
        </Sheet>
      }
    >
      <BackHeader />
      <PageTitle sub="The same steps as the website. Moderators check it before anything is published.">Upload to Moto Trails</PageTitle>
      {!token ? <Card style={{ marginBottom: space[5] }}><Text variant="label" tone="muted">Sign in with your Moto Trails account to upload. Your ride stays on this phone until you send it.</Text></Card> : null}
      <View style={{ gap: space[5] }}>
        <Field label="Trail name" value={name} onChangeText={setName} placeholder="e.g. Granite Ridge Loop" />
        <Field label="What is it like to ride?" value={summary} onChangeText={setSummary} multiline placeholder="Surface, hazards, best season (40 to 400 characters, no web addresses)" />
        <ListCard><Row label="State" value={state?.name ?? 'Choose'} onPress={() => setPicking(true)} /></ListCard>
        <Field label="District" value={district} onChangeText={setDistrict} />
        <Field label="Nearest town" value={town} onChangeText={setTown} />
      </View>
      <SectionTitle>Difficulty</SectionTitle>
      <Chips>{DIFFICULTY.map((d) => <ChoiceChip key={d} label={label(d)} selected={difficulty === d} onPress={() => setDifficulty(d)} />)}</Chips>
      <SectionTitle>Terrain</SectionTitle>
      <Chips>{TERRAINS.map((t) => <ChoiceChip key={t} label={label(t)} selected={terrain.includes(t)} onPress={() => setTerrain((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />)}</Chips>
      <SectionTitle>Shape of the route</SectionTitle>
      <Chips>{SHAPES.map(([k, l]) => <ChoiceChip key={k} label={l} selected={shape === k} onPress={() => setShape(k)} />)}</Chips>
      <SectionTitle>Is it legal to ride?</SectionTitle>
      <Chips>{ACCESS.map(([k, l]) => <ChoiceChip key={k} label={l} selected={access === k} onPress={() => setAccess(k)} />)}</Chips>
      <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>A recording shows a route was ridden, not that it is allowed. Moderators verify access separately.</Text>
      {access !== 'unknown' ? (
        <View style={{ gap: space[4], marginTop: space[4] }}>
          <Text variant="labelMedium">How do you know?</Text>
          <Chips>{BASIS.map((b) => <ChoiceChip key={b} label={label(b)} selected={basis === b} onPress={() => setBasis(b)} />)}</Chips>
          <Field label="Source, in a few words" value={evidence} onChangeText={setEvidence} placeholder="e.g. Signboard at the gate says open to all" />
          {access === 'permission_required' ? <Field label="How does a rider get permission?" value={permission} onChangeText={setPermission} multiline /> : null}
        </View>
      ) : null}
      <SectionTitle>What to carry (optional)</SectionTitle>
      <View style={{ gap: space[4] }}>
        <Field label="Water per rider, in litres" value={water} onChangeText={setWater} keyboardType="decimal-pad" placeholder="e.g. 2" />
        <Chips>{CARRY_ITEMS.map((i) => <ChoiceChip key={i} label={CARRY_ITEM_LABEL[i]} selected={items.includes(i)} onPress={() => setItems((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} />)}</Chips>
        <Field label="Anything else to carry?" value={carryNotes} onChangeText={setCarryNotes} multiline maxLength={CARRY_NOTES_MAX} />
      </View>
      <SectionTitle>Best time to reach (optional)</SectionTitle>
      <View style={{ gap: space[3] }}>
        <Chips><ChoiceChip label={arrival ? 'Remove the best time' : 'Add a best time'} selected={!!arrival} onPress={() => setArrival(arrival ? null : { from: DEFAULT_FROM, to: DEFAULT_TO })} /></Chips>
        {arrival ? (
          <>
            <TimeField label="From" value={arrival.from} onChange={(from) => setArrival({ ...arrival, from })} />
            <TimeField label="To" value={arrival.to} onChange={(to) => setArrival({ ...arrival, to })} />
            <Field label="Why then?" value={arrivalNote} onChangeText={setArrivalNote} maxLength={ARRIVAL_NOTE_MAX} placeholder="e.g. Cooler, and the river crossing is low" />
          </>
        ) : null}
      </View>
      <SectionTitle>Photos (optional)</SectionTitle>
      <View style={{ gap: space[4] }}>
        <Text variant="caption" tone="muted">Up to {MAX_SUBMISSION_PHOTOS}. Keep number plates, faces and house numbers out of them. Moderators check every photo before it is shown.</Text>
        {photos.map((p, i) => (
          <Card key={p.mediaId} style={{ gap: space[3] }}>
            <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: p.width && p.height ? Math.min(Math.max(p.width / p.height, 0.75), 2) : 4 / 3 }} resizeMode="cover" accessibilityLabel={p.altText || 'Photo to upload'} />
            <Field label="What is in the picture?" value={p.altText} onChangeText={(t) => setPhotos((x) => x.map((y, j) => (j === i ? { ...y, altText: t } : y)))} maxLength={300} />
            <Button variant="soft" label="Remove this photo" onPress={() => setPhotos((x) => x.filter((_, j) => j !== i))} />
          </Card>
        ))}
        {token && photos.length < MAX_SUBMISSION_PHOTOS ? <Button variant="soft" icon={ImagePlus} label="Add a photo" disabled={!!busy} onPress={addPhoto} /> : null}
      </View>
      <SectionTitle>Hide the start and end</SectionTitle>
      <Chips>{TRIMS.map((t) => <ChoiceChip key={t} label={t ? `${t} m` : 'None'} selected={trim === t} onPress={() => setTrim(t)} />)}</Chips>
      <Card style={{ marginTop: space[4] }}><Text variant="label" tone="muted">The file sent has {points.length} points and {asText(distanceKm(km))}. Trimming keeps your home or work out of it.</Text></Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[5] }}>
        <Checkbox checked={agreed} onChange={setAgreed} label="Accept the contribution licence" />
        <Text variant="label" style={{ flex: 1 }}>I accept the contribution licence in the Moto Trails terms, so my route can be published after review.</Text>
      </View>
      {error ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{error}</Text> : null}
    </Screen>
  );
}
