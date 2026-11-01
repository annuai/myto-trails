import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { DEFAULT_START_TIME, leadLabel, MAX_TRIP_DAYS, REMIND_BEFORE_MIN, type TripRoute } from '@/lib/tripPlan';
import { useNotifications } from '@/store/notifications';
import { useTrips, type Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { ChoiceChip } from '@/ui/Chip';
import { DateDialog } from '@/ui/DateDialog';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { TimeField } from '@/ui/TimeField';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const QUICK: [string, number][] = [['Tomorrow', 1], ['In a week', 7], ['In a month', 30]];

/** One line of the sheet: what it sets on the left, the control on the right. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
      <Text variant="labelMedium" style={{ flexShrink: 1 }}>{label}</Text>
      {children}
    </View>
  );
}

/** Plan a trip: a name, the day it starts, how many days, and (optionally) the usual packing list. The first day can come with a route. */
export function PlanTripSheet({ open, onClose, onCreated, name: initialName = '', route, trip }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void; name?: string; route?: TripRoute; /** Change this trip instead of making a new one. */ trip?: Trip }) {
  const [name, setName] = useState(trip?.name ?? initialName);
  const [startDate, setStartDate] = useState(trip?.startDate ?? addDays(todayISO(), 1));
  const [startTime, setStartTime] = useState(trip?.startTime ?? DEFAULT_START_TIME);
  const [days, setDays] = useState(trip?.days?.length ?? 1);
  const [pack, setPack] = useState(true);
  const [picking, setPicking] = useState(false);
  const lead = useNotifications((s) => s.prefs.tripLeadMin ?? REMIND_BEFORE_MIN);

  const save = () => {
    if (trip) { useTrips.getState().update(trip.id, { name, startDate, startTime, dayCount: days }); onClose(); return; }
    const { create: make, addStarterTodos } = useTrips.getState();
    const id = make({ name, startDate, startTime, dayCount: days, route });
    if (pack) addStarterTodos(id);
    setName(initialName); setDays(1); setPack(true);
    onClose();
    onCreated?.(id);
  };

  return (
    <Sheet open={open} title={trip ? 'Change the trip' : 'Plan a trip'} onClose={onClose} footer={<Button label={trip ? 'Save changes' : `Plan for ${formatDate(startDate)}`} disabled={!name.trim()} onPress={save} />}>
      <View style={{ gap: space[6], paddingTop: space[2], paddingBottom: space[4] }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Ladakh in September" maxLength={60} />
        <View style={{ gap: space[3] }}>
          <Line label="Starts"><Text variant="data">{formatDate(startDate)}</Text></Line>
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            {QUICK.map(([label, n]) => <ChoiceChip key={label} label={label} selected={startDate === addDays(todayISO(), n)} onPress={() => setStartDate(addDays(todayISO(), n))} />)}
            <ChoiceChip label="Pick a date" selected={QUICK.every(([, n]) => startDate !== addDays(todayISO(), n))} onPress={() => setPicking(true)} />
          </View>
          <DateDialog open={picking} title="Choose start day" value={startDate} min={todayISO()} onCancel={() => setPicking(false)} onConfirm={(d) => { setStartDate(d); setPicking(false); }} />
        </View>
        <Card style={{ gap: space[5] }}>
          <TimeField label="Start time" value={startTime} onChange={setStartTime} />
          <Line label="Days">
            <View accessibilityRole="adjustable" accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <IconButton icon={Minus} label="One day fewer" onPress={() => setDays((d) => Math.max(1, d - 1))} />
              <Text variant="dataLarge">{days}</Text>
              <IconButton icon={Plus} label="One day more" onPress={() => setDays((d) => Math.min(MAX_TRIP_DAYS, d + 1))} />
            </View>
          </Line>
          {trip ? null : <Line label="Add the usual packing list"><Checkbox checked={pack} onChange={setPack} label="Add the usual packing list" /></Line>}
        </Card>
        <Text variant="caption" tone="muted">{lead ? `Reminder ${leadLabel(lead)} before the start.` : 'Start reminders are off in Notifications.'} A trip you do not start records nothing.</Text>
      </View>
    </Sheet>
  );
}
