import { useState } from 'react';
import type { NudgeLevel } from '@/lib/nudge/types';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { chooseNudgeLevel } from './RideNudgeSettings';

/** After a first ride: would the rider like an occasional idea to go riding? Asked once; the answer is kept and can be changed in Smart reminders. */
export function NudgeConsentSheet({ open }: { open: boolean }) {
  const [busy, setBusy] = useState(false);
  const pick = async (level: NudgeLevel) => { setBusy(true); try { await chooseNudgeLevel(level); } finally { setBusy(false); } };
  return (
    <Sheet open={open} title="Nice ride. Want a nudge now and then?" onClose={() => void pick('off')}>
      <Text variant="label" tone="muted">An occasional idea to go for a ride: a dry day coming, a club ride, a free weekend. Never more than one a day, never at night, and fewer the less you open them. You can change this any time under Smart reminders.</Text>
      <Button label="Occasional, about once a week" disabled={busy} onPress={() => void pick('occasional')} />
      <Button variant="soft" label="Regular, up to twice a week" disabled={busy} onPress={() => void pick('regular')} />
      <Button variant="soft" label="No thanks" disabled={busy} onPress={() => void pick('off')} />
    </Sheet>
  );
}
