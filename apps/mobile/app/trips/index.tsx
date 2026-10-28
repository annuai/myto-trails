import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Luggage } from 'lucide-react-native';
import { tripTotals } from '@/lib/trips';
import { asText, distanceKm } from '@/lib/units';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';

/** Trips: several days of riding gathered into one story. */
export default function Trips() {
  const router = useRouter();
  const trips = useTrips((s) => s.trips);
  const rides = useRides((s) => s.rides);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const create = () => { const id = useTrips.getState().create(name); setNaming(false); setName(''); router.push(`/trips/${id}`); };
  return (
    <Screen overlay={
      <Sheet open={naming} title="New trip" onClose={() => setNaming(false)}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Ladakh in September" maxLength={60} />
        <Button label="Create trip" onPress={create} />
      </Sheet>
    }>
      <BackHeader title="You" />
      <PageTitle sub="Add each day's ride from its story, and the trip shows all of it together.">Trips</PageTitle>
      {trips.length ? (
        <ListCard>
          {trips.map((t) => {
            const t2 = tripTotals(rides.filter((r) => t.rideIds.includes(r.id)));
            return <Row key={t.id} icon={Luggage} label={t.name} sub={`${t2.days} ${t2.days === 1 ? 'day' : 'days'}`} value={asText(distanceKm(t2.distanceKm))} mono onPress={() => router.push(`/trips/${t.id}`)} />;
          })}
        </ListCard>
      ) : <EmptyState icon={Luggage} title="No trips yet" body="Make one, then add your rides to it from each ride's story." />}
      <Button label="New trip" onPress={() => setNaming(true)} />
    </Screen>
  );
}
