import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ArrowDown, ArrowUp, X } from 'lucide-react-native';
import { RouteCheck } from '@/features/RouteCheck';
import type { LatLng } from '@/lib/geo';
import { uid } from '@/lib/id';
import type { Place } from '@/lib/placeSearch';
import { roadRoute } from '@/lib/roadRoute';
import { planRoute, type PlannedRoute } from '@/lib/routePlan';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { moveWaypoint, routeNameFor, type Waypoint } from '@/lib/waypoints';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { OsmMap } from '@/ui/map/OsmMap';
import { Text } from '@/ui/Text';
import { PlaceSearch } from './PlaceSearch';

/** Build a route from stops: search for places or tap the map, put them in order, save. */
export function RouteBuilder({ onSave }: { onSave: (r: { name: string; points: LatLng[]; distanceKm: number }) => void }) {
  const [stops, setStops] = useState<Waypoint[]>([]);
  const [focus, setFocus] = useState<LatLng>();
  const [name, setName] = useState('');
  const [road, setRoad] = useState<PlannedRoute>();
  const [routing, setRouting] = useState(false);
  const [straight, setStraight] = useState(false);
  const pins = stops.map((s) => s.point);
  const where = pins.map((p) => `${p.lat},${p.lng}`).join(';');

  // Follow the roads between the stops. Until that arrives, or if it cannot, the stops are joined by straight lines.
  useEffect(() => {
    setRoad(undefined); setStraight(false);
    if (pins.length < 2) { setRouting(false); return; }
    setRouting(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      roadRoute(pins, ctl.signal)
        .then((r) => { setRoad(r); setRouting(false); })
        .catch((e: Error) => { if (e.name === 'AbortError') return; setStraight(true); setRouting(false); });
    }, 400);
    return () => { clearTimeout(t); ctl.abort(); };
    // `where` stands for the stops' positions; reordering or moving one reruns this, renaming never does.
  }, [where]);

  const planned = road ?? (pins.length >= 2 ? planRoute(pins) : undefined);
  const points = planned?.points ?? pins;
  const suggested = routeNameFor(stops);

  const addPlace = (p: Place) => { setStops((s) => [...s, { id: uid(), point: p.point, name: p.name, detail: p.detail }]); setFocus(p.point); };
  const addPin = (point: LatLng) => setStops((s) => [...s, { id: uid(), point }]);
  const save = () => {
    if (!planned) return;
    onSave({ name: name.trim() || suggested || 'My route', points: planned.points, distanceKm: +planned.distanceKm.toFixed(1) });
    setStops([]); setName('');
  };

  return (
    <View style={{ gap: space[3] }}>
      <PlaceSearch near={stops[stops.length - 1]?.point} onPick={addPlace} />
      <OsmMap height={280} radius={24} line={points} waypoints={pins} focus={focus} onTap={addPin} />
      <Text variant="label" tone="muted">{stops.length ? 'Search for the next place, or tap the map to drop a point.' : 'Search for a place above, or tap the map to drop a point. Add at least two.'}</Text>
      {stops.length ? (
        <ListCard>
          {stops.map((s, i) => (
            <Row key={s.id} label={`${i + 1}. ${s.name ?? 'Point on the map'}`} sub={s.detail || (s.name ? undefined : 'Dropped on the map')} chevron={false}
              right={<View style={{ flexDirection: 'row' }}>
                {i > 0 ? <IconButton plain size={40} icon={ArrowUp} label={`Move ${s.name ?? 'point'} up`} onPress={() => setStops((l) => moveWaypoint(l, i, i - 1))} /> : null}
                {i < stops.length - 1 ? <IconButton plain size={40} icon={ArrowDown} label={`Move ${s.name ?? 'point'} down`} onPress={() => setStops((l) => moveWaypoint(l, i, i + 1))} /> : null}
                <IconButton plain size={40} icon={X} tone="muted" label={`Remove ${s.name ?? 'point'}`} onPress={() => setStops((l) => l.filter((x) => x.id !== s.id))} />
              </View>} />
          ))}
        </ListCard>
      ) : null}
      {planned ? <Text variant="label" tone="muted">{routing ? 'Finding the roads…' : `${asText(distanceKm(planned.distanceKm))} · about ${asText(durationParts(planned.etaMin * 60))} riding${road ? '' : straight ? ', in straight lines. The road service could not be reached.' : ''}`}</Text> : null}
      {stops.length ? <View style={{ flexDirection: 'row' }}><ChoiceChip label="Clear all" onPress={() => setStops([])} /></View> : null}
      {planned ? (
        <>
          <Field label="Name" value={name} onChangeText={setName} placeholder={suggested || 'Sunday loop'} maxLength={80} />
          <RouteCheck line={planned.points} />
          <Button label="Save and ride this route" disabled={routing} onPress={save} />
        </>
      ) : null}
    </View>
  );
}
