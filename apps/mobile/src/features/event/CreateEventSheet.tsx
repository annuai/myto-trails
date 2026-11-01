import { useState } from 'react';
import { View } from 'react-native';
import type { EventInput } from '@/api/types';
import { hasLink, rideAtISO } from '@/lib/community';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import type { Place } from '@/lib/placeSearch';
import { useOnChange } from '@/lib/useOnChange';
import { PlaceSearch } from '@/features/route/PlaceSearch';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DatePicker } from '@/ui/DatePicker';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TimeField } from '@/ui/TimeField';
import { space } from '@/theme/tokens';

const DEFAULT_START = 6 * 60 + 30;
const TITLE_MIN = 3;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 200;

/** Host an event. From a club page it can be for the club's members only; anywhere else it is open to every rider. */
export function CreateEventSheet({ open, clubId, clubName, busy, problem, onSubmit, onClose }: { open: boolean; clubId?: string; clubName?: string; busy: boolean; problem?: string; onSubmit: (e: EventInput) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => addDays(todayISO(), 1));
  const [minutes, setMinutes] = useState(DEFAULT_START);
  const [place, setPlace] = useState<Place>();
  const [membersOnly, setMembersOnly] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [details, setDetails] = useState('');
  useOnChange(open, (o) => { if (o) { setTitle(''); setDate(addDays(todayISO(), 1)); setMinutes(DEFAULT_START); setPlace(undefined); setMembersOnly(false); setCapacity(''); setDetails(''); } });
  const name = title.trim();
  const seats = capacity.trim() ? Number(capacity) : null;
  const seatsOk = seats === null || (Number.isInteger(seats) && seats >= CAPACITY_MIN && seats <= CAPACITY_MAX);
  const bad = hasLink(name) || hasLink(details);
  const ready = name.length >= TITLE_MIN && !!place && seatsOk && !bad;
  return (
    <Sheet open={open} title="Host an event" onClose={onClose}
      footer={<Button label={busy ? 'Posting…' : 'Post event'} disabled={busy || !ready} onPress={() => place && onSubmit({
        title: name, startsAt: rideAtISO(date, minutes), placeName: place.name, lat: place.point.lat, lng: place.point.lng,
        audience: clubId && membersOnly ? 'members' : 'open', ...(clubId ? { clubId } : {}), ...(seats !== null ? { capacity: seats } : {}), ...(details.trim() ? { description: details.trim() } : {}),
      })} />}>
      <Field label="Name of the ride" value={title} onChangeText={setTitle} maxLength={80} error={hasLink(name) ? 'Please leave web addresses out.' : undefined} />
      <View style={{ gap: space[2] }}>
        <Text variant="labelMedium">Day: {formatDate(date)}</Text>
        <DatePicker value={date} onChange={setDate} />
      </View>
      <TimeField label="Start time (India time)" value={minutes} onChange={setMinutes} />
      {place ? (
        <View style={{ gap: space[2] }}>
          <Text variant="labelMedium">Meeting point</Text>
          <Text variant="body">{place.name}</Text>
          <Button variant="soft" label="Choose another place" onPress={() => setPlace(undefined)} />
        </View>
      ) : <PlaceSearch label="Meeting point" onPick={setPlace} />}
      {clubId ? (
        <View style={{ gap: space[2] }}>
          <Text variant="labelMedium">Who can join</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <ChoiceChip label="Any rider" selected={!membersOnly} onPress={() => setMembersOnly(false)} />
            <ChoiceChip label={`${clubName ?? 'Club'} members only`} selected={membersOnly} onPress={() => setMembersOnly(true)} />
          </View>
        </View>
      ) : null}
      <Field label="Rider limit (optional)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={3} hint="2 to 200. When it is full, new riders join a waitlist." error={seatsOk ? undefined : 'Use a number from 2 to 200.'} />
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={500} error={hasLink(details) ? 'Please leave web addresses out.' : undefined} />
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
