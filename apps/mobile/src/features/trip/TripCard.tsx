import { View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { todayISO } from '@/lib/dates';
import { rangeText, tripStatus, whenText } from '@/lib/tripPlan';
import { useTodos } from '@/store/todos';
import type { Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { ProgressBar } from '@/ui/HeroCard';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Text } from '@/ui/Text';

/** The trip on the Dash: when it is, how many days, the access status of its first trail, and how much is packed. Tap for the trip. */
export function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const today = todayISO();
  const status = tripStatus(trip, today);
  const todos = useTodos((s) => s.todos).filter((t) => t.tripId === trip.id);
  const done = todos.filter((t) => t.done).length;
  const trail = trip.days?.find((d) => d.route?.kind === 'trail')?.route;
  const eyebrow = status === 'active' ? `In progress · ${whenText(trip, today)}` : status === 'ready' ? 'Trip day' : `Next trip · ${whenText(trip, today)}`;
  return (
    <ScalePressable scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${trip.name}, ${eyebrow}. Open the trip`} onPress={onOpen}>
      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Icon icon={CalendarClock} size={20} tone="muted" />
          <Text variant="label" tone="muted">{eyebrow}</Text>
        </View>
        <Text variant="hero">{trip.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
          <Text variant="data" tone="muted">{rangeText(trip)} · {trip.days?.length ?? 1} {(trip.days?.length ?? 1) === 1 ? 'day' : 'days'}</Text>
          {trail?.kind === 'trail' ? <StatusChip status={trail.status} label={trail.statusLabel} /> : null}
        </View>
        {todos.length ? (
          <View style={{ gap: space[2] }}>
            <ProgressBar value={done} max={todos.length} label="Packed" />
            <Text variant="label" tone="muted">{done} of {todos.length} packed</Text>
          </View>
        ) : null}
      </Card>
    </ScalePressable>
  );
}
