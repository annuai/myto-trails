import { useRouter } from 'expo-router';
import { Fuel } from 'lucide-react-native';
import { formatLitres, formatMoney, rideCost } from '@/lib/fuelCost';
import { asText, distanceKm, fromKm, speedKmh } from '@/lib/units';
import { useFuel } from '@/store/fuel';
import { useCurrency, useDistanceUnit } from '@/store/region';
import type { Ride } from '@/store/rides';
import { space } from '@/theme/tokens';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';

/**
 * What the ride cost in petrol, on the ride story. The rider's mileage is adjusted for the ride's average speed (stop-go traffic
 * and high speed use more), which is worked out afterwards from the saved ride, never while riding.
 */
export function RideFuelCard({ ride }: { ride: Pick<Ride, 'startedAt' | 'distanceKm' | 'durationSec' | 'sample' | 'id'> }) {
  const router = useRouter();
  const history = useFuel((s) => s.history);
  const currency = useCurrency();
  const unit = useDistanceUnit();
  if (ride.sample) return null;
  const cost = rideCost(ride, history);
  if (!cost) return (
    <Card style={{ gap: space[3] }}>
      <Text variant="label" tone="muted">Fuel</Text>
      <Text variant="body">Set your mileage and petrol price to see what each ride costs.</Text>
      <Button variant="soft" icon={Fuel} label="Set up fuel logs" onPress={() => router.push('/fuel')} />
    </Card>
  );
  const economy = `${+fromKm(cost.kmPerLitre).toFixed(1)} ${unit === 'mi' ? 'mi' : 'km'}/L`;
  return (
    <Card style={{ gap: space[1] }}>
      <Text variant="label" tone="muted">This ride cost about</Text>
      <Text variant="dataLarge">{formatMoney(cost.cost, currency)}</Text>
      <Text variant="label" tone="muted">{`${formatLitres(cost.litres)} · ${economy}${cost.avgKmh !== undefined ? ` · average ${asText(speedKmh(cost.avgKmh))}` : ''}`}</Text>
      <View style={{ marginTop: space[2] }}><Text variant="caption" tone="muted">An estimate. Your mileage is adjusted for how fast this ride was on average: stop-go traffic and high speed use more petrol, a steady 50 to 60 km/h the least. {asText(distanceKm(ride.distanceKm))} ridden.</Text></View>
    </Card>
  );
}
