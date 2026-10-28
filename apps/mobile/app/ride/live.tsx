import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Pause, Phone, Play, Square, Siren } from 'lucide-react-native';
import { Banner } from '@/ui/Banner';
import { clock } from '@/lib/format';
import { finishRide } from '@/lib/finishRide';
import { breaksOf, splitSegments } from '@/lib/track';
import { useProfile } from '@/store/profile';
import { useRecorder } from '@/store/recorder';
import { Theme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
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
import { fixed, radius } from '@/theme/tokens';
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
  const planned = useTrailStore((s) => s.nextTrip);
  const routeLine = useRouteLine(planned?.slug);
  const fix = useLocation((s) => s.fix);
  const gpsError = useLocation((s) => s.error);
  const lastPoint = r.points[r.points.length - 1];
  const breaks = useMemo(() => breaksOf(splitSegments(r.points)), [r.points.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // The dot follows the live GPS fix straight away; on a simulated ride it follows the simulated track.
  const last = r.source === 'sim' ? lastPoint : fix ? { lat: fix.lat, lng: fix.lng } : lastPoint;
  const [, tick] = useState(0);
  const [sos, setSos] = useState(false);
  const stopping = useRef(false);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (r.status === 'idle' && !stopping.current) router.replace('/'); }, [r.status, router]);

  const stop = async () => {
    stopping.current = true;
    // If the ride could not be written, it stays on the phone and Home offers it back for saving.
    const id = await finishRide().catch(() => undefined);
    router.replace(id ? `/story/${id}` : '/');
  };

  const stats = (
    <Card style={{ gap: landscape ? 12 : 20, paddingVertical: landscape ? 16 : 20 }}>
      <View style={{ gap: 4 }}>
        <Text variant="label" tone="muted">Distance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text variant="live" style={landscape ? { fontSize: 56, lineHeight: 60 } : undefined}>{(r.meters / 1000).toFixed(1)}</Text><Text variant="bodyMedium" tone="muted">km</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}><Text variant="label" tone="muted">{r.paused ? 'Paused' : 'Time'}</Text><Text variant="liveSecondary" style={landscape ? { fontSize: 32, lineHeight: 36 } : undefined}>{clock(r.elapsedMs(Date.now()))}</Text></View>
        <View style={{ flex: 1 }}><Text variant="label" tone="muted">Speed</Text><Text variant="liveSecondary" style={landscape ? { fontSize: 32, lineHeight: 36 } : undefined}>{r.paused ? 0 : Math.round(r.speedKmh)}</Text></View>
      </View>
    </Card>
  );
  const ageSec = r.lastFixAt ? Math.max(0, Math.round((Date.now() - r.lastFixAt) / 1000)) : 0;
  // A stopped phone gets no fixes (5 m distance filter), so only a rider who was moving can have lost the signal.
  const lostSignal = r.source === 'gps' && !r.paused && r.moving && r.lastFixAt > 0 && ageSec >= 15;
  // The background task is what keeps recording with the screen locked; tell the rider when it is not running.
  const foregroundOnly = r.source === 'gps' && !r.paused && Platform.OS !== 'web' && !r.backgrounded && Date.now() - r.startedAt > 3000;
  const status = (
    <View style={{ gap: 8 }}>
      {r.error ? <Banner eyebrow="Storage" title={r.error} /> : null}
      {lostSignal ? <Banner eyebrow="GPS" title="Lost GPS signal, still recording" /> : null}
      {foregroundOnly ? <Banner eyebrow="Heads up" title="Recording stops if you lock the phone. Tap to allow Always in Settings." onPress={() => void Linking.openSettings()} /> : null}
      {r.source === 'gps' && !fix && gpsError ? <Text variant="label" tone="caution">{gpsError}</Text>
        : <Text variant="label" tone="muted" style={{ textAlign: landscape ? 'left' : 'center' }}>{r.paused ? 'Paused. Nothing is recorded until you resume.' : r.lastFixAt ? `Last fix ${ageSec} s ago${fix?.accuracy ? ` · GPS ±${Math.round(fix.accuracy)} m` : ''}` : 'Waiting for a GPS fix…'}</Text>}
    </View>
  );
  const pauseBtn = (h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={r.paused ? 'Resume ride' : 'Pause ride'} onPress={() => void (r.paused ? r.resume() : r.pause())} style={({ pressed }) => ({ flex: 1, minHeight: h, borderRadius: radius.control, backgroundColor: r.paused ? c.accent : pressed ? fixed.darkPressed : c.raised, alignItems: 'center', justifyContent: 'center', gap: 6 })}>
      <Icon icon={r.paused ? Play : Pause} size={h > 70 ? 26 : 22} />
      <Text variant="labelMedium" style={r.paused ? { color: c.accentInk } : undefined}>{r.paused ? 'Resume' : 'Pause'}</Text>
    </Pressable>
  );
  const waypointBtn = (h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Drop a waypoint" onPress={() => void useRecorder.getState().addWaypoint()} style={({ pressed }) => ({ flex: 1, minHeight: h, borderRadius: radius.control, backgroundColor: pressed ? fixed.darkPressed : c.raised, alignItems: 'center', justifyContent: 'center', gap: 6 })}>
      <Icon icon={Flag} size={h > 70 ? 26 : 22} /><Text variant="labelMedium">Waypoint{r.waypoints.length ? ` · ${r.waypoints.length}` : ''}</Text>
    </Pressable>
  );
  const sosBtn = (h: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={() => setSos(true)} style={{ flex: 1, minHeight: h, borderRadius: radius.control, borderWidth: 1.5, borderColor: c.stop, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={Siren} tone="stop" size={22} /><Text variant="bodyMedium" tone="stop">SOS</Text>
    </Pressable>
  );

  return (
    <Screen scroll={false} overlay={
      <Sheet open={sos} title="SOS" onClose={() => setSos(false)}>
        <Text variant="label" tone="muted">Call for help. This does not replace emergency services.</Text>
        <Button label="Call 112 (emergency)" variant="danger" icon={Phone} onPress={() => Linking.openURL('tel:112')} />
        {contacts.map((c) => <Button key={c.id} variant="soft" icon={Phone} label={`${c.name}${c.primary ? ' (main)' : ''}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} />)}
        {contacts.length === 0 ? <Text variant="label" tone="muted">No emergency contacts yet. Add them under You, Documents and emergency.</Text> : null}
      </Sheet>
    }>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: r.paused ? c.muted : c.stop }} />
          <Text variant="labelMedium" tone="muted">{r.paused ? 'Paused' : r.source === 'sim' ? 'Recording (simulated)' : 'Recording'}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ minHeight: 48, justifyContent: 'center' }}><Text variant="labelMedium" tone="accent">Minimise</Text></Pressable>
      </View>
      {landscape ? (
        // Turned on its side (a handlebar mount): numbers on the left, map and big buttons on the right, no scrolling.
        <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, gap: 12 }}>{stats}{status}</View>
          <View style={{ flex: 1.25, gap: 12 }}>
            <OsmMap height={Math.max(110, height - 48 - 16 - 76 - 12 - 12 - 16)} radius={radius.card} dark follow line={routeLine} track={r.points} trackBreaks={breaks} position={last} waypoints={r.waypoints} />
            <View style={{ flexDirection: 'row', gap: 12 }}>{pauseBtn(64)}{waypointBtn(64)}<HoldButton label="Hold to stop" icon={Square} color={fixed.stopFill} minHeight={64} onComplete={stop} />{sosBtn(64)}</View>
          </View>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 8 }}>{stats}</View>
          <View style={{ marginTop: 12 }}>
            <OsmMap height={200} radius={radius.card} dark follow line={routeLine} track={r.points} trackBreaks={breaks} position={last} waypoints={r.waypoints} />
          </View>
          <View style={{ marginTop: 12 }}>{status}</View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>{pauseBtn(88)}{waypointBtn(88)}<HoldButton label="Hold to stop" icon={Square} color={fixed.stopFill} onComplete={stop} /></View>
          <View style={{ marginTop: 12, flexDirection: 'row' }}>{sosBtn(56)}</View>
        </>
      )}
    </Screen>
  );
}
