import { endGroupRide, leaveGroupRide, passLead, setSuccessor, takeBackLead, takeLead } from '@/api/groups';
import { syncGroupNow } from '@/CompanionHost';
import { SIM_GROUP_ID, SIM_ME } from '@/lib/groupSim';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { useSimRide } from '@/store/simRide';

/** Shows the lead with a rider at once on this phone, before the server has said so: the new leader and the old one swap. */
function showLead(riderId: string, meId: string | undefined) {
  const { live, setLive, setGroupRole } = useCompanion.getState();
  const oldLeader = live.riders.find((r) => r.role === 'leader')?.id;
  setLive({ riders: live.riders.map((r) => (r.id === riderId ? { ...r, role: 'leader' } : r.id === oldLeader ? { ...r, role: 'member' } : r)), successor: null });
  if (meId) setGroupRole(riderId === meId ? 'leader' : 'member');
}

/**
 * What a leader (or a rider next in line) can do about the lead of the group, each returning whether it worked. Passing the lead is instant:
 * the screen shows it at once, the server makes it so, and everyone's next sync agrees. In the simulated group nothing leaves the phone.
 */
export function useLeadActions() {
  const group = useCompanion((s) => s.group);
  const token = useAuth((s) => s.token);
  const sim = group?.id === SIM_GROUP_ID;
  const me = () => useCompanion.getState().live.me;
  return {
    isLeader: group?.role === 'leader',
    /** Passes the lead to a rider. */
    pass: async (riderId: string): Promise<boolean> => {
      if (!group) return false;
      if (sim) { useSimRide.getState().setLeader(riderId); showLead(riderId, SIM_ME); return true; }
      if (!token) return false;
      try { await passLead(token, group.id, riderId); showLead(riderId, me()); syncGroupNow(); return true; } catch { return false; }
    },
    /** Passes the lead and leaves the group in one step. */
    passAndLeave: async (riderId: string): Promise<boolean> => {
      if (!group) return false;
      if (sim) { useCompanion.getState().setGroup(null); return true; }
      if (!token) return false;
      try { await leaveGroupRide(token, group.id, riderId); useCompanion.getState().setGroup(null); return true; } catch { return false; }
    },
    /** Ends the group for everyone. */
    end: async (): Promise<boolean> => {
      if (!group) return false;
      if (sim) { useCompanion.getState().setGroup(null); return true; }
      if (!token) return false;
      try { await endGroupRide(token, group.id); useCompanion.getState().setGroup(null); return true; } catch { return false; }
    },
    /** Names the rider who leads if this phone dies, or clears it. */
    backup: async (riderId: string | null): Promise<boolean> => {
      if (!group) return false;
      useCompanion.getState().setLive({ successor: riderId });
      if (sim) return true;
      if (!token) return false;
      try { await setSuccessor(token, group.id, riderId); return true; } catch { return false; }
    },
    /** Takes the lead from a leader who is out of contact. */
    take: async (): Promise<boolean> => {
      if (!group || !token || sim) return false;
      try { await takeLead(token, group.id); const m = me(); if (m) showLead(m, m); syncGroupNow(); return true; } catch { return false; }
    },
    /** Takes the lead back after being out of contact. */
    takeBack: async (): Promise<boolean> => {
      if (!group || !token || sim) return false;
      try { await takeBackLead(token, group.id); const m = me(); if (m) showLead(m, m); syncGroupNow(); return true; } catch { return false; }
    },
  };
}
