import { useState } from 'react';
import type { RiderTile } from '@/lib/groupCore';
import { BATTERY_WORDS } from '@/lib/leadCore';
import { useBattery } from '@/store/battery';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { LeadConfirm, LeadPicker } from './PassTheLead';
import { useLeadActions } from './useLeadActions';

/**
 * Shown to a leader whose battery is running out: who leads if the phone turns off? Choosing names a backup leader, who takes over if this phone goes
 * quiet at a low battery. Or, if the leader would rather, they pass the lead right now (confirmed in this sheet).
 */
export function BackupLeadSheet({ open, tiles, successorId, onClose }: { open: boolean; tiles: RiderTile[]; successorId?: string | null; onClose: () => void }) {
  const lead = useLeadActions();
  const level = useBattery((s) => s.level);
  const [passing, setPassing] = useState(false);
  const [picked, setPicked] = useState<RiderTile>();
  const [busy, setBusy] = useState(false);
  const close = () => { setPassing(false); setPicked(undefined); onClose(); };
  return (
    <Sheet open={open} title={picked ? `Pass the lead to ${picked.name}?` : passing ? 'Pass the lead now' : 'Who leads if your phone turns off?'} onClose={close}>
      {picked ? (
        <LeadConfirm name={picked.name} busy={busy} onBack={() => setPicked(undefined)} onConfirm={() => { setBusy(true); void lead.pass(picked.id).then((ok) => { setBusy(false); if (ok) close(); }); }} />
      ) : (
        <>
          <Text variant="label" tone="muted">{level !== null ? BATTERY_WORDS.ask(level) : 'Your battery is low.'} The rider you choose takes over if your phone goes quiet. Staying out of signal never costs you the lead.</Text>
          <LeadPicker tiles={tiles} successorId={successorId} onPick={(t) => { if (passing) setPicked(t); else void lead.backup(t.id).then(close); }} />
          <Button variant="soft" label={passing ? 'Choose a backup instead' : 'Pass the lead now instead'} onPress={() => setPassing(!passing)} />
          <Button variant="soft" label="Not now" onPress={close} />
        </>
      )}
    </Sheet>
  );
}
