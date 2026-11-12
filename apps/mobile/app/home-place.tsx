import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Location from 'expo-location';
import { canEnableAutoEnd, currentLocationLabel } from '@/features/home/homePlace';
import { searchPlaces, type Place } from '@/lib/placeSearch';
import { useCompanion } from '@/store/companion';
import { useLocation } from '@/store/location';
import { usePlaces, type PlaceKind } from '@/store/places';
import { opacity, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** One rough position, only when no screen already holds a fix. No watch, no permission prompt loop: the battery rule. */
async function onePosition(): Promise<{ lat: number; lng: number } | undefined> {
  const fix = useLocation.getState().fix;
  if (fix) return { lat: fix.lat, lng: fix.lng };
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
      return await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(undefined), { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }));
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return undefined;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch { return undefined; }
}

/** A search that gets no answer gives up, so the screen is never stuck waiting. */
const SEARCH_TIMEOUT_MS = 10_000;

function PlaceSection({ kind, title }: { kind: PlaceKind; title: string }) {
  const saved = usePlaces((s) => s[kind]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const save = (lat: number, lng: number, label: string) => { usePlaces.getState().setPlace(kind, { lat, lng, label }); setQuery(''); setResults(undefined); setNote(undefined); };
  const useCurrent = async () => {
    setBusy(true); setNote(undefined);
    const pos = await onePosition();
    setBusy(false);
    if (!pos) return setNote('Your location is not available. Allow location for Myto Moto, or search for the place instead.');
    save(pos.lat, pos.lng, currentLocationLabel(kind));
  };
  const search = async () => {
    if (!query.trim()) return;
    const mine = ++seq.current;
    setBusy(true); setNote(undefined);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), SEARCH_TIMEOUT_MS);
    try {
      const near = useLocation.getState().fix;
      const found = await searchPlaces(query, { near: near ? { lat: near.lat, lng: near.lng } : undefined, signal: ctl.signal });
      if (mine !== seq.current) return;
      setResults(found);
      if (!found.length) setNote('No place found. Try a street, area or town.');
    } catch { if (mine === seq.current) setNote('Search needs a connection. Try again, or use your current location.'); }
    clearTimeout(timer);
    if (mine === seq.current) setBusy(false);
  };

  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Card style={{ gap: space[3] }}>
        {saved ? (
          <>
            <Text variant="labelMedium">{saved.label}</Text>
            <Text variant="caption" tone="muted">Places stay on this phone. They are never sent anywhere.</Text>
            <Button variant="soft" label={`Remove ${title}`} onPress={() => usePlaces.getState().clearPlace(kind)} onCard />
          </>
        ) : (
          <Text variant="label" tone="muted">{kind === 'home' ? 'Not set.' : 'Not set. Optional.'}</Text>
        )}
        <Button variant="soft" label="Use my current location" onPress={() => void useCurrent()} disabled={busy} onCard />
        <Field label="Search for a place" value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} returnKeyType="search" placeholder="Street, area or town" onCard />
        <Button variant="soft" label="Search" onPress={() => void search()} disabled={busy || !query.trim()} onCard />
        {note ? <Text variant="label" tone="muted">{note}</Text> : null}
      </Card>
      {results?.length ? (
        <ListCard>
          {results.map((r) => <Row key={`${r.name}|${r.detail}|${r.point.lat}`} label={r.name} sub={r.detail || undefined} chevron={false} onPress={() => save(r.point.lat, r.point.lng, r.detail ? `${r.name}, ${r.detail}` : r.name)} />)}
        </ListCard>
      ) : null}
    </>
  );
}

/** Where Home and Work are, and the two recording switches that depend on them. */
export default function HomePlaceScreen() {
  const home = usePlaces((s) => s.home);
  const work = usePlaces((s) => s.work);
  const autoEnd = useCompanion((s) => s.autoEnd);
  const batterySaver = useCompanion((s) => s.batterySaver);
  const canAuto = canEnableAutoEnd(home, work);
  const autoOn = canAuto && autoEnd;

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Saved on this phone only. They are used to offer a ride home and to end a ride when you arrive.">Home and work</PageTitle>
      <PlaceSection kind="home" title="Home" />
      <PlaceSection kind="work" title="Work" />
      <SectionTitle>Recording</SectionTitle>
      <ListCard>
        <View style={{ opacity: canAuto ? 1 : opacity.disabled }}>
          <Row label="Stop recording when I get home or to work" chevron={false}
            sub={canAuto
              ? 'It warns you first, never ends a group ride or a trip, and asks instead once you have kept recording twice.'
              : 'Set Home or Work above to turn this on. It warns you first, never ends a group ride or a trip, and asks instead once you have kept recording twice.'}
            right={<Checkbox checked={autoOn} label="Stop recording when I get home or to work" onChange={(v) => { if (canAuto) useCompanion.getState().setAutoEnd(v); }} />} />
        </View>
        <Row label="Save battery on long rides" chevron={false}
          sub="The GPS is sampled less when the battery is low or you are standing still, so distance and top speed may read slightly low."
          right={<Checkbox checked={batterySaver} label="Save battery on long rides" onChange={(v) => useCompanion.getState().setBatterySaver(v)} />} />
      </ListCard>
    </Screen>
  );
}
