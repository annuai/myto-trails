import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, size } from '@/theme/tokens';
import { addDays, MONTHS, monthGrid, monthLabel, todayISO } from '@/lib/dates';
import { pageLabel, pageStartFor, YEARS_PER_PAGE, yearPage } from '@/lib/yearPage';
import { ChoiceChip } from './Chip';
import { Icon } from './Icon';
import { Text } from './Text';
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKS = 6;
/** The days are six rows of this height; the month and year cells are laid out over the same area. */
const BODY = WEEKS * size.target;

/**
 * Month grid with quick picks. Works the same on web and native (no platform picker).
 * The title is a button: it opens the months of the year, and the year there opens a page of years, so a date far away
 * (a licence valid for twenty years) is three taps, not two hundred and forty. Choosing a year goes to its months, choosing a
 * month goes to its days. The arrows step by month, year or page, whichever is showing.
 */
export function DatePicker({ value, onChange, past, chips = true }: { value?: string; onChange: (iso: string) => void; past?: boolean; /** Leave out the quick picks when the screen offers its own. */ chips?: boolean }) {
  const { c } = useTheme();
  const base = value ?? todayISO();
  const [cursor, setCursor] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });
  // The days come first and are the tallest, so their height is kept for the months and years: the picker never changes size.
  const [bodyH, setBodyH] = useState(0);
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');
  const [yearStart, setYearStart] = useState(pageStartFor(cursor.y));
  // Always six rows of days, so the picker is the same height for every month and the sheet does not jump as the month changes.
  const grid = monthGrid(cursor.y, cursor.m);
  while (grid.length < WEEKS) grid.push(Array(7).fill(null));
  const move = (d: number) => {
    if (mode === 'year') return setYearStart((y) => y + d * YEARS_PER_PAGE);
    if (mode === 'month') return setCursor((c0) => ({ ...c0, y: c0.y + d }));
    setCursor(({ y, m }) => { const n = m + d; return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; });
  };
  const title = mode === 'year' ? pageLabel(yearStart) : mode === 'month' ? `${cursor.y}` : monthLabel(cursor.y, cursor.m);
  const back = mode === 'year' ? 'Earlier years' : mode === 'month' ? 'Previous year' : 'Previous month';
  const forward = mode === 'year' ? 'Later years' : mode === 'month' ? 'Next year' : 'Next month';
  const openTitle = () => { if (mode === 'day') setMode('month'); else if (mode === 'month') { setYearStart(pageStartFor(cursor.y)); setMode('year'); } };
  /** A cell of the month or year grid: three to a row, the chosen one filled and the current one outlined. */
  const cell = (label: string, selected: boolean, current: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={{ width: '33.33%', height: BODY / 4, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ minWidth: size.ride, height: size.target - space[1], paddingHorizontal: space[4], borderRadius: size.target / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.ink : 'transparent', borderWidth: current && !selected ? size.rule : 0, borderColor: c.muted }}>
        <Text variant="data" tone={selected ? 'onInk' : 'ink'}>{label}</Text>
      </View>
    </Pressable>
  );
  const today = todayISO();
  return (
    <View style={{ gap: space[4] }}>
      {chips ? <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {(past ? [['Today', 0], ['Yesterday', -1], ['A week ago', -7]] : [['Tomorrow', 1], ['In a week', 7], ['In a month', 30]] as [string, number][]).map(([label, n]) => (
          <ChoiceChip key={label as string} label={label as string} onPress={() => onChange(addDays(today, n as number))} selected={value === addDays(today, n as number)} />
        ))}
      </View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={back} onPress={() => move(-1)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}><Icon icon={ChevronLeft} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={mode === 'day' ? `${title}. Choose month or year` : title} disabled={mode === 'year'} onPress={openTitle} style={{ minHeight: size.target, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] }}>
          <Text variant="bodyMedium">{title}</Text>
          {mode === 'year' ? null : <Icon icon={ChevronDown} size={18} tone="muted" />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={forward} onPress={() => move(1)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}><Icon icon={ChevronRight} /></Pressable>
      </View>
      <View style={{ minHeight: bodyH }} onLayout={(e) => setBodyH((h) => Math.max(h, e.nativeEvent.layout.height))}>
      {mode === 'year' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {yearPage(yearStart).map((y) => cell(`${y}`, y === +base.slice(0, 4) && !!value, y === +today.slice(0, 4), () => { setCursor((c0) => ({ ...c0, y })); setMode('month'); }))}
        </View>
      ) : mode === 'month' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {MONTHS.map((name, m) => cell(name, !!value && cursor.y === +base.slice(0, 4) && m === +base.slice(5, 7) - 1, cursor.y === +today.slice(0, 4) && m === +today.slice(5, 7) - 1, () => { setCursor((c0) => ({ ...c0, m })); setMode('day'); }))}
        </View>
      ) : (
        <View>
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
      )}
      </View>
    </View>
  );
}
