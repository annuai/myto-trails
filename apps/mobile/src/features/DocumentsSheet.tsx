import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bike, Camera, IdCard, ShieldCheck, Wind, type LucideIcon } from 'lucide-react-native';
import { documentEntries, validityWord, type DocEntry } from '@/lib/documentEntries';
import { useProfile } from '@/store/profile';
import { size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/Chip';
import { IconButton } from '@/ui/IconButton';
import { Icon } from '@/ui/Icon';
import { ListCard } from '@/ui/ListCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const ICON = { licence: IdCard, rc: Bike, insurance: ShieldCheck, puc: Wind } as const;

/** One paper: its name, its number and, under them, where it stands. Stacked, so a long number or a long date never squeezes the name. A saved photo opens from the camera icon. */
function DocRow({ entry, icon, onPhoto }: { entry: DocEntry; icon: LucideIcon; onPhoto?: () => void }) {
  const v = validityWord(entry.validTill);
  return (
    <View style={{ paddingHorizontal: space[5], paddingVertical: space[4], flexDirection: 'row', alignItems: 'flex-start', gap: space[4] }}>
      {onPhoto ? <IconButton plain tone="muted" icon={Camera} label={`Open the photo of ${entry.label}`} onPress={onPhoto} />
        : <View style={{ width: size.target, alignItems: 'center', paddingTop: space[1] }}><Icon icon={icon} size={22} tone="muted" /></View>}
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="body">{entry.label}</Text>
        {entry.detail ? <Text variant="data" tone="muted">{entry.detail}</Text> : null}
        <View style={{ marginTop: space[1] }}><StatusChip status={v.status} label={v.word} /></View>
      </View>
    </View>
  );
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
            return <DocRow key={e.kind} entry={e} icon={ICON[e.kind]} onPhoto={p ? () => { onClose(); router.push({ pathname: '/documents/photo', params: { id: p.id } }); } : undefined} />;
          })}
        </ListCard>
      ) : <Text variant="label" tone="muted">You have not added any papers. It is optional, and you only do it once.</Text>}
      <Button variant="soft" label={entries.length ? 'Edit documents' : 'Add documents'} onPress={() => { onClose(); router.push('/documents'); }} />
    </Sheet>
  );
}
