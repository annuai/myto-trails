import { useMemo, useState } from 'react';
import { clampToRange, dateFromWheel, dateToWheel, dayItems, monthItems, yearBounds, yearItems } from '@/lib/dateWheel';
import { todayISO } from '@/lib/dates';
import { Wheel, WheelSet } from './Wheel';
import { WheelDialog } from './WheelDialog';
import { wheel } from './Wheel.tokens';

/**
 * Choose a date on three wheels (day, month, year) in a centred dialog. Dates are 'YYYY-MM-DD'.
 * The years run from min to max, or a hundred years back to five ahead where one is missing. A date outside min and max snaps back
 * into range, and the day follows the month (31 January to February becomes 28 or 29). Cancel and the backdrop close with no change; OK calls `onConfirm`.
 */
export function DateDialog({ open, title = 'Choose date', value, min, max, onConfirm, onCancel }: { open: boolean; title?: string; value?: string; min?: string; max?: string; onConfirm: (iso: string) => void; onCancel: () => void }) {
  const start = clampToRange(value || todayISO(), min, max);
  const [draft, setDraft] = useState(start);
  const [wasOpen, setWasOpen] = useState(open);
  // Each time it opens, the wheels start from the field's value.
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(start); }
  const bounds = useMemo(() => {
    const b = yearBounds(min, max);
    return { first: Math.min(b.first, +start.slice(0, 4)), last: Math.max(b.last, +start.slice(0, 4)) };
  }, [min, max, start]);
  const place = dateToWheel(draft, bounds);
  const year = bounds.first + place.year;
  const set = (patch: Partial<typeof place>) => setDraft(dateFromWheel({ ...place, ...patch }, bounds, min, max));
  return (
    <WheelDialog open={open} title={title} onCancel={onCancel} onOk={() => onConfirm(draft)}>
      <WheelSet>
        <Wheel label="Day" items={dayItems(year, place.month + 1)} index={place.day} onIndex={(day) => set({ day })} />
        <Wheel label="Month" items={monthItems()} index={place.month} onIndex={(month) => set({ month })} flex={wheel.wide} />
        <Wheel label="Year" items={yearItems(bounds)} index={place.year} onIndex={(y) => set({ year: y })} />
      </WheelSet>
    </WheelDialog>
  );
}
