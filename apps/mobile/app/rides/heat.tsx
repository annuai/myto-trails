import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { heatMap, heatSummary, ridesIn, type HeatRange } from '@/lib/heat';
import { nowMs } from '@/lib/clock';
import { asText, distanceKm } from '@/lib/units';
import { useDistanceUnit } from '@/store/region';
import { useRides } from '@/store/rides';
import { media, radius, space } from '@/theme/tokens';
import { ChoiceChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { OsmMap } from '@/ui/map/OsmMap';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const RANGES: { id: HeatRange; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'year', label: 'This year' },
  { id: 'quarter', label: 'Last 90 days' },
];

/** Where the rider has ridden and how often, drawn on this phone from their own rides. Nothing about it is sent anywhere. */
export default function WhereIRide() {
  useDistanceUnit(); // re-draws the distance when the unit changes
  const rides = useRides((s) => s.rides);
  const [range, setRange] = useState<HeatRange>('all');
  const now = nowMs();
  const chosen = useMemo(() => ridesIn(rides, range, now), [rides, range, now]);
  const heat = useMemo(() => heatMap(chosen), [chosen]);
  const sum = heatSummary(chosen);
  const any = heatSummary(rides).rides > 0;

  return (
    <Screen>
      <BackHeader title="Ride log" />
      <PageTitle sub="Drawn on this phone from your own rides. Nothing about it is sent anywhere.">Where I ride</PageTitle>
      {any ? (
        <View style={{ gap: space[4] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {RANGES.map((r) => <ChoiceChip key={r.id} label={r.label} selected={range === r.id} onPress={() => setRange(r.id)} />)}
          </View>
          {heat.lines.length ? (
            <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
              <OsmMap height={media.heatMap} heat={heat} />
            </View>
          ) : <EmptyState icon={Flame} title="No rides in this time" body="Pick a longer time to see where you have ridden." />}
          <Text variant="label" tone="muted">{`${sum.rides} ${sum.rides === 1 ? 'ride' : 'rides'} · ${asText(distanceKm(sum.distanceKm))}. A soft red line is a road you rode once; the more you ride it, the deeper and brighter it glows.`}</Text>
        </View>
      ) : <EmptyState icon={Flame} title="Your map starts with your first ride" body="Every ride you record adds to it. The places you ride most turn red." />}
    </Screen>
  );
}
