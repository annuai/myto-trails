import { useState } from 'react';
import { asText, distanceKm } from '@/lib/units';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Route as RouteIcon, Trash2, X } from 'lucide-react-native';
import { headline } from '@/api/status';
import { useTrailSearch } from '@/api/useApi';
import { formatDate } from '@/lib/dates';
import { DEFAULT_START_TIME, dayDate, type TripRoute } from '@/lib/tripPlan';
import { STOP_KINDS, addStop, moveStop, removeStop, stopClock, type StopKind } from '@/lib/tripStops';
import { uid } from '@/lib/id';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrips, type Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** One day of a trip: where it goes (a route of the rider's own, or a published trail) and a note such as where to sleep. */
export function TripDaySheet({ trip, index, onClose }: { trip: Trip; index: number | null; onClose: () => void }) {
  const day = index === null ? undefined : trip.days?.[index];
  const router = useRouter();
  const routes = useMyRoutes((s) => s.routes);
  const [q, setQ] = useState('');
  const [stopName, setStopName] = useState('');
  const [stopKind, setStopKind] = useState<StopKind>('fuel');
  const [stopEta, setStopEta] = useState('');
  const found = useTrailSearch(q);
  const set = (route: TripRoute | undefined) => { if (day) { useTrips.getState().setDay(trip.id, day.id, { route }); } };
  const pick = (route: TripRoute) => { set(route); onClose(); };
  const stops = day?.stops ?? [];
  const saveStops = (next: typeof stops) => { if (day) useTrips.getState().setDay(trip.id, day.id, { stops: next }); };
  const addNewStop = () => {
    const name = stopName.trim();
    if (!name) return;
    const eta = Number(stopEta);
    saveStops(addStop(stops, { id: uid(), name: name.slice(0, 60), kind: stopKind, ...(stopEta.trim() && Number.isFinite(eta) && eta >= 0 ? { etaMin: Math.round(eta) } : {}) }));
    setStopName(''); setStopEta('');
  };
  return (
    <Sheet open={!!day} title={day && trip.startDate ? `Day ${index! + 1} · ${formatDate(dayDate(trip.startDate, index!))}` : 'Day'} onClose={onClose}>
      {day ? (
        <>
          <Field label="Note" value={day.note ?? ''} onChangeText={(note) => useTrips.getState().setDay(trip.id, day.id, { note })} placeholder="Sleep in Manali" maxLength={120} />
          <Text variant="labelMedium">Stops</Text>
          {stops.length ? (
            <ListCard>
              {stops.map((s, i) => (
                <Row key={s.id} label={s.name} sub={[STOP_KINDS.find((k) => k.kind === s.kind)?.label, stopClock(trip.startTime ?? DEFAULT_START_TIME, s.etaMin)].filter(Boolean).join(' · ')}
                  right={<View style={{ flexDirection: 'row' }}>
                    <IconButton icon={ArrowUp} label={`Move ${s.name} up`} onPress={() => saveStops(moveStop(stops, s.id, -1))} plain tone={i === 0 ? 'muted' : 'ink'} />
                    <IconButton icon={ArrowDown} label={`Move ${s.name} down`} onPress={() => saveStops(moveStop(stops, s.id, 1))} plain tone={i === stops.length - 1 ? 'muted' : 'ink'} />
                    <IconButton icon={Trash2} label={`Remove ${s.name}`} onPress={() => saveStops(removeStop(stops, s.id))} plain tone="muted" />
                  </View>} chevron={false} />
              ))}
            </ListCard>
          ) : null}
          <Field label="Add a stop" value={stopName} onChangeText={setStopName} placeholder="Fuel at Madikeri" maxLength={60} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {STOP_KINDS.map((k) => <ChoiceChip key={k.kind} label={k.label} selected={stopKind === k.kind} onPress={() => setStopKind(k.kind)} />)}
          </View>
          <Field label="Minutes into the day (optional)" value={stopEta} onChangeText={setStopEta} placeholder="90" keyboardType="number-pad" maxLength={4} />
          <Button variant="soft" label="Add stop" disabled={!stopName.trim()} onPress={addNewStop} />
          {day.route ? <Button variant="soft" icon={X} label={`Remove route: ${day.route.name}`} onPress={() => { set(undefined); }} /> : null}
          {routes.length ? (
            <>
              <Text variant="labelMedium">Your routes</Text>
              <ListCard>
                {routes.map((r) => <Row key={r.id} icon={RouteIcon} label={r.name} value={asText(distanceKm(r.distanceKm))} onPress={() => pick({ kind: 'mine', id: r.id, name: r.name })} />)}
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
          <Button label="Make a new route" onPress={() => { onClose(); router.push('/plan'); }} />
        </>
      ) : null}
    </Sheet>
  );
}
