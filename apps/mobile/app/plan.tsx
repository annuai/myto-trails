import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Download, FileUp, Link2, Play, Trash2, Undo2 } from 'lucide-react-native';
import { createSharedRoute, deleteSharedRoute } from '@/api/sharedRoutes';
import { RouteCheck } from '@/features/RouteCheck';
import { elevationProfile } from '@/lib/elevation';
import { exportGpx } from '@/lib/exportGpx';
import { pathLength } from '@/lib/geo';
import { buildGpx } from '@/lib/gpx';
import { parseGpx } from '@/lib/gpxImport';
import { planRoute } from '@/lib/routePlan';
import { buildSharedRoute, sharedIdOf } from '@/lib/shareRoute';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useMyRoutes, type MyRoute } from '@/store/myRoutes';
import { useTrailStore } from '@/store/trails';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { OsmMap } from '@/ui/map/OsmMap';
import { ElevationChart } from '@/ui/ElevationChart';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import type { LatLng } from '@/lib/geo';

const km = (r: { distanceKm: number }) => asText(distanceKm(r.distanceKm));

/** Pick, build or import the route the next ride follows. A route is kept on this phone; sharing it as a link is a choice. */
export default function Plan() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const { routes, followId, add, remove, follow, setShared } = useMyRoutes();
  const trip = useTrailStore((s) => s.nextTrip);
  const [tapped, setTapped] = useState<LatLng[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState<MyRoute>();
  const [problem, setProblem] = useState<string>();
  const share = useAction();
  const planned = tapped.length >= 2 ? planRoute(tapped) : undefined;
  const followed = routes.find((r) => r.id === followId);

  const save = () => {
    if (!planned) return;
    const id = add({ name: name.trim() || 'My route', points: planned.points, distanceKm: planned.distanceKm });
    follow(id); setTapped([]); setName('');
  };
  const importGpx = async () => {
    setProblem(undefined);
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (r.canceled) return;
      const a = r.assets[0]!;
      const text = Platform.OS === 'web' ? await a.file!.text() : await new File(a.uri).text();
      const g = parseGpx(text);
      const id = add({ name: g.name || a.name.replace(/\.gpx$/i, '') || 'Imported route', points: g.points, distanceKm: +(pathLength(g.points) / 1000).toFixed(1) });
      follow(id);
    } catch (e) { setProblem(e instanceof Error ? e.message : 'That file could not be read.'); }
  };
  const shareLink = async (r: MyRoute) => {
    if (!token) return setProblem('Sign in to share a route as a link.');
    const body = buildSharedRoute({ name: r.name, points: r.points });
    if (!body) return setProblem('This route is too short to share. The first and last 300 m are always left out, so nobody can see where you live.');
    const made = await share.run(() => createSharedRoute(token, body));
    if (!made) return;
    setShared(r.id, made.value.url);
    await Share.share({ message: `${r.name} on Myto Moto: ${made.value.url}` }).catch(() => undefined);
  };

  return (
    <Screen overlay={
      <Sheet open={!!open} title={open?.name ?? ''} onClose={() => setOpen(undefined)}>
        {open ? (() => {
          const profile = elevationProfile(open.points);
          const gain = profile?.gainM;
          return (<>
            <Text variant="label" tone="muted">{km(open)}{gain ? ` · ${Math.round(gain)} m climb` : ''}</Text>
            {profile ? <ElevationChart samples={profile.samples} /> : null}
            <Button icon={Play} label="Ride this route" onPress={() => { follow(open.id); setOpen(undefined); router.back(); }} />
            <Button variant="soft" icon={Link2} label={open.sharedUrl ? 'Share the link again' : 'Share as a link'} disabled={share.busy} onPress={() => (open.sharedUrl ? void Share.share({ message: `${open.name} on Myto Moto: ${open.sharedUrl}` }) : void shareLink(open))} />
            <Button variant="soft" icon={Download} label="Export GPX file" onPress={() => void exportGpx(open.name, buildGpx(open.name, open.points))} />
            <RouteCheck line={open.points} />
            <Button variant="danger" icon={Trash2} label="Delete this route" onPress={() => { if (token && open.sharedUrl) void deleteSharedRoute(token, sharedIdOf(open.sharedUrl)).catch(() => undefined); remove(open.id); setOpen(undefined); }} />
            {share.problem ? <Text variant="label" tone="stop">{share.problem}</Text> : null}
          </>);
        })() : null}
      </Sheet>
    }>
      <BackHeader />
      <PageTitle sub="The route your next ride follows. Going off it for 20 seconds buzzes your phone.">Route</PageTitle>
      <ListCard>
        <Row label="Following" value={followed?.name ?? trip?.name ?? 'Nothing'} chevron={false} />
        {followed ? <Row label="Stop following my route" onPress={() => follow(undefined)} chevron={false} /> : null}
        <Row label="Choose a published trail" onPress={() => router.push('/trails')} />
      </ListCard>

      <SectionTitle>Build a route</SectionTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: 12 }}>Tap the map to add points in order.</Text>
      <OsmMap height={280} radius={24} line={tapped} waypoints={tapped} onTap={(p) => setTapped((t) => [...t, p])} />
      <View style={{ marginTop: 12, gap: 12 }}>
        {planned ? <Text variant="label" tone="muted">{km(planned)} · about {asText(durationParts(planned.etaMin * 60))} at a steady pace</Text> : <Text variant="label" tone="muted">Add at least two points.</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ChoiceChip icon={Undo2} label="Undo" onPress={() => setTapped((t) => t.slice(0, -1))} />
          <ChoiceChip label="Clear" onPress={() => setTapped([])} />
        </View>
        {planned ? (
          <>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Sunday loop" maxLength={80} />
            <RouteCheck line={planned.points} />
            <Button label="Save and ride this route" onPress={save} />
          </>
        ) : null}
      </View>

      <SectionTitle>Import</SectionTitle>
      <Button variant="soft" icon={FileUp} label="Import a GPX file" onPress={() => void importGpx()} />
      {problem ? <Text variant="label" tone="stop" style={{ marginTop: 8 }}>{problem}</Text> : null}

      {routes.length ? (
        <>
          <SectionTitle>Your routes</SectionTitle>
          <ListCard>
            {routes.map((r) => <Row key={r.id} label={r.name} sub={r.id === followId ? 'Following' : undefined} value={km(r)} onPress={() => setOpen(r)} />)}
          </ListCard>
        </>
      ) : null}
    </Screen>
  );
}
