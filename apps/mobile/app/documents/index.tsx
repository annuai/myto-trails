import { useRouter } from 'expo-router';
import { Bike, IdCard, ShieldCheck, Siren, Wind } from 'lucide-react-native';
import { PaperRow } from '@/features/documents/PaperRow';
import { paperStatus, validityWord, type Paper } from '@/lib/documentEntries';
import { useProfile } from '@/store/profile';
import { StatusChip, type Status } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

const ICON = { licence: IdCard, rc: Bike, insurance: ShieldCheck, puc: Wind } as const;

/** What each paper's chip says: its date in the short shared wording, "Add" for a paper not added yet, "Added" for one with no date. */
function chip(p: Paper): { status: Status; word: string } {
  if (p.state === 'missing') return { status: 'caution', word: 'Add' };
  return p.validTill ? validityWord(p.validTill) : { status: 'good', word: 'Added' };
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
        {papers.map((p) => <PaperRow key={p.kind} icon={ICON[p.kind]} label={p.label} sub={p.state === 'missing' ? 'Optional. Add it once and it stays here.' : p.detail || undefined} chip={chip(p)} onPress={() => router.push(p.kind === 'licence' ? '/documents/licence' : '/documents/vehicle')} />)}
      </ListCard>
      <SectionTitle>Emergency</SectionTitle>
      <ListCard>
        <Row icon={Siren} label="Emergency contacts" sub={contacts.length ? `${contacts.length} added` : 'Who should we call if something goes wrong'} right={contacts.length ? <StatusChip status="good" label="Set" /> : <StatusChip status="caution" label="Add one" />} onPress={() => router.push('/documents/contacts')} />
      </ListCard>
    </Screen>
  );
}
