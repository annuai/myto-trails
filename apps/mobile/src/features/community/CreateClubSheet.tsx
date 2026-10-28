import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { hasLink } from '@/lib/community';

/** Start a club. The rider becomes its admin. */
export function CreateClubSheet({ open, busy, problem, onSubmit, onClose }: { open: boolean; busy: boolean; problem?: string; onSubmit: (b: { name: string; description: string; womenOnly: boolean }) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);
  useEffect(() => { if (open) { setName(''); setDescription(''); setWomenOnly(false); } }, [open]);
  const n = name.trim();
  const linky = hasLink(n) || hasLink(description);
  return (
    <Sheet open={open} title="Start a club" onClose={onClose} footer={<Button label={busy ? 'Creating…' : 'Create club'} disabled={busy || n.length < 3 || linky} onPress={() => onSubmit({ name: n, description: description.trim(), womenOnly })} />}>
      <Field label="Club name" value={name} onChangeText={setName} maxLength={60} autoFocus hint="3 to 60 characters." />
      <Field label="About the club (optional)" value={description} onChangeText={setDescription} multiline maxLength={500} error={linky ? 'Please leave web addresses out.' : undefined} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Checkbox checked={womenOnly} onChange={setWomenOnly} label="Women only" />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Women only</Text>
          <Text variant="caption" tone="muted">For riders who have said they ride as women, in Account.</Text>
        </View>
      </View>
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
