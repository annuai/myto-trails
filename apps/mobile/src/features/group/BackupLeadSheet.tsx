import { useState } from 'react';
import type { RiderTile } from '@/lib/groupCore';
import { useBattery } from '@/store/battery';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { LeadConfirm, LeadPicker } from './PassTheLead';
import { useLeadActions } from './useLeadActions';

/**
 * Shown, as a sheet of its own, to a leader whose battery is running out (at 15%, 7% and 5%). The title says why it appeared ("Battery at 13%"), then it asks
 * who should lead if the phone turns off. Choosing names a backup leader, who takes over if this phone goes quiet at a low battery. Or the leader passes the
 * lead right now (confirmed in this same sheet).
 */
export function BackupLeadSheet({ open, tiles, successorId, onClose }: { open: boolean; tiles: RiderTile[]; successorId?: string | null; onClose: () => void }) {
  const lead = useLeadActions();
  const level = useBattery((s) => s.level);
  const [passing, setPassing] = useState(false);
  const [picked, setPicked] = useState<RiderTile>();
  const [busy, setBusy] = useState(false);
  const close = () => { setPassing(false); setPicked(undefined); onClose(); };
  const reason = level !== null ? `Battery at ${level}%` : 'Battery low';
  return (
    <Sheet open={open} title={picked ? `Pass the lead to ${picked.name}?` : passing ? 'Pass the lead now' : reason} onClose={close}>
      {picked ? (
        <LeadConfirm name={picked.name} busy={busy} onBack={() => setPicked(undefined)} onConfirm={() => { setBusy(true); void lead.pass(picked.id).then((ok) => { setBusy(false); if (ok) close(); }); }} />
      ) : (
        <>
          {/* Why this appeared is the title above; here is the question it asks. */}
          <Text variant="bodyMedium">{passing ? 'Who should lead the group from now on?' : 'Who should lead the group if your phone turns off?'}</Text>
          {passing ? null : <Text variant="label" tone="muted">The rider you choose takes over if your phone goes quiet at a low battery. Losing signal never costs you the lead.</Text>}
          <LeadPicker tiles={tiles} successorId={successorId} onPick={(t) => { if (passing) setPicked(t); else void lead.backup(t.id).then(close); }} />
          <Button variant="soft" label={passing ? 'Choose a backup instead' : 'Pass the lead now instead'} onPress={() => setPassing(!passing)} />
          <Button variant="soft" label="Not now" onPress={close} />
        </>
      )}
    </Sheet>
  );
}
