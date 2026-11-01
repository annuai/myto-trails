import { useState } from 'react';
import { View } from 'react-native';
import type { DeclineReason } from '@/api/types';
import { hasLink } from '@/lib/community';
import { useOnChange } from '@/lib/useOnChange';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';
import { REASON_LABEL, REASONS } from './labels';

const NOTE_MAX = 200;

/** "Can't make it": a reason in one tap and an optional note. Only the host reads either. */
export function DeclineSheet({ open, hostName, busy, problem, onSubmit, onClose }: { open: boolean; hostName: string; busy: boolean; problem?: string; onSubmit: (b: { reason?: DeclineReason; note?: string }) => void; onClose: () => void }) {
  const [reason, setReason] = useState<DeclineReason>();
  const [note, setNote] = useState('');
  useOnChange(open, (o) => { if (o) { setReason(undefined); setNote(''); } });
  const text = note.trim();
  return (
    <Sheet open={open} title="Can’t make it" onClose={onClose}
      footer={<Button label={busy ? 'Sending…' : 'Let the host know'} disabled={busy || hasLink(text)} onPress={() => onSubmit({ ...(reason ? { reason } : {}), ...(text ? { note: text } : {}) })} />}>
      <Text variant="label" tone="muted">Only {hostName} sees this. Both parts are optional.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {REASONS.map((r) => <ChoiceChip key={r} label={REASON_LABEL[r]} selected={reason === r} onPress={() => setReason(reason === r ? undefined : r)} />)}
      </View>
      <Field label="A note for the host" value={note} onChangeText={setNote} maxLength={NOTE_MAX} error={hasLink(text) ? 'Please leave web addresses out.' : undefined} />
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
