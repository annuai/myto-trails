import { useState } from 'react';
import type { RiderTile } from '@/lib/groupCore';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { LeadConfirm, LeadPicker } from './PassTheLead';
import { useLeadActions } from './useLeadActions';

/**
 * A leader who is stopping their ride cannot just walk away from a group that is still on: they pass the lead to a rider (and leave), or end the
 * group for everyone. `onGone` runs once the group is no longer theirs, and the ride can stop.
 */
export function LeaderExitSheet({ open, tiles, successorId, onClose, onGone }: { open: boolean; tiles: RiderTile[]; successorId?: string | null; onClose: () => void; onGone: () => void }) {
  const lead = useLeadActions();
  const [picked, setPicked] = useState<RiderTile>();
  const [busy, setBusy] = useState(false);
  const close = () => { setPicked(undefined); onClose(); };
  const done = (ok: boolean) => { setBusy(false); if (ok) { setPicked(undefined); onGone(); } };
  return (
    <Sheet open={open} title={picked ? `Pass the lead to ${picked.name}?` : 'You lead this group'} onClose={close}>
      {picked ? (
        <LeadConfirm name={picked.name} leaving busy={busy} onBack={() => setPicked(undefined)} onConfirm={() => { setBusy(true); void lead.passAndLeave(picked.id).then(done); }} />
      ) : (
        <>
          <Text variant="label" tone="muted">The group is still riding. Pass the lead to a rider before you stop, or end the group for everyone.</Text>
          <LeadPicker tiles={tiles} successorId={successorId} onPick={setPicked} />
          <Button variant="danger" label="End the group for everyone" disabled={busy} onPress={() => { setBusy(true); void lead.end().then(done); }} />
          <Button variant="soft" label="Keep riding" onPress={close} />
        </>
      )}
    </Sheet>
  );
}
