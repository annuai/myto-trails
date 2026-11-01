import { useState } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { EventRole, RosterRow } from '@/api/types';
import { ROLES, roleLabel } from '@/lib/eventCore';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { ListCard, Row } from '@/ui/ListCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';
import { REASON_LABEL, RESPONSE_LABEL } from './labels';

const detail = (r: RosterRow) => [r.response === 'declined' && r.reason ? REASON_LABEL[r.reason] : '', r.note ?? '', r.checkedIn ? 'Arrived' : ''].filter(Boolean).join(' · ') || undefined;

/** The host's list of everyone who answered. Tap a rider to give them a job or mark them arrived. Jobs are optional. */
export function RosterSheet({ open, roster, busy, problem, onRole, onArrived, onClose }: { open: boolean; roster: RosterRow[]; busy: boolean; problem?: string; onRole: (id: string, role: EventRole | null) => void; onArrived: (id: string) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string>();
  const rider = roster.find((r) => r.id === picked);
  return (
    <Sheet open={open} title={`Riders (${roster.length})`} onClose={() => { setPicked(undefined); onClose(); }}>
      {roster.length === 0 ? <Text variant="label" tone="muted">Nobody has answered yet.</Text> : (
        <ListCard>
          {roster.map((r) => (
            <Row key={r.id} icon={r.checkedIn ? Check : undefined} label={r.role ? `${r.name} · ${roleLabel(r.role)}` : r.name} sub={detail(r)} value={RESPONSE_LABEL[r.response]}
              onPress={r.response === 'going' || r.response === 'maybe' ? () => setPicked(picked === r.id ? undefined : r.id) : undefined} />
          ))}
        </ListCard>
      )}
      {rider ? (
        <View style={{ gap: space[3] }}>
          <Text variant="labelMedium">{rider.name}</Text>
          {rider.response === 'going' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              <ChoiceChip label="No job" selected={rider.role === null} onPress={() => onRole(rider.id, null)} />
              {ROLES.map((role) => <ChoiceChip key={role} label={roleLabel(role)} selected={rider.role === role} onPress={() => onRole(rider.id, role)} />)}
            </View>
          ) : <Text variant="label" tone="muted">Jobs go to riders who are going.</Text>}
          {!rider.checkedIn ? <Button variant="soft" label="Mark as arrived" disabled={busy} onPress={() => onArrived(rider.id)} /> : null}
        </View>
      ) : null}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
