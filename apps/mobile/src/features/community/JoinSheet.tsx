import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { hasLink } from '@/lib/community';

/** Asking to join: a phone number only the club's admins can see, and an optional line about the rider. */
export function JoinSheet({ open, clubName, busy, problem, onSubmit, onClose }: { open: boolean; clubName: string; busy: boolean; problem?: string; onSubmit: (b: { phone: string; message: string }) => void; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { if (open) { setPhone(''); setMessage(''); } }, [open]);
  const digits = phone.replace(/\D/g, '').length;
  return (
    <Sheet open={open} title={`Ask to join ${clubName}`} onClose={onClose} footer={<Button label={busy ? 'Sending…' : 'Send request'} disabled={busy || digits < 10 || hasLink(message)} onPress={() => onSubmit({ phone: phone.trim(), message: message.trim() })} />}>
      <Field label="Your phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" autoFocus
        hint="Only this club’s admins can see your number, so they know who they are letting in. It is deleted a week after they decide, or straight away if you withdraw." />
      <Field label="A line about you (optional)" value={message} onChangeText={setMessage} multiline maxLength={300} error={hasLink(message) ? 'Please leave web addresses out.' : undefined} />
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
