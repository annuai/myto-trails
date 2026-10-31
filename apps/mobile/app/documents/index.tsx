import { useRouter } from 'expo-router';
import { Bike, IdCard, ShieldCheck, Siren, Wind } from 'lucide-react-native';
import { formatDate } from '@/lib/dates';
import { paperStatus, type Paper } from '@/lib/documentEntries';
import { useProfile } from '@/store/profile';
import { StatusChip, type Status } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

const ICON = { licence: IdCard, rc: Bike, insurance: ShieldCheck, puc: Wind } as const;

function chip(p: Paper): { status: Status; label: string } {
  if (p.state === 'missing') return { status: 'caution', label: 'Add' };
  if (p.state === 'expired') return { status: 'stop', label: 'Expired' };
  if (p.state === 'soon') return { status: 'caution', label: `${p.daysLeft} days left` };
  return { status: 'good', label: p.validTill ? `Valid till ${formatDate(p.validTill)}` : 'Added' };
}

export default function Documents() {
  const router = useRouter();
  const { licence, vehicle, contacts } = useProfile();
  const papers = paperStatus(licence, vehicle);
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Stored on this device only. Expiry dates become reminders in your to-do list.">Documents and emergency</PageTitle>
      <SectionTitle>Your papers</SectionTitle>
      <ListCard>
        {papers.map((p) => <Row key={p.kind} icon={ICON[p.kind]} label={p.label} sub={p.state === 'missing' ? 'Optional. Add it once and it stays here.' : p.detail || undefined} right={<StatusChip {...chip(p)} />} onPress={() => router.push(p.kind === 'licence' ? '/documents/licence' : '/documents/vehicle')} />)}
      </ListCard>
      <SectionTitle>Emergency</SectionTitle>
      <ListCard>
        <Row icon={Siren} label="Emergency contacts" sub={contacts.length ? `${contacts.length} added` : 'Who should we call if something goes wrong'} right={contacts.length ? <StatusChip status="good" label="Set" /> : <StatusChip status="caution" label="Add one" />} onPress={() => router.push('/documents/contacts')} />
      </ListCard>
    </Screen>
  );
}
