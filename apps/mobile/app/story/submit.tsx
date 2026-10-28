import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { ACCESS_BASES, INDIA_STATES, TERRAINS } from '@moto-trails/domain';
import { ApiFailure } from '@/api/client';
import { asText, distanceKm } from '@/lib/units';
import { newUuid } from '@/lib/uuid';
import { pathLength, trimEnds } from '@/lib/geo';
import { startSignIn } from '@/lib/signIn';
import { submitRide } from '@/lib/submit';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const DIFFICULTY = ['easy', 'moderate', 'hard', 'expert'];
const SHAPES = [['loop', 'Loop'], ['out_and_back', 'Out and back'], ['point_to_point', 'Point to point']] as const;
const ACCESS = [['unknown', 'Not sure'], ['public', 'Public'], ['permission_required', 'Permission needed'], ['restricted', 'Restricted']] as const;
const BASIS = ACCESS_BASES.filter((b) => b !== 'none');
const TRIMS = [0, 200, 500] as const;

const Chips = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{children}</View>;

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
  const [trim, setTrim] = useState<number>(200);
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
    if (points.length < 2) return 'Nothing is left of the track after trimming. Choose a smaller trim.';
    if (!agreed) return 'Accept the contribution licence to submit.';
    return undefined;
  })();

  const send = async () => {
    if (problem || !token || !state) return setError(problem);
    setError(undefined);
    const clientId = ride.clientId ?? newUuid();
    useRides.setState((s) => ({ rides: s.rides.map((r) => (r.id === ride.id ? { ...r, clientId } : r)) }));
    try {
      const res = await submitRide(token, {
        clientId, name: name.trim(), summary: summary.trim(), state: state.slug, district: district.trim(), nearestTown: town.trim(), difficulty, terrain, routeShape: shape,
        accessClass: access, basis, evidence: evidence.trim(), permissionInstructions: permission.trim(), points, waypoints: ride.waypoints,
      }, setBusy);
      useRides.getState().setSubmission(ride.id, { status: 'submitted', at: Date.now(), trailName: name.trim(), slug: res.slug, clientId });
      router.replace(`/story/${ride.id}`);
    } catch (e) {
      setError(e instanceof ApiFailure ? (e.fields ? `${e.message} ${Object.values(e.fields).join(' ')}` : e.message) : 'Something went wrong. Try again.');
    } finally { setBusy(undefined); }
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
      {!token ? <Card style={{ marginBottom: 20 }}><Text variant="label" tone="muted">Sign in with your Moto Trails account to upload. Your ride stays on this phone until you send it.</Text></Card> : null}
      <View style={{ gap: 20 }}>
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
      <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>A recording shows a route was ridden, not that it is allowed. Moderators verify access separately.</Text>
      {access !== 'unknown' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          <Text variant="labelMedium">How do you know?</Text>
          <Chips>{BASIS.map((b) => <ChoiceChip key={b} label={label(b)} selected={basis === b} onPress={() => setBasis(b)} />)}</Chips>
          <Field label="Source, in a few words" value={evidence} onChangeText={setEvidence} placeholder="e.g. Signboard at the gate says open to all" />
          {access === 'permission_required' ? <Field label="How does a rider get permission?" value={permission} onChangeText={setPermission} multiline /> : null}
        </View>
      ) : null}
      <SectionTitle>Hide the start and end</SectionTitle>
      <Chips>{TRIMS.map((t) => <ChoiceChip key={t} label={t ? `${t} m` : 'None'} selected={trim === t} onPress={() => setTrim(t)} />)}</Chips>
      <Card style={{ marginTop: 16 }}><Text variant="label" tone="muted">The file sent has {points.length} points and {asText(distanceKm(km))}. Trimming keeps your home or work out of it.</Text></Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
        <Checkbox checked={agreed} onChange={setAgreed} label="Accept the contribution licence" />
        <Text variant="label" style={{ flex: 1 }}>I accept the contribution licence in the Moto Trails terms, so my route can be published after review.</Text>
      </View>
      {error ? <Text variant="label" tone="stop" style={{ marginTop: 16 }}>{error}</Text> : null}
    </Screen>
  );
}
