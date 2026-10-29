import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { inRange, tapDay, type DateRange } from '@/lib/dateRange';
import { monthGrid, monthLabel, todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A month grid for picking a range of days: tap the first day, then the last. The days between are shaded. Works the same on the web and the phone. */
export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const { c } = useTheme();
  const base = value.start ?? todayISO();
  const [cursor, setCursor] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });
  const grid = monthGrid(cursor.y, cursor.m);
  const move = (d: number) => setCursor(({ y, m }) => { const n = m + d; return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; });
  const today = todayISO();
  const end = value.end ?? value.start;
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}><Icon icon={ChevronLeft} /></Pressable>
        <Text variant="bodyMedium">{monthLabel(cursor.y, cursor.m)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}><Icon icon={ChevronRight} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEK.map((d, i) => <Text key={i} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center' }}>{d}</Text>)}
      </View>
      {grid.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((iso, di) => {
            if (!iso) return <View key={di} style={{ flex: 1, height: size.target }} />;
            const edge = iso === value.start || iso === end;
            const between = inRange(value, iso) && !edge;
            return (
              <Pressable key={di} accessibilityRole="button" accessibilityLabel={iso} accessibilityState={{ selected: edge || between }} onPress={() => onChange(tapDay(value, iso))}
                style={{ flex: 1, height: size.target, alignItems: 'center', justifyContent: 'center', backgroundColor: between ? c.raised : 'transparent' }}>
                <View style={{ width: size.target - space[1], height: size.target - space[1], borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? c.ink : 'transparent', borderWidth: iso === today && !edge ? size.rule : 0, borderColor: c.muted }}>
                  <Text variant="data" tone={edge ? 'onInk' : 'ink'}>{+iso.slice(8)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
