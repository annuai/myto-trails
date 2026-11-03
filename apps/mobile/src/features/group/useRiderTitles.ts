import { setRiderTitles } from '@/api/groups';
import { syncGroupNow } from '@/CompanionHost';
import type { RiderTitle } from '@/lib/groupCore';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { useSimRide } from '@/store/simRide';

/**
 * Who may give riders titles, and how. Only the leader can; the change shows at once on this phone, goes to the server, and reaches the rest of
 * the group on their next sync. If the server refuses it, the rider goes back to the titles they had.
 */
export function useRiderTitles(): { canSet: boolean; set: (riderId: string, titles: RiderTitle[]) => Promise<void> } {
  const group = useCompanion((s) => s.group);
  const token = useAuth((s) => s.token);
  const show = (riderId: string, titles: RiderTitle[]) => {
    const { live, setLive } = useCompanion.getState();
    setLive({ riders: live.riders.map((r) => (r.id === riderId ? { ...r, titles, eventRole: null } : r)) });
  };
  const set = async (riderId: string, titles: RiderTitle[]) => {
    if (!group || group.role !== 'leader') return;
    const before = useCompanion.getState().live.riders.find((r) => r.id === riderId);
    show(riderId, titles);
    if (group.id === SIM_GROUP_ID) { useSimRide.getState().setTitles(riderId, titles); return; }
    try {
      if (!token) throw new Error('signed out');
      await setRiderTitles(token, group.id, { rider: riderId, titles });
      syncGroupNow();
    } catch {
      show(riderId, before?.titles ?? (before?.eventRole ? [before.eventRole] : []));
    }
  };
  return { canSet: group?.role === 'leader', set };
}
