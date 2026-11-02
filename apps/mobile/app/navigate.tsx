import { useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownRight, ArrowDownLeft, ArrowUp, ArrowUpLeft, ArrowUpRight, ArrowLeft, ArrowRight, MapPin, RefreshCw, Undo2, type LucideIcon } from 'lucide-react-native';
import { bearing, haversine, type LatLng } from '@/lib/geo';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { OFF_ROUTE_AFTER_MS, OFF_ROUTE_M } from '@/lib/routeFollow';
import { asText, distanceKm, shortDistanceM, durationParts, withUnit } from '@/lib/units';
import { fetchDirections, navigateStep, type Directions, type TurnKind } from '@/lib/turnByTurn';
import { nowMs } from '@/lib/clock';
import { useLocation } from '@/store/location';
import { Theme, useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OsmMap } from '@/ui/map/OsmMap';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

const TURN_ICON: Record<TurnKind, LucideIcon> = {
  straight: ArrowUp, left: ArrowLeft, right: ArrowRight, 'slight left': ArrowUpLeft, 'slight right': ArrowUpRight,
  'sharp left': ArrowDownLeft, 'sharp right': ArrowDownRight, uturn: Undo2, roundabout: RefreshCw, arrive: MapPin,
};
/** The way the phone moves is taken from two fixes at least this far apart: a stopped phone's GPS drifts. */
const HEADING_MIN_M = 15;

/** In-app turn-by-turn to a point: the road from where the rider is, the next turn and how far it is, and a new road when they leave it. */
export default function NavigateToPoint() {
  return <Theme mode="dark"><Body /></Theme>;
}

function Body() {
  const router = useRouter();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const to = useMemo<LatLng | undefined>(() => (Number.isFinite(Number(params.lat)) && Number.isFinite(Number(params.lng)) && params.lat && params.lng ? { lat: Number(params.lat), lng: Number(params.lng) } : undefined), [params.lat, params.lng]);
  const fix = useLocation((s) => s.fix);
  const here = useMemo<LatLng | undefined>(() => (fix ? { lat: fix.lat, lng: fix.lng } : undefined), [fix?.lat, fix?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dir, setDir] = useState<Directions>();
  const [failed, setFailed] = useState(false);
  const asking = useRef(false);
  const offSince = useRef<number | null>(null);
  const lastFrom = useRef<LatLng | undefined>(undefined);
  const [heading, setHeading] = useState<number>();

  useEffect(() => useLocation.getState().acquire(), []);
  useEffect(() => { void activateKeepAwakeAsync('navigate'); return () => { void deactivateKeepAwake('navigate'); }; }, []);

  const ask = (from: LatLng) => {
    if (!to || asking.current) return;
    asking.current = true; setFailed(false);
    fetchDirections(from, to)
      .then((d) => { setDir(d); offSince.current = null; })
      .catch(() => setFailed(true))
      .finally(() => { asking.current = false; });
  };
  const nav = dir && here ? navigateStep(dir, here) : undefined;
  // The first position asks for the road. A rider who stays more than 100 m from it for 20 s gets a new one from where they are.
  useEffect(() => {
    if (!here) return;
    if (lastFrom.current && haversine(lastFrom.current, here) >= HEADING_MIN_M) setHeading(bearing(lastFrom.current, here));
    if (!lastFrom.current || haversine(lastFrom.current, here) >= HEADING_MIN_M) lastFrom.current = here;
    if (!dir) { if (!failed) ask(here); return; }
    if (!nav || nav.arrived || nav.offM <= OFF_ROUTE_M) { offSince.current = null; return; }
    offSince.current ??= nowMs();
    if (nowMs() - offSince.current >= OFF_ROUTE_AFTER_MS) ask(here);
  }, [here]); // eslint-disable-line react-hooks/exhaustive-deps

  const openMaps = () => { if (to) void Linking.openURL(mapsDirectionsUrl(to)).catch(() => undefined); };
  const toNext = nav ? withUnit(shortDistanceM(nav.toNextM)) : undefined;
  const headline = !to ? 'No place to go to.' : nav?.arrived ? 'You have arrived.' : nav ? toNext : failed ? 'The road service could not be reached.' : here ? 'Finding the road…' : 'Finding your position…';
  const sentence = nav && !nav.arrived ? nav.next.text : undefined;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space[3] }}>
        <View style={{ borderRadius: radius.card, backgroundColor: c.card, padding: space[5], flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          {nav ? <Icon icon={TURN_ICON[nav.arrived ? 'arrive' : nav.next.kind]} size={size.pin} tone="accent" /> : null}
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="title" numberOfLines={2}>{headline}</Text>
            {sentence ? <Text variant="bodyMedium" tone="muted">{sentence}</Text> : null}
            {nav && nav.offM > OFF_ROUTE_M && !nav.arrived ? <Text variant="label" tone="caution">Off the road. Finding a new way…</Text> : null}
          </View>
        </View>
        <OsmMap height="fill" radius={radius.card} follow line={dir?.line} position={here} destination={to} heading={heading} dark />
        {nav && !nav.arrived ? <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{`${asText(distanceKm(nav.remainingM / 1000))} to go · about ${asText(durationParts(Math.max(1, Math.round((dir!.etaMin * 60 * nav.remainingM) / Math.max(1, dir!.totalM)))))}`}</Text> : null}
        <Button variant={nav?.arrived ? 'accent' : 'soft'} label={nav?.arrived ? 'Done' : 'End navigation'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <TextButton label="Open in Google Maps instead" onPress={openMaps} />
      </View>
    </Screen>
  );
}
