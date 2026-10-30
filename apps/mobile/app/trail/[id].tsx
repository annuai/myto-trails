import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Bookmark, CalendarPlus, CloudOff, Download, Navigation, Stamp, Trash2 } from 'lucide-react-native';
import { accessOf, conditionOf, dur, headline, verificationOf } from '@/api/status';
import { toLatLng } from '@/api/types';
import { setSaved, useSaved, useTrail } from '@/api/useApi';
import { useTrailCommentsSection } from '@/features/community/useTrailCommentsSection';
import { PlanTripSheet } from '@/features/trip/PlanTripSheet';
import { RiderReports } from '@/features/RiderReports';
import { markRidden, unmarkRidden } from '@/api/ridden';
import { useRidden } from '@/features/passport/useRidden';
import { ElevationChart } from '@/ui/ElevationChart';
import { RouteCheck } from '@/features/RouteCheck';
import { deleteTiles, downloadTiles, hasTiles, tilesAvailable } from '@/lib/offlineTiles';
import { formatDate } from '@/lib/dates';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { asText, distanceKm, elevationM } from '@/lib/units';
import { useAuth } from '@/store/auth';
import { useTrailStore } from '@/store/trails';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Columns } from '@/ui/Columns';
import { useLayout } from '@/ui/useLayout';
import { StatusChip } from '@/ui/Chip';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { ListCard, Row } from '@/ui/ListCard';
import { OsmMap } from '@/ui/map/OsmMap';
import { RouteArt } from '@/ui/RouteArt';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const mb = (bytes: number) => `${Math.max(0.1, bytes / 1_000_000).toFixed(1)} MB`;

