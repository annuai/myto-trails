import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Route as RouteIcon, X } from 'lucide-react-native';
import { headline } from '@/api/status';
import { useTrailSearch } from '@/api/useApi';
import { formatDate } from '@/lib/dates';
import { dayDate, type TripRoute } from '@/lib/tripPlan';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrips, type Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { ListCard, Row } from '@/ui/ListCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** One day of a trip: where it goes (a route of the rider's own, or a published trail) and a note such as where to sleep. */
export function TripDaySheet({ trip, index, onClose }: { trip: Trip; index: number | null; onClose: () => void }) {
  const day = index === null ? undefined : trip.days?.[index];
  const router = useRouter();
  const routes = useMyRoutes((s) => s.routes);
  const [q, setQ] = useState('');
  const found = useTrailSearch(q);
  const set = (route: TripRoute | undefined) => { if (day) { useTrips.getState().setDay(trip.id, day.id, { route }); } };
  const pick = (route: TripRoute) => { set(route); onClose(); };
  return (
    <Sheet open={!!day} title={day && trip.startDate ? `Day ${index! + 1} · ${formatDate(dayDate(trip.startDate, index!))}` : 'Day'} onClose={onClose}>
      {day ? (
        <>
          <Field label="Note" value={day.note ?? ''} onChangeText={(note) => useTrips.getState().setDay(trip.id, day.id, { note })} placeholder="Sleep in Manali" maxLength={120} />
          {day.route ? <Button variant="soft" icon={X} label={`Remove route: ${day.route.name}`} onPress={() => { set(undefined); }} /> : null}
          {routes.length ? (
            <>
              <Text variant="labelMedium">Your routes</Text>
              <ListCard>
                {routes.map((r) => <Row key={r.id} icon={RouteIcon} label={r.name} value={`${r.distanceKm} km`} onPress={() => pick({ kind: 'mine', id: r.id, name: r.name })} />)}
              </ListCard>
            </>
          ) : null}
          <Field label="A published trail" value={q} onChangeText={setQ} placeholder="Search by name or place" />
          <View style={{ gap: space[2] }}>
            {(found.data?.items ?? []).slice(0, 5).map((t) => {
              const h = headline(t);
              return <Button key={t.slug} variant="soft" label={t.name} onPress={() => pick({ kind: 'trail', slug: t.slug, name: t.name, status: h.status, statusLabel: h.label })} />;
            })}
          </View>
          <Button variant="soft" label="Make a new route" onPress={() => { onClose(); router.push('/plan'); }} />
        </>
      ) : null}
    </Sheet>
  );
}
