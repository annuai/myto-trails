import { useState } from 'react';
import { View } from 'react-native';
import { Fuel } from 'lucide-react-native';
import { daylightAdvice, daylightText } from '@/lib/daylight';
import { pathLength, type LatLng } from '@/lib/geo';
import { checkRoute, type RouteCheck as Result } from '@/lib/routeCheck';
import { rideability, rideabilityText } from '@/lib/weather';
import { useAction } from '@/lib/useAction';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

/** More than this without a pump is worth planning around: a full tank of a small bike goes about this far. */
const LONG_GAP_KM = 120;
const dayName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Asks for the fuel stops along a route and the weather where it starts. Nothing is fetched until the rider asks. */
export function RouteCheck({ line }: { line: LatLng[] }) {
  const [result, setResult] = useState<Result>();
  const { busy, problem, run } = useAction();
  const go = async () => {
    const r = await run(() => checkRoute(line));
    if (r) setResult(r.value);
  };
  return (
    <View style={{ gap: space[3] }}>
      <Button variant="soft" icon={Fuel} label={busy ? 'Checking…' : result ? 'Check again' : 'Check fuel, daylight and weather'} disabled={busy || line.length < 2} onPress={() => void go()} />
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      {result ? (
        <Card style={{ gap: space[3] }}>
          {result.tooLong ? <Text variant="label" tone="muted">This route is too long to check for fuel at once. Check it in sections.</Text>
            : result.fuel ? (
              <View style={{ gap: space[2] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="labelMedium">Longest stretch without fuel</Text>
                  <StatusChip status={result.fuel.longestGapKm > LONG_GAP_KM ? 'caution' : 'good'} label={`${Math.round(result.fuel.longestGapKm)} km`} />
                </View>
                <Text variant="label" tone="muted">{result.fuel.stops.length ? `${result.fuel.stops.length} fuel stops found on the map` : 'No fuel stops found on the map along this route'}, from km {Math.round(result.fuel.longestGap.fromKm)} to km {Math.round(result.fuel.longestGap.toKm)}. Fill up before it. Stops come from OpenStreetMap and may be out of date.</Text>
              </View>
            ) : <Text variant="label" tone="muted">Could not check fuel stops right now. Try again with a signal.</Text>}
          {result.days[0]?.sunsetMs ? (
            <View style={{ gap: space[2] }}>
              <Text variant="labelMedium">Daylight</Text>
              <Text variant="label" tone="muted">{daylightText(daylightAdvice({ distanceKm: pathLength(line) / 1000, sunsetMs: result.days[0].sunsetMs, now: Date.now() }), Date.now())}</Text>
            </View>
          ) : null}
          {result.days.length ? (
            <View style={{ gap: space[2] }}>
              <Text variant="labelMedium">Weather where it starts</Text>
              {result.days.slice(0, 4).map((d) => {
                const r = rideability(d);
                return (
                  <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
                    <View style={{ flex: 1 }}><Text variant="label">{dayName(d.date)} · {Math.round(d.minC)}–{Math.round(d.maxC)}°C</Text><Text variant="caption" tone="muted">{rideabilityText(r)}</Text></View>
                    <StatusChip status={r.level === 'good' ? 'good' : r.level === 'caution' ? 'caution' : 'stop'} label={r.level === 'avoid' ? 'Avoid' : r.level === 'caution' ? 'Careful' : 'Good'} />
                  </View>
                );
              })}
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}
