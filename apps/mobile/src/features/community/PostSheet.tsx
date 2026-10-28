import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { clockLabel, hasLink, rideAtISO } from '@/lib/community';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DatePicker } from '@/ui/DatePicker';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TimeStepper } from '@/ui/TimeStepper';
import { space } from '@/theme/tokens';

export type NewPost = { body: string; rideAt?: string; place?: string };
const DEFAULT_START = 6 * 60 + 30;

/** Post to the club, or turn the post into a ride plan with a day, a time (India time) and a meeting place. */
export function PostSheet({ open, busy, problem, onSubmit, onClose }: { open: boolean; busy: boolean; problem?: string; onSubmit: (p: NewPost) => void; onClose: () => void }) {
  const [body, setBody] = useState('');
  const [ride, setRide] = useState(false);
  const [date, setDate] = useState(() => addDays(todayISO(), 1));
  const [minutes, setMinutes] = useState(DEFAULT_START);
  const [place, setPlace] = useState('');
  // Only a fresh sheet resets the form; a failed save keeps everything that was typed.
  useEffect(() => { if (open) { setBody(''); setRide(false); setDate(addDays(todayISO(), 1)); setMinutes(DEFAULT_START); setPlace(''); } }, [open]);
  const text = body.trim();
  const bad = hasLink(text) || (ride && hasLink(place));
  const ready = text.length > 0 && !bad && (!ride || place.trim().length > 0);
  return (
    <Sheet open={open} title={ride ? 'Plan a ride' : 'New post'} onClose={onClose}
      footer={<Button label={busy ? 'Posting…' : ride ? 'Post ride plan' : 'Post'} disabled={busy || !ready} onPress={() => onSubmit({ body: text, ...(ride ? { rideAt: rideAtISO(date, minutes), place: place.trim() } : {}) })} />}>
      <Field label={ride ? 'Details' : 'Post something'} value={body} onChangeText={setBody} multiline autoFocus maxLength={1000} error={hasLink(text) ? 'Please leave web addresses out.' : undefined} />
      <View style={{ flexDirection: 'row' }}>
        <ChoiceChip icon={CalendarClock} label="Make it a ride plan" selected={ride} onPress={() => setRide((r) => !r)} />
      </View>
      {ride ? (
        <View style={{ gap: space[4] }}>
          <View style={{ gap: space[2] }}>
            <Text variant="labelMedium">Day: {formatDate(date)}</Text>
            <DatePicker value={date} onChange={setDate} />
          </View>
          <View style={{ gap: space[2] }}>
            <Text variant="labelMedium">Start time (India time): {clockLabel(minutes)}</Text>
            <TimeStepper label="Start time" value={minutes} onChange={setMinutes} />
          </View>
          <Field label="Meeting place" value={place} onChangeText={setPlace} maxLength={120} error={hasLink(place) ? 'Please leave web addresses out.' : undefined} />
        </View>
      ) : null}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
