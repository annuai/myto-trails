import { useRouter } from 'expo-router';
import { Bike, Camera, IdCard, ShieldCheck, Wind } from 'lucide-react-native';
import { daysUntil, formatDate } from '@/lib/dates';
import { documentEntries, type DocEntry } from '@/lib/documentEntries';
import { useProfile } from '@/store/profile';
import { Button } from '@/ui/Button';
import { StatusChip, type Status } from '@/ui/Chip';
import { ListCard, Row } from '@/ui/ListCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const ICON = { licence: IdCard, rc: Bike, insurance: ShieldCheck, puc: Wind } as const;

function expiry(iso?: string): { status: Status; word: string } {
  if (!iso) return { status: 'unknown', word: 'No date' };
  const d = daysUntil(iso);
  return d < 0 ? { status: 'stop', word: 'Expired' } : d <= 30 ? { status: 'caution', word: `${d} days left` } : { status: 'good', word: `Till ${formatDate(iso)}` };
}

/** The rider's papers in one place, for a stop on the road: number, validity, and the photo if they saved one (opened behind Face ID). */
export function DocumentsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { licence, vehicle, photos } = useProfile();
  const entries = documentEntries(licence, vehicle);
  const photoOf = (e: DocEntry) => photos.find((p) => p.docKind === e.kind);
  return (
    <Sheet open={open} title="Documents" onClose={onClose}>
      {entries.length ? (
        <ListCard>
          {entries.map((e) => {
            const p = photoOf(e);
            const x = expiry(e.validTill);
            return <Row key={e.kind} icon={p ? Camera : ICON[e.kind]} label={e.label} sub={e.detail || undefined} right={<StatusChip status={x.status} label={x.word} />} chevron={!!p}
              onPress={p ? () => { onClose(); router.push({ pathname: '/documents/photo', params: { id: p.id } }); } : undefined} />;
          })}
        </ListCard>
      ) : <Text variant="label" tone="muted">You have not added any papers. It is optional, and you only do it once.</Text>}
      <Button variant="soft" label={entries.length ? 'Edit documents' : 'Add documents'} onPress={() => { onClose(); router.push('/documents'); }} />
    </Sheet>
  );
}
