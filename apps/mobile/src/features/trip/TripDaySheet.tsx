import { useState } from 'react';
import { formatDate } from '@/lib/dates';
import { dayDate } from '@/lib/tripPlan';
import { useTrips, type Trip } from '@/store/trips';
import { Sheet } from '@/ui/Sheet';
import { TrailPickerSheet } from './TrailPickerSheet';
import { TripDayFields, trailRoute } from './TripDayFields';

/** One day of a longer trip, in a sheet: its note, stops and route. A one-day trip shows the same fields on its own page instead. */
export function TripDaySheet({ trip, index, onClose }: { trip: Trip; index: number | null; onClose: () => void }) {
  const day = index === null ? undefined : trip.days?.[index];
  const [picking, setPicking] = useState(false);
  return (
    <>
      <Sheet open={!!day} title={day && trip.startDate ? `Day ${index! + 1} · ${formatDate(dayDate(trip.startDate, index!))}` : 'Day'} onClose={onClose}>
        {day ? <TripDayFields trip={trip} index={index!} single={false} onChooseTrail={() => setPicking(true)} onNavigate={onClose} /> : null}
      </Sheet>
      {/* Opens over the day's sheet; choosing a trail closes it and leaves the day's sheet as it was. */}
      <TrailPickerSheet open={picking} onClose={() => setPicking(false)} onPick={(t) => day && useTrips.getState().setDay(trip.id, day.id, { route: trailRoute(t) })} />
    </>
  );
}
