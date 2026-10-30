import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { MAX_KM_PER_LITRE, MIN_KM_PER_LITRE, mileageFromFills, parseAmount } from '@/lib/fuelCost';
import { fromKm, toKm } from '@/lib/units';
import { useFuel } from '@/store/fuel';
import { useDistanceUnit } from '@/store/region';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Fill = { distance: string; litres: string };
const MAX_FILLS = 5;

/** What the rider does, in order. The page never guesses: the petrol that fills the tank again is exactly what the bike used. */
const STEPS = [
  { title: 'Fill the tank to the top', body: 'At a petrol pump, fill until the nozzle clicks off. Do not top it up after that.' },
  { title: 'Zero the trip meter', body: 'Reset trip A to 0. If your bike has none, write down the odometer reading.' },
  { title: 'Ride as you normally do', body: 'Use up at least a third of the tank. The longer the stretch, the more accurate: 100 km or more is good.' },
  { title: 'Fill to the top again', body: 'Same pump, same way, until the nozzle clicks off. Note the litres it took and the distance on the trip meter.' },
  { title: 'Divide', body: 'Mileage is the distance divided by the litres. Type both below and this page does it for you.' },
];

export default function Mileage() {
  const router = useRouter();
  const unit = useDistanceUnit();
  const label = unit === 'mi' ? 'miles' : 'km';
  const history = useFuel((s) => s.history);
  const [fills, setFills] = useState<Fill[]>([{ distance: '', litres: '' }]);
  const set = (i: number, patch: Partial<Fill>) => setFills((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const parsed = fills.map((f) => ({ km: parseAmount(f.distance) === null ? 0 : toKm(parseAmount(f.distance)!), litres: parseAmount(f.litres) ?? 0 }));
  const kmPerLitre = mileageFromFills(parsed);
  const used = parsed.filter((f) => f.km > 0 && f.litres > 0);
  const inRange = kmPerLitre !== null && kmPerLitre >= MIN_KM_PER_LITRE && kmPerLitre <= MAX_KM_PER_LITRE;
  const shown = kmPerLitre === null ? null : +fromKm(kmPerLitre).toFixed(1);
  const totalShown = +fromKm(used.reduce((n, f) => n + f.km, 0)).toFixed(1);
  const totalLitres = +used.reduce((n, f) => n + f.litres, 0).toFixed(2);

  const useIt = () => {
    if (kmPerLitre === null) return;
    const current = history[history.length - 1];
    // With a petrol price already saved the mileage is saved at once. Without one, the fuel page opens with it filled in, to add the price.
    if (current) { useFuel.getState().save(kmPerLitre, current.pricePerLitre); router.back(); } else router.replace(`/fuel?mileage=${kmPerLitre}`);
  };

  return (
    <Screen>
      <BackHeader title="Fuel logs" />
      <PageTitle sub="Fill to full, ride, fill to full again.">Find your mileage</PageTitle>
      <View style={{ gap: space[4] }}>
        <Card style={{ gap: space[4] }}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={{ flexDirection: 'row', gap: space[3] }}>
              <Text variant="bodyMedium" tone="muted">{i + 1}</Text>
              <View style={{ flex: 1, gap: space.half }}>
                <Text variant="bodyMedium">{s.title}</Text>
                <Text variant="label" tone="muted">{s.body}</Text>
              </View>
            </View>
          ))}
        </Card>

        <SectionTitle>Work it out</SectionTitle>
        {fills.map((f, i) => (
          <Card key={i} style={{ gap: space[3] }}>
            {fills.length > 1 ? <Text variant="label" tone="muted">{`Fill-up ${i + 1}`}</Text> : null}
            <Field label={`Distance ridden (${label})`} value={f.distance} onChangeText={(distance) => set(i, { distance })} keyboardType="decimal-pad" placeholder="280" onCard />
            <Field label="Petrol it took (litres)" value={f.litres} onChangeText={(litres) => set(i, { litres })} keyboardType="decimal-pad" placeholder="8" onCard />
          </Card>
        ))}
        {fills.length < MAX_FILLS ? <Button variant="soft" icon={Plus} label="Add another fill-up" onPress={() => setFills((f) => [...f, { distance: '', litres: '' }])} /> : null}

        {shown !== null ? (
          <Card style={{ gap: space[1] }}>
            <Text variant="label" tone="muted">Your mileage</Text>
            <Text variant="dataLarge">{`${shown} ${label}/L`}</Text>
            <Text variant="label" tone="muted">{`${totalShown} ${label} ÷ ${totalLitres} L`}</Text>
            {!inRange ? <Text variant="label" tone="caution">{`That is outside ${Math.ceil(fromKm(MIN_KM_PER_LITRE))} to ${Math.floor(fromKm(MAX_KM_PER_LITRE))} ${label}/L. Check the two numbers.`}</Text> : null}
            {used.length > 1 ? <Text variant="caption" tone="muted">All the distance over all the petrol, so a long tank counts for more than a small top-up.</Text> : null}
          </Card>
        ) : null}
        <Button label="Use this mileage" disabled={!inRange} onPress={useIt} />
        <Text variant="caption" tone="muted">Do it two or three times and add each fill-up above. One tank can be off by a few km/L from a different pump or a tilted bike.</Text>
      </View>
    </Screen>
  );
}
