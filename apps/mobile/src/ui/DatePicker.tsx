import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { addDays, monthGrid, monthLabel, toISO, todayISO } from '@/lib/dates';
import { ChoiceChip } from './Chip';
import { Icon } from './Icon';
import { Text } from './Text';

import { space, radius, size } from '@/theme/tokens';
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month grid with quick picks. Works the same on web and native (no platform picker). */
export function DatePicker({ value, onChange, past }: { value?: string; onChange: (iso: string) => void; past?: boolean }) {
  const { c } = useTheme();
  const base = value ?? todayISO();
  const [cursor, setCursor] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });
  const grid = monthGrid(cursor.y, cursor.m);
  const move = (d: number) => setCursor(({ y, m }) => { const n = m + d; return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; });
  const today = todayISO();
  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {(past ? [['Today', 0], ['Yesterday', -1], ['A week ago', -7]] : [['Tomorrow', 1], ['In a week', 7], ['In a month', 30]] as [string, number][]).map(([label, n]) => (
          <ChoiceChip key={label as string} label={label as string} onPress={() => onChange(addDays(today, n as number))} selected={value === addDays(today, n as number)} />
        ))}
      </View>
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
            const selected = iso === value;
            return (
              <Pressable key={di} accessibilityRole="button" accessibilityLabel={iso} accessibilityState={{ selected }} onPress={() => onChange(iso)} style={{ flex: 1, height: size.target, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: size.compact, height: size.compact, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.ink : 'transparent', borderWidth: iso === today && !selected ? size.outline : 0, borderColor: c.muted }}>
                  <Text variant="data" tone={selected ? 'onInk' : 'ink'}>{+iso.slice(8)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
