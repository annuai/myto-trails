import { useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { DestinationSheet } from '@/features/group/DestinationSheet';
import { useGroupSession } from '@/features/group/useGroupSession';
import { canTypeNow, nextUnlocked } from '@/lib/typingGate';
import { useOnChange } from '@/lib/useOnChange';
import { useGuideTarget } from '@/store/guideTarget';
import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';

/**
 * Set or change the destination from the ride screen. A group's leader sets the group's, which everyone follows; anyone else sets a place
 * for themselves only, and says so. Searching is shut while the bike moves (as for a note); once the sheet has opened for typing it stays open for it.
 */
export function RideDestinationSheet({ open, onClose, near }: { open: boolean; onClose: () => void; near?: LatLng }) {
  const { leader, group, live, pin } = useGroupSession();
  const to = useGuideTarget((s) => s.to);
  const riding = useRecorder((s) => s.status === 'running');
  const unfinished = useRecorder((s) => s.recoverable !== null);
  const stopped = useMotion((s) => s.stopped);
  const canType = canTypeNow({ riding, unfinished, stopped });
  const [unlocked, setUnlocked] = useState(() => nextUnlocked(false, { open, canType }));
  useOnChange(`${open}|${canType}`, () => setUnlocked((u) => nextUnlocked(u, { open, canType })));
  if (leader) {
    return <DestinationSheet open={open} onClose={onClose} near={near} current={live.regroup ?? undefined} title="Group destination" hint="Everyone in the group follows it." canType={unlocked || canType} onSet={async (p, name) => { await pin(p, name); }} onClear={() => void pin(null)} />;
  }
  return <DestinationSheet open={open} onClose={onClose} near={near} current={to} title="Your destination" hint={group ? 'Only for you. The leader sets the group’s.' : undefined} canType={unlocked || canType} onSet={(p, name) => useGuideTarget.getState().set({ ...p, name })} />;
}
