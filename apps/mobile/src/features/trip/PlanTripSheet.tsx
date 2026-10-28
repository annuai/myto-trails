import { useState } from 'react';
import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { MAX_TRIP_DAYS, type TripRoute } from '@/lib/tripPlan';
import { useTrips, type Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DatePicker } from '@/ui/DatePicker';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** Plan a trip: a name, the day it starts, how many days, and (optionally) the usual packing list. The first day can come with a route. */
export function PlanTripSheet({ open, onClose, onCreated, name: initialName = '', route, trip }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void; name?: string; route?: TripRoute; /** Change this trip instead of making a new one. */ trip?: Trip }) {
  const [name, setName] = useState(trip?.name ?? initialName);
  const [startDate, setStartDate] = useState(trip?.startDate ?? addDays(todayISO(), 1));
  const [days, setDays] = useState(trip?.days?.length ?? 1);
  const [pack, setPack] = useState(true);

  const save = () => {
    if (trip) { useTrips.getState().update(trip.id, { name, startDate, dayCount: days }); onClose(); return; }
    const { create: make, addStarterTodos } = useTrips.getState();
    const id = make({ name, startDate, dayCount: days, route });
    if (pack) addStarterTodos(id);
    setName(initialName); setDays(1); setPack(true);
    onClose();
    onCreated?.(id);
  };

  return (
    <Sheet open={open} title={trip ? 'Change the trip' : 'Plan a trip'} onClose={onClose} footer={<Button label={trip ? 'Save changes' : `Plan for ${formatDate(startDate)}`} disabled={!name.trim()} onPress={save} />}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Ladakh in September" maxLength={60} />
      <Text variant="labelMedium">Starts</Text>
      <DatePicker value={startDate} onChange={setStartDate} />
      <Text variant="labelMedium">Days</Text>
      <View accessibilityRole="adjustable" accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon={Minus} label="One day fewer" onPress={() => setDays((d) => Math.max(1, d - 1))} />
        <Text variant="dataLarge">{days}</Text>
        <IconButton icon={Plus} label="One day more" onPress={() => setDays((d) => Math.min(MAX_TRIP_DAYS, d + 1))} />
      </View>
      {trip ? null : (
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <ChoiceChip label="Add the usual packing list" selected={pack} onPress={() => setPack(!pack)} />
        </View>
      )}
    </Sheet>
  );
}
