import { useEffect } from 'react';
import { View } from 'react-native';
import { Navigation, Play } from 'lucide-react-native';
import { useTrail } from '@/api/useApi';
import { haversine } from '@/lib/geo';
import { atTrailStart, distanceAway, trailStartPoint } from '@/lib/trailStart';
import type { TripRoute } from '@/lib/tripPlan';
import { useLocation } from '@/store/location';
import { useNavigateChoice } from '@/store/navigateChoice';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

type Props = {
  /** The route being ridden. Only a published trail changes what the buttons do. */
  route?: TripRoute;
  /** What the start button says when it records: "Start trip", "Record day 2", "Start ride". */
  label: string;
  /** Begin recording. */
  onStart: () => void;
  /** Called just before Maps opens, so the trail is chosen as the ride's route. */
  onNavigate?: () => void;
  big?: boolean;
  /** Leave out the quiet "Start riding now instead": the Dash offers one way to start. */
  noSkip?: boolean;
};

/**
 * The start control of a planned ride. A plain route starts recording. A published trail does not: Navigate to start point is the
 * main button until the rider is at the start (within 150 m), then it becomes the start button. Riding before then stays one quiet tap away.
 */
export function RideStartActions({ route, label, onStart, onNavigate, big, noSkip }: Props) {
  if (route?.kind !== 'trail') return <Button variant="accent" big={big} icon={Play} label={label} onPress={onStart} />;
  return <TrailStartActions slug={route.slug} label={label} onStart={onStart} onNavigate={onNavigate} big={big} noSkip={noSkip} />;
}

/** Where a trail begins and how far the rider is from it. `navigate` opens the sheet that asks how to get there. */
function useTrailStart(slug: string) {
  const t = useTrail(slug);
  const fix = useLocation((s) => s.fix);
  useEffect(() => useLocation.getState().acquire(), []);
  const point = t.data ? trailStartPoint(t.data.detail) : undefined;
  const away = point && fix ? haversine({ lat: fix.lat, lng: fix.lng }, point) : undefined;
  const navigate = () => { if (point) useNavigateChoice.getState().ask(point); };
  return { point, away, reached: atTrailStart(away), navigate };
}

function TrailStartActions({ slug, label, onStart, onNavigate, big, noSkip }: { slug: string; label: string; onStart: () => void; onNavigate?: () => void; big?: boolean; noSkip?: boolean }) {
  const s = useTrailStart(slug);
  // No start point (not loaded, not published): there is nothing to navigate to, so it is a plain start.
  if (!s.point) return <Button variant="accent" big={big} icon={Play} label={label} onPress={onStart} />;
  if (s.reached) return <View style={{ gap: space[2] }}><Text variant="label" tone="muted">You are at the start.</Text><Button variant="accent" big={big} icon={Play} label={label} onPress={onStart} /></View>;
  return (
    <View style={{ gap: space[1] }}>
      <Button variant="accent" big={big} icon={Navigation} label="Navigate to start point" onPress={() => { onNavigate?.(); s.navigate(); }} />
      <TrailHint slug={slug} onStart={noSkip ? undefined : onStart} />
    </View>
  );
}

/** Under a trail the rider has picked: how far the start is, and the quiet way to ride before getting there. Nothing once they are at the start. */
export function TrailHint({ slug, onStart }: { slug: string; onStart?: () => void }) {
  const s = useTrailStart(slug);
  if (!s.point || s.reached) return null;
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{s.away === undefined ? 'Recording starts once you are at the start.' : `${distanceAway(s.away)} from the start. Recording starts once you are there.`}</Text>
      {onStart ? <TextButton label="Start riding now instead" onPress={onStart} /> : null}
    </View>
  );
}

/** The single start button of a screen where the rider picks first. A trail's button is Navigate until they are at the start. */
export function StartBar({ route, label, onStart, onNavigate }: Props) {
  if (route?.kind === 'trail') return <TrailStartBar slug={route.slug} label={label} onStart={onStart} onNavigate={onNavigate} />;
  return <Button big variant="accent" label={label} onPress={onStart} />;
}

function TrailStartBar({ slug, label, onStart, onNavigate }: { slug: string; label: string; onStart: () => void; onNavigate?: () => void }) {
  const s = useTrailStart(slug);
  if (!s.point || s.reached) return <Button big variant="accent" label={label} onPress={onStart} />;
  return <Button big variant="accent" icon={Navigation} label="Navigate to start point" onPress={() => { onNavigate?.(); s.navigate(); }} />;
}
