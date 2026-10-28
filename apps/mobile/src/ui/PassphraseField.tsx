import { useState } from 'react';
import { MIN_PASSPHRASE_LENGTH } from '@/lib/backup/format';
import { Button } from './Button';
import { Field } from './Field';
import { Stack } from './layout';

type Props = { label?: string; value: string; onChange: (v: string) => void; hint?: string; error?: string };

/** One passphrase field: hidden by default, with a button to show it. */
export function PassphraseField({ label = 'Passphrase', value, onChange, hint, error }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <Stack gap={2}>
      <Field label={label} value={value} onChangeText={onChange} secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" hint={hint} error={error} />
      <Button variant="soft" label={shown ? 'Hide passphrase' : 'Show passphrase'} onPress={() => setShown((s) => !s)} />
    </Stack>
  );
}

export const passphraseHint = `At least ${MIN_PASSPHRASE_LENGTH} characters. A few ordinary words work well.`;
