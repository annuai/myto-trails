import { useState } from 'react';
import { Share } from 'react-native';
import { createGroupRide, endGroupRide, joinGroupRide, leaveGroupRide, setRegroup } from '@/api/groups';
import { SITE_BASE } from '@/api/config';
import type { LatLng } from '@/lib/geo';
import type { GroupStatus } from '@/lib/groupCore';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { codeFromInvite, inviteUrl } from '@/lib/inviteLink';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';

type Place = LatLng & { name?: string };

/**
 * Everything a rider does to a group ride, apart from how it looks: start one, join with a code, share the invite, tell the group how they
 * are, set its destination, leave or end it. The group sheet and the group start page both draw on this, so they never disagree. The group
 * itself lives in the companion store, so whichever of them acts, both see it.
 */
export function useGroupSession(defaultName?: string) {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const group = useCompanion((s) => s.group);
  const live = useCompanion((s) => s.live);
  const [name, setName] = useState(defaultName ?? '');
  const [code, setCode] = useState('');
  const { busy, problem, run } = useAction();
  const leader = group?.role === 'leader';
  const typedCode = codeFromInvite(code);

  /** Starts a group. A destination chosen beforehand becomes the group's, so everyone sees the road to it. */
  const start = async (destination?: Place) => {
    if (!token) return;
    const r = await run(() => createGroupRide(token, { name: name.trim() || 'Group ride' }));
    if (!r) return;
    useCompanion.getState().setGroup({ id: r.value.id, code: r.value.code, name: r.value.name, role: 'leader' });
    if (destination && (await run(() => setRegroup(token, r.value.id, { lat: destination.lat, lng: destination.lng, note: destination.name })))) {
      useCompanion.getState().setLive({ regroup: { lat: destination.lat, lng: destination.lng, note: destination.name ?? null } });
    }
  };
  const join = async () => {
    if (!token || !typedCode) return;
    const r = await run(() => joinGroupRide(token, { code: typedCode, displayName: user?.displayName ?? 'Rider' }));
    if (r) useCompanion.getState().setGroup({ id: r.value.id, code: typedCode, name: r.value.name, role: r.value.role });
  };
  // An https link, so WhatsApp and SMS make it tappable; the page it opens points at the app. The code is repeated for riders who type it.
  const invite = () => group && Share.share({ message: `Join my group ride "${group.name}" on Myto Moto: ${inviteUrl(SITE_BASE, group.code)}  (or open Ride, then Group ride, and enter code ${group.code})` });
  const signal = (s: GroupStatus) => useCompanion.getState().setLive({ myStatus: s });
  /** Leaves (or, for the leader, ends) the group; `done` runs once it is gone. */
  const leave = async (done?: () => void) => {
    // A simulated group has nothing on the server to leave.
    if (group?.id === SIM_GROUP_ID) { useCompanion.getState().setGroup(null); done?.(); return; }
    if (!token || !group) return;
    if (await run(() => (leader ? endGroupRide(token, group.id) : leaveGroupRide(token, group.id)))) { useCompanion.getState().setGroup(null); done?.(); }
  };
  /** The group's one shared point: its destination, named when it came from a search. */
  const pin = async (p: LatLng | null, note?: string) => {
    if (!token || !group) return false;
    const r = await run(() => setRegroup(token, group.id, p && { lat: p.lat, lng: p.lng, note }));
    // Shown at once, not at the next sync, so the map has the road to it straight away.
    if (r) useCompanion.getState().setLive({ regroup: p ? { lat: p.lat, lng: p.lng, note: note ?? null } : null });
    return !!r;
  };

  return { token, user, group, live, leader, name, setName, code, setCode, typedCode, busy, problem, start, join, invite, signal, leave, pin };
}
