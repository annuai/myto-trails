import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fuel as FuelIcon, Settings2 } from 'lucide-react-native';
import { FuelSettingsSheet } from '@/features/FuelSettingsSheet';
import { formatDate, todayISO } from '@/lib/dates';
import type { DateRange } from '@/lib/dateRange';
import { costsBetween, formatLitres, formatMoney, lastMonthRange, monthRange, yearRange } from '@/lib/fuelCost';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useFuel } from '@/store/fuel';
import { useCurrency } from '@/store/region';
import { useRides } from '@/store/rides';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { DateRangePicker } from '@/ui/DateRangePicker';
import { EmptyState } from '@/ui/EmptyState';
import { IconButton } from '@/ui/IconButton';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ScalePressable } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Preset = 'month' | 'last' | 'year' | 'custom';

export default function FuelCosts() {
  const router = useRouter();
  const rides = useRides((s) => s.rides);
  const history = useFuel((s) => s.history);
  const currency = useCurrency();
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState<DateRange>({});
  // The mileage page sends a worked-out mileage here: the settings open with it filled in.
  const { mileage } = useLocalSearchParams<{ mileage?: string }>();
  const worked = mileage ? Number(mileage) : undefined;
  const [settings, setSettings] = useState(!!worked);
  const today = todayISO();
  const range = preset === 'month' ? monthRange(today) : preset === 'last' ? lastMonthRange(today) : preset === 'year' ? yearRange(today) : { from: custom.start ?? today, to: custom.end ?? custom.start ?? today };
  const summary = costsBetween(rides, history, range.from, range.to);
  const hasRange = preset !== 'custom' || !!custom.start;

  return (
    <Screen overlay={<FuelSettingsSheet key={String(settings)} initialKmPerLitre={worked} open={settings} onClose={() => setSettings(false)} />}>
      <BackHeader title="You" right={<IconButton icon={Settings2} label="Mileage and petrol price" onPress={() => setSettings(true)} plain />} />
      <PageTitle>Fuel logs</PageTitle>
      {!history.length ? (
        <View style={{ gap: space[4] }}>
        <EmptyState icon={FuelIcon} title="See what every ride costs" body="Tell us your mileage and the petrol price, and each ride shows the petrol it used." />
        <Button label="Set up" onPress={() => setSettings(true)} />
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          <Card>
            <Text variant="label" tone="muted">{hasRange ? `${formatDate(range.from)} to ${formatDate(range.to)}` : 'Pick the first and last day'}</Text>
            <Text variant="dataLarge">{formatMoney(summary.totalCost, currency)}</Text>
            <Text variant="label" tone="muted">{`${formatLitres(summary.totalLitres)} · ${asText(distanceKm(summary.totalKm))} · ${summary.count} ${summary.count === 1 ? 'ride' : 'rides'}`}</Text>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <ChoiceChip label="This month" selected={preset === 'month'} onPress={() => setPreset('month')} />
            <ChoiceChip label="Last month" selected={preset === 'last'} onPress={() => setPreset('last')} />
            <ChoiceChip label="This year" selected={preset === 'year'} onPress={() => setPreset('year')} />
            <ChoiceChip label="Pick dates" selected={preset === 'custom'} onPress={() => setPreset('custom')} />
          </View>
          {preset === 'custom' ? <Card><DateRangePicker value={custom} onChange={setCustom} /></Card> : null}
          {summary.items.length ? summary.items.map(({ ride, litres, cost }) => (
            <ScalePressable key={ride.id} onPress={() => router.push(`/story/${ride.id}`)}><Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
                <View style={{ flex: 1, gap: space.half }}>
                  <Text variant="bodyMedium">{ride.name}</Text>
                  <Text variant="label" tone="muted">{`${formatDate(new Date(ride.startedAt).toISOString().slice(0, 10))} · ${asText(distanceKm(ride.distanceKm))} · ${asText(durationParts(ride.durationSec))}`}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: space.half }}>
                  <Text variant="bodyMedium">{formatMoney(cost, currency)}</Text>
                  <Text variant="label" tone="muted">{formatLitres(litres)}</Text>
                </View>
              </View>
            </Card></ScalePressable>
          )) : hasRange ? <EmptyState icon={FuelIcon} title="No rides in these dates" body="Rides you record show up here with their cost." /> : null}
          <Button variant="soft" icon={Settings2} label="Mileage and petrol price" onPress={() => setSettings(true)} />
          <Text variant="caption" tone="muted">Worked out from each ride&apos;s distance, at the mileage and price in force the day it started. Real use varies with load, traffic and riding.</Text>
        </View>
      )}
    </Screen>
  );
}
