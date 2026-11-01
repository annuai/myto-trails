import { useState } from 'react';
import { fromWheel, HOURS, MINUTES, PERIODS, toWheel } from '@/lib/timeWheel';
import { Wheel, WheelSet } from './Wheel';
import { WheelDialog } from './WheelDialog';

/**
 * A time of day to scroll to: hour, minute (every five) and AM or PM, each a column that snaps with a soft tick. The band across the
 * middle is the chosen time. Value is minutes after midnight.
 */
export function TimeWheel({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const w = toWheel(value);
  const set = (patch: Partial<typeof w>) => { const n = { ...w, ...patch }; onChange(fromWheel(n.hour, n.minute, n.period)); };
  return (
    <WheelSet>
      <Wheel label="Hour" variant="dataLarge" items={HOURS} index={w.hour} onIndex={(hour) => set({ hour })} />
      <Wheel label="Minute" variant="dataLarge" items={MINUTES} index={w.minute} onIndex={(minute) => set({ minute })} />
      <Wheel label="AM or PM" variant="dataLarge" items={PERIODS} index={w.period} onIndex={(period) => set({ period })} />
    </WheelSet>
  );
}

/** Choose a time in the same centred dialog as dates: Cancel changes nothing, OK calls `onConfirm` with minutes after midnight. */
export function TimeDialog({ open, title = 'Choose time', value, onConfirm, onCancel }: { open: boolean; title?: string; value: number; onConfirm: (minutes: number) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(value); }
  return (
    <WheelDialog open={open} title={title} onCancel={onCancel} onOk={() => onConfirm(draft)}>
      <TimeWheel value={draft} onChange={setDraft} />
    </WheelDialog>
  );
}
