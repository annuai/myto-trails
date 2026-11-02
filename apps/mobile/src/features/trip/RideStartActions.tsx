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
  /** Called just before the way to the start is offered, so the trail is chosen as the ride's route. */
  onNavigate?: () => void;
  big?: boolean;
};

/**
 * The start control of a planned ride. Start always records, from wherever the rider sets off: the whole ride is recorded, not just the
 * trail. For a published trail Navigate to start point sits under it until the rider is at the start (within 150 m).
 */
export function RideStartActions({ route, label, onStart, onNavigate, big }: Props) {
  if (route?.kind !== 'trail') return <Button variant="accent" big={big} icon={Play} label={label} onPress={onStart} />;
  return <TrailStartActions slug={route.slug} label={label} onStart={onStart} onNavigate={onNavigate} big={big} />;
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

function TrailStartActions({ slug, label, onStart, onNavigate, big }: { slug: string; label: string; onStart: () => void; onNavigate?: () => void; big?: boolean }) {
  const s = useTrailStart(slug);
  const start = <Button variant="accent" big={big} icon={Play} label={label} onPress={onStart} />;
  // No start point (not loaded, not published): there is nothing to navigate to, so it is a plain start.
  if (!s.point) return start;
  if (s.reached) return <View style={{ gap: space[2] }}><Text variant="label" tone="muted">You are at the start.</Text>{start}</View>;
  return (
    <View style={{ gap: space[2] }}>
      {start}
      <Button variant="soft" big={big} icon={Navigation} label="Navigate to start point" onPress={() => { onNavigate?.(); s.navigate(); }} />
      <TrailHint slug={slug} />
    </View>
  );
}

/** Under a trail the rider has picked: how far the start is, and the way to get there. Nothing once they are at the start. Recording does not wait for it. */
export function TrailHint({ slug, onNavigate }: { slug: string; /** Shows a Navigate link too, for a screen that has no button for it. */ onNavigate?: () => void }) {
  const s = useTrailStart(slug);
  if (!s.point || s.reached) return null;
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{s.away === undefined ? 'The whole ride is recorded, from wherever you set off.' : `${distanceAway(s.away)} from the start. The whole ride is recorded, from wherever you set off.`}</Text>
      {onNavigate ? <TextButton label="Navigate to start point" onPress={() => { onNavigate(); s.navigate(); }} /> : null}
    </View>
  );
}

/** The single start button of a screen where the rider picks first. It always records. */
export function StartBar({ label, onStart }: Pick<Props, 'label' | 'onStart'> & { route?: TripRoute; onNavigate?: () => void }) {
  return <Button big variant="accent" label={label} onPress={onStart} />;
}
