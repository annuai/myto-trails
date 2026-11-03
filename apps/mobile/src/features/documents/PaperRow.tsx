import type { LucideIcon } from 'lucide-react-native';
import type { Validity } from '@/lib/documentEntries';
import { StatusChip } from '@/ui/Chip';
import { Row } from '@/ui/ListCard';

/**
 * One of the rider's papers in a list: its name, its number, where it stands as a short chip ("Till 2038"), and the whole row is the button
 * when there is somewhere to go (the photo, or the form that edits it). It is one row on any phone; if the name, number and chip cannot sit
 * side by side (a narrow screen, large text), the chip goes under them instead. The documents sheet and the Documents page both use it.
 */
export function PaperRow({ icon, label, sub, chip, onPress }: { icon: LucideIcon; label: string; sub?: string; chip: Validity | { status: Validity['status']; word: string }; onPress?: () => void }) {
  return <Row icon={icon} label={label} sub={sub} wrapRight right={<StatusChip status={chip.status} label={chip.word} />} onPress={onPress} chevron={!!onPress} />;
}