export default function TrailDetail() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { landscape } = useLayout();
  const t = useTrail(slug);
  const token = useAuth((s) => s.token);
  const saved = useSaved();
  const { offline, downloading, download, removeDownload, planTrip } = useTrailStore();
  const [planning, setPlanning] = useState(false);
  const [rideChoice, setRideChoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const comments = useTrailCommentsSection(slug);
  const ridden = useRidden();
  const iRode = !!ridden.items?.some((r) => r.slug === slug);
  const toggleRidden = async () => {
    if (!token) return router.push('/you');
    setBusy(true); setProblem(undefined);
    try { await (iRode ? unmarkRidden(token, slug) : markRidden(token, slug)); ridden.reload(); } catch (e) { setProblem(e instanceof Error ? e.message : 'Could not update your list.'); } finally { setBusy(false); }
  };
  /** Map tiles saved for this trail: a percentage while they download, true once saved. */
  const [tiles, setTiles] = useState<number | true>();
  useEffect(() => { void hasTiles(slug).then((v) => v && setTiles(true)).catch(() => undefined); }, [slug]);
  const line = useMemo(() => (t.data?.route ? toLatLng(t.data.route.line) : undefined), [t.data?.route]);

  if (!t.data) {
    return <Screen><BackHeader title="Trails" /><Text variant="body" tone={t.error ? 'stop' : 'muted'}>{t.error ?? 'Loading…'}</Text>{t.error ? <View style={{ marginTop: 16 }}><Button variant="soft" label="Try again" onPress={t.reload} /></View> : null}</Screen>;
  }
  const { detail, route } = t.data;
  const isSaved = !!saved.data?.some((i) => i.trail?.slug === slug);
  const pack = offline[slug];
  const h = headline(detail);
  const needsCare = h.status !== 'good';
  const photos = detail.media ?? [];
  const hero = photos.find((m) => m.role === 'cover') ?? photos[0];
  const heroUri = hero?.variants['1200'] ?? hero?.variants['800'] ?? detail.cover?.variants['800'];
  const gallery = photos.filter((m) => m !== hero);

  const start = detail.location ?? (Number.isFinite(detail.lat) && Number.isFinite(detail.lon) ? { lat: detail.lat, lon: detail.lon } : null);
  const openInMaps = () => { if (start) void Linking.openURL(mapsDirectionsUrl({ lat: start.lat, lng: start.lon })).catch(() => setProblem('Could not open Google Maps.')); };

  const toggleSave = async () => {
    if (!token) return router.push('/you');
    setBusy(true); setProblem(undefined);
    try { await setSaved(slug, !isSaved, token); saved.reload(); } catch (e) { setProblem(e instanceof Error ? e.message : 'Could not update Saved.'); } finally { setBusy(false); }
  };
  const getPack = async () => {
    setProblem(undefined);
    try {
      await download(slug);
      // The map itself, when the project has a tile provider that allows saving tiles (the public OpenStreetMap servers do not).
      const saved = useTrailStore.getState().offline[slug]?.route;
      if (tilesAvailable && saved) { setTiles(0); await downloadTiles(slug, toLatLng(saved.line), setTiles); setTiles(true); }
    } catch (e) { setTiles(undefined); setProblem(e instanceof Error ? e.message : 'Download failed.'); }
  };
  const dropPack = () => { removeDownload(slug); void deleteTiles(slug).catch(() => undefined); setTiles(undefined); };

  const topEl = (<>
      <Card padded={false}>
        {heroUri ? <Image source={{ uri: heroUri }} accessibilityLabel={hero?.altText ?? detail.cover?.altText} style={{ width: '100%', aspectRatio: 16 / 10 }} resizeMode="cover" /> : <RouteArt seed={0} height={180} />}
      </Card>
      {hero?.credit ? <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>Photo: {hero.credit}</Text> : null}
      <View style={{ marginTop: 24, gap: 6 }}>
        <Text variant="title">{detail.name}</Text>
        <Text variant="label" tone="muted">{detail.nearestTown}, {detail.state.name}</Text>
        <Text variant="data" tone="muted">{[detail.distanceKm != null && asText(distanceKm(detail.distanceKm)), detail.estDurationMin != null && dur(detail.estDurationMin), label(detail.difficulty), detail.elevationGainM != null && `${asText(elevationM(detail.elevationGainM))} climb`].filter(Boolean).join(' · ')}</Text>
      </View>
      {needsCare ? (
        <Card style={{ marginTop: 20, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Icon icon={AlertTriangle} tone="caution" />
          <Text variant="label" style={{ flex: 1 }}>{h.label}. Check access before you ride. Myto Moto never calls an unverified or restricted trail open.</Text>
        </Card>
      ) : null}
      <SectionTitle>Can I ride it</SectionTitle>
      <ListCard>
        <Row label="Access" right={<StatusChip status={accessOf(detail.accessClass).status} label={accessOf(detail.accessClass).label} />} />
        <Row label="Condition" right={<StatusChip status={conditionOf(detail.condition).status} label={conditionOf(detail.condition).label} />} />
        <Row label="Verification" right={<StatusChip status={verificationOf(detail.verification.level).status} label={verificationOf(detail.verification.level).label} />} />
        {detail.verifiedAt ? <Row label="Verified" value={formatDate(detail.verifiedAt.slice(0, 10))} mono /> : null}
      </ListCard>
      <RiderReports slug={slug} />
      {detail.permissionInstructions ? <><SectionTitle>Getting permission</SectionTitle><Card><Text variant="body">{detail.permissionInstructions}</Text></Card></> : null}
  </>);
  const routeEl = (<>
      <SectionTitle>Route</SectionTitle>
      {line ? <OsmMap height={260} line={line} radius={24} /> : <Card><Text variant="label" tone="muted">The route line is not published for this trail.</Text></Card>}
      {route ? <Text variant="data" tone="muted" style={{ marginTop: space[3] }}>{asText(distanceKm(route.distanceKm))} · +{asText(elevationM(route.elevGainM))} / −{asText(elevationM(route.elevLossM))} · {route.minElevM}–{asText(elevationM(route.maxElevM))}</Text> : null}
      {route?.profile?.length ? <View style={{ marginTop: space[4] }}><ElevationChart samples={route.profile} /></View> : null}
      {line ? <View style={{ marginTop: space[4] }}><RouteCheck line={line} /></View> : null}
      {detail.hazards.length || detail.safetyNotes ? (
        <>
          <SectionTitle>Safety</SectionTitle>
          <Card style={{ gap: 12 }}>
            {detail.hazards.length ? <Text variant="labelMedium">{detail.hazards.map(label).join(' · ')}</Text> : null}
            {detail.safetyNotes ? <Text variant="body">{detail.safetyNotes}</Text> : null}
          </Card>
        </>
      ) : null}
      {gallery.length ? (
        <>
          <SectionTitle>Photos</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={landscape ? undefined : { marginHorizontal: -20, paddingLeft: 20 }}>
            {gallery.map((m) => (
              <View key={m.position} style={{ width: 260, gap: 8 }}>
                <Image source={{ uri: m.variants['800'] ?? m.variants['400'] }} accessibilityLabel={m.altText} style={{ width: 260, height: 180, borderRadius: 20 }} resizeMode="cover" />
                {m.caption || m.credit ? <Text variant="caption" tone="muted">{[m.caption, m.credit && `Photo: ${m.credit}`].filter(Boolean).join(' · ')}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
      {detail.description ? <><SectionTitle>About</SectionTitle><Text variant="body">{detail.description}</Text></> : <View style={{ marginTop: 16 }}><Text variant="body">{detail.summary}</Text></View>}
  </>);
  const actionsEl = (<>
      <View style={{ marginTop: 28, gap: 12 }}>
        {pack ? (
          <Button variant="soft" icon={Trash2} label="Remove offline copy" trailing={mb(pack.bytes)} onPress={dropPack} />
        ) : (
          <Button variant="soft" icon={Download} label={downloading[slug] ? 'Saving…' : typeof tiles === 'number' ? `Saving map ${tiles}%` : 'Save for offline'} disabled={!!downloading[slug] || typeof tiles === 'number'} onPress={getPack} />
        )}
        <Button variant="soft" icon={Bookmark} label={isSaved ? 'Saved. Tap to remove' : token ? 'Save this trail' : 'Sign in to save'} disabled={busy} onPress={toggleSave} />
        <Button variant="soft" icon={Stamp} label={iRode ? "Ridden. Tap to undo" : token ? "I've ridden this" : 'Sign in to mark as ridden'} disabled={busy} onPress={() => void toggleRidden()} />
        {start ? <Button variant="soft" icon={Navigation} label="Open in Google Maps" onPress={openInMaps} /> : null}
        <Button variant="soft" icon={CalendarPlus} label="Plan a trip" arrow onPress={() => setPlanning(true)} />
        <Button label="Ride this trail" onPress={() => setRideChoice(true)} />
      </View>
      {problem ? <Text variant="label" tone="stop" style={{ marginTop: 16 }}>{problem}</Text> : null}
  </>);

  return (
    <Screen overlay={<>
      <Sheet open={rideChoice} title="Ride this trail" onClose={() => setRideChoice(false)}>
        <Text variant="label" tone="muted">Ride it now, or pick a day and a start time and you get a reminder before it starts.</Text>
        <Button label="Ride now" onPress={() => { planTrip(detail); setRideChoice(false); router.push('/ride'); }} />
        <Button variant="soft" label="Pick a date and time" onPress={() => { setRideChoice(false); setPlanning(true); }} />
      </Sheet>
      <PlanTripSheet open={planning} onClose={() => setPlanning(false)} name={detail.name} route={{ kind: 'trail', slug, name: detail.name, status: h.status, statusLabel: h.label }} onCreated={(tripId) => router.push(`/trips/${tripId}`)} />
      {comments.overlay}
    </>}>
      <BackHeader title="Trails" />
      {t.fromOffline ? <Card style={{ marginBottom: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon icon={CloudOff} tone="muted" /><Text variant="label" tone="muted" style={{ flex: 1 }}>Showing your downloaded copy, saved {formatDate(new Date(pack?.savedAt ?? Date.now()).toISOString().slice(0, 10))}. Access may have changed.</Text></Card> : null}
      {landscape ? <Columns left={<>{topEl}{actionsEl}</>} right={<>{routeEl}{comments.body}</>} /> : <>{topEl}{routeEl}{actionsEl}{comments.body}</>}
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[5] }}>{tiles === true ? 'Offline saves the details, access, route and map.' : 'Offline saves the details, access and route. Map tiles still need a connection.'}</Text>
    </Screen>
  );
}
