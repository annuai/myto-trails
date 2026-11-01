import { View } from 'react-native';
import type { DateRange } from '@/lib/dateRange';
import { space } from '@/theme/tokens';
import { DateField } from './DateField';

/** A range of days as two date fields, From and To, each opening the date dialog. To is never earlier than From: moving From past To pulls To along. */
export function DateRangePicker({ value, onChange, min, max }: { value: DateRange; onChange: (r: DateRange) => void; min?: string; max?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3] }}>
      <View style={{ flex: 1 }}>
        <DateField label="From" title="Choose first day" value={value.start} min={min} max={max} onChange={(start) => onChange({ start, end: value.end && value.end < start ? start : value.end })} />
      </View>
      <View style={{ flex: 1 }}>
        <DateField label="To" title="Choose last day" value={value.end} min={value.start && (!min || value.start > min) ? value.start : min} max={max} onChange={(end) => onChange({ start: value.start, end })} />
      </View>
    </View>
  );
}
