import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Map as MapIcon, Plus, Route as RouteIcon, Trash2, X } from 'lucide-react-native';
import { headline } from '@/api/status';
import type { TrailSummary } from '@/api/types';
import { SHOW_SAVED_ROUTES } from '@/lib/savedRoutes';
import { type TripRoute } from '@/lib/tripPlan';
import { STOP_KINDS, addStop, moveStop, removeStop, type StopKind } from '@/lib/tripStops';
import { uid } from '@/lib/id';
import { asText, distanceKm } from '@/lib/units';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrips, type Trip } from '@/store/trips';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadow, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusChip, ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';

/** The trip route a picked published trail becomes. */
export function trailRoute(t: TrailSummary): TripRoute {
  const h = headline(t);
  return { kind: 'trail', slug: t.slug, name: t.name, status: h.status, statusLabel: h.label };
}

/**
 * What a day of a trip holds: a note, the places to go in order, and the route. A one-day trip shows this straight on its page and
 * calls the places "destinations"; a longer trip shows it for one day at a time in a sheet, where they are "stops".
 */
export function TripDayFields({ trip, index, single, onChooseTrail, onNavigate }: { trip: Trip; index: number; single: boolean; onChooseTrail: () => void; onNavigate?: () => void }) {
  const day = trip.days?.[index];
  const router = useRouter();
  const routes = useMyRoutes((s) => s.routes);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<StopKind>('fuel');
  const { c } = useTheme();
  if (!day) return null;
  const noun = single ? 'destination' : 'stop';
  const stops = day.stops ?? [];
  const save = (next: typeof stops) => useTrips.getState().setDay(trip.id, day.id, { stops: next });
  const add = () => {
    const n = name.trim();
    if (!n) return;
    save(addStop(stops, { id: uid(), name: n.slice(0, 60), kind }));
    setName('');
  };
  const setRoute = (route: TripRoute | undefined) => useTrips.getState().setDay(trip.id, day.id, { route });
  return (
    <>
      <Field label="Note" value={day.note ?? ''} onChangeText={(note) => useTrips.getState().setDay(trip.id, day.id, { note })} placeholder={single ? 'Breakfast first, back by 4' : 'Sleep in Manali'} maxLength={120} />

      <Text variant="labelMedium">{single ? 'Destinations' : 'Stops'}</Text>
      {stops.length ? (
        <ListCard>
          {stops.map((s, i) => (
            <Row key={s.id} label={s.name} sub={STOP_KINDS.find((k) => k.kind === s.kind)?.label}
              right={<View style={{ flexDirection: 'row' }}>
                <IconButton icon={ArrowUp} label={`Move ${s.name} up`} onPress={() => save(moveStop(stops, s.id, -1))} plain tone={i === 0 ? 'muted' : 'ink'} />
                <IconButton icon={ArrowDown} label={`Move ${s.name} down`} onPress={() => save(moveStop(stops, s.id, 1))} plain tone={i === stops.length - 1 ? 'muted' : 'ink'} />
                <IconButton icon={Trash2} label={`Remove ${s.name}`} onPress={() => save(removeStop(stops, s.id))} plain tone="muted" />
              </View>} chevron={false} />
          ))}
        </ListCard>
      ) : <Text variant="label" tone="muted">{single ? 'Add the places you want to go, in order.' : 'No stops yet.'}</Text>}

      {/* A card that floats above the list: it is the next row of the list, and the button says so. */}
      {/* The shadow sits on a wrapper: a view that clips its corners (the Card) draws no shadow on iOS. */}
      <View style={{ borderRadius: radius.card, backgroundColor: c.card, ...shadow.lift }}>
      <Card style={{ gap: space[3] }}>
        <Text variant="bodyMedium">{`Add a ${noun}`}</Text>
        <Field label="Name" value={name} onChangeText={setName} placeholder={single ? 'Coffee at Nandi Hills' : 'Fuel at Madikeri'} maxLength={60} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {STOP_KINDS.map((k) => <ChoiceChip key={k.kind} label={k.label} selected={kind === k.kind} onPress={() => setKind(k.kind)} />)}
        </View>
        <Button icon={Plus} label={`Add ${noun} to the list`} disabled={!name.trim()} onPress={add} />
      </Card>
      </View>

      <Text variant="labelMedium">Route</Text>
      <ListCard>
        {day.route ? <Row icon={RouteIcon} label={day.route.name} sub="The route for this day"
          right={day.route.kind === 'trail' ? <StatusChip status={day.route.status} label={day.route.statusLabel} /> : undefined} chevron={false} /> : null}
        <Row icon={MapIcon} label="Choose a trail" sub="Pick one of the published trails" onPress={onChooseTrail} />
        <Row icon={RouteIcon} label="Make a new route" sub="Draw it on the map or import a GPX file" onPress={() => { onNavigate?.(); router.push('/plan'); }} />
      </ListCard>
      {day.route ? <Button variant="soft" icon={X} label={`Remove route: ${day.route.name}`} onPress={() => setRoute(undefined)} /> : null}
      {SHOW_SAVED_ROUTES && routes.length ? (
        <>
          <Text variant="labelMedium">Your saved routes</Text>
          <Text variant="caption" tone="muted">Routes you drew or imported on this phone.</Text>
          <ListCard>
            {routes.map((r) => <Row key={r.id} icon={RouteIcon} label={r.name} sub={day.route?.kind === 'mine' && day.route.id === r.id ? 'Chosen' : undefined} value={asText(distanceKm(r.distanceKm))} onPress={() => setRoute({ kind: 'mine', id: r.id, name: r.name })} />)}
          </ListCard>
        </>
      ) : null}
    </>
  );
}
