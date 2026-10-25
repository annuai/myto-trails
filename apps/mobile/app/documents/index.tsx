import { useRouter } from 'expo-router';
import { Bike, IdCard, Siren } from 'lucide-react-native';
import { daysUntil, formatDate } from '@/lib/dates';
import { useProfile } from '@/store/profile';
import { StatusChip, type Status } from '@/ui/Chip';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function expiry(iso?: string): { status: Status; word: string } {
  if (!iso) return { status: 'unknown', word: 'No date' };
  const d = daysUntil(iso);
  return d < 0 ? { status: 'stop', word: 'Expired' } : d <= 30 ? { status: 'caution', word: `${d} days left` } : { status: 'good', word: `Valid till ${formatDate(iso)}` };
}

export default function Documents() {
  const router = useRouter();
  const { licence, vehicle, contacts } = useProfile();
  const lic = expiry(licence?.validTill);
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Stored on this device only. Expiry dates become reminders in your to-do list.">Documents and emergency</PageTitle>
      <ListCard>
        <Row icon={IdCard} label="Driving licence" sub={licence ? licence.classes.join(', ') || 'Added' : 'Add your licence details'} right={licence ? <StatusChip {...lic} label={lic.word} /> : undefined} onPress={() => router.push('/documents/licence')} />
        <Row icon={Bike} label="Vehicle, registration and insurance" sub={vehicle ? `${vehicle.regNo} · ${vehicle.model}` : 'Add your bike and its papers'} onPress={() => router.push('/documents/vehicle')} />
        <Row icon={Siren} label="Emergency contacts" sub={contacts.length ? `${contacts.length} added` : 'Who should we call if something goes wrong'} right={contacts.length ? <StatusChip status="good" label="Set" /> : <StatusChip status="caution" label="Add one" />} onPress={() => router.push('/documents/contacts')} />
      </ListCard>
      <Text variant="caption" tone="muted" style={{ marginTop: 24 }}>Photos of documents are not supported yet. Keep the originals with you when you ride.</Text>
    </Screen>
  );
}
