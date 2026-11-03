import { useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, LogOut, Share2 } from 'lucide-react-native';
import { createGroupRide, endGroupRide, joinGroupRide, leaveGroupRide, setRegroup, setRiderTitle } from '@/api/groups';
import type { EventRole } from '@/api/types';
import { TitlesList } from '@/features/group/TitlesList';
import { useSimRide } from '@/store/simRide';
import { syncGroupNow } from '@/CompanionHost';
import { SITE_BASE } from '@/api/config';
import type { LatLng } from '@/lib/geo';
import { distanceToLeaderM, riderTiles, STATUS_LABEL, type GroupRiderView, type GroupStatus } from '@/lib/groupCore';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { codeFromInvite, inviteUrl } from '@/lib/inviteLink';
import { useAction } from '@/lib/useAction';
import { RiderTiles } from '@/features/group/RiderTiles';
import { PlaceSearch } from '@/features/route/PlaceSearch';
import { useCanNavigate } from '@/features/group/useCanNavigate';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { shortDistanceM, withUnit } from '@/lib/units';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';
import { nowMs } from '@/lib/clock';

const SIGNALS: GroupStatus[] = ['ok', 'wait_up', 'fuel', 'break', 'help'];
/** Long enough to paste a whole invite link into the code field; a link is turned into its code as it lands. */
const MAX_PASTE = 300;
const km = (m: number) => withUnit(shortDistanceM(m));

/**
 * Ride together: one rider starts a group and shares the six-character code, the others join with it. Everyone sees everyone
 * on the map, and a few quick signals ("Wait up", "Fuel stop") replace typing. The leader can drop a regroup pin.
 */
/** `defaultName` pre-fills the name of a new ride, for one made from a trip. */
export function GroupSheet({ open, onClose, position, defaultName, onRider }: { open: boolean; onClose: () => void; position?: LatLng; defaultName?: string; /** Called with a rider's id when their tile is tapped; the page then shows where they are. */ onRider?: (id: string) => void }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const group = useCompanion((s) => s.group);
  const live = useCompanion((s) => s.live);
  const [name, setName] = useState(defaultName ?? '');
  const [code, setCode] = useState('');
  const { busy, problem, run } = useAction();
  const leader = group?.role === 'leader';
  const [titlesOpen, setTitlesOpen] = useState(false);
  /** The leader can give titles; so can the test group, so the feature can be tried without a real one. */
  const canTitle = leader || group?.id === SIM_GROUP_ID;
  const canNavigate = useCanNavigate();

  const start = async () => {
    if (!token) return;
    const r = await run(() => createGroupRide(token, { name: name.trim() || 'Group ride' }));
    if (r) useCompanion.getState().setGroup({ id: r.value.id, code: r.value.code, name: r.value.name, role: 'leader' });
  };
  const typedCode = codeFromInvite(code);
  const join = async () => {
    if (!token || !typedCode) return;
    const r = await run(() => joinGroupRide(token, { code: typedCode, displayName: user?.displayName ?? 'Rider' }));
    if (r) useCompanion.getState().setGroup({ id: r.value.id, code: typedCode, name: r.value.name, role: r.value.role });
  };
  // An https link, so WhatsApp and SMS make it tappable; the page it opens points at the app. The code is repeated for riders who type it.
  const invite = () => group && Share.share({ message: `Join my group ride "${group.name}" on Myto Moto: ${inviteUrl(SITE_BASE, group.code)}  (or open Ride, then Group ride, and enter code ${group.code})` });
  const signal = (s: GroupStatus) => useCompanion.getState().setLive({ myStatus: s });
  const leave = async () => {
    // A simulated group has nothing on the server to leave.
    if (group?.id === SIM_GROUP_ID) { useCompanion.getState().setGroup(null); onClose(); return; }
    if (!token || !group) return;
    if (await run(() => (leader ? endGroupRide(token, group.id) : leaveGroupRide(token, group.id)))) { useCompanion.getState().setGroup(null); onClose(); }
  };
  /** Gives a rider a title, or takes it away: sent to the server, shown at once, and made real for everyone at the next sync. */
  const setTitle = async (rider: GroupRiderView, title: EventRole | null) => {
    if (!group) return;
    if (group.id === SIM_GROUP_ID) useSimRide.getState().setTitle(rider.id, title);
    else if (!token || !(await run(() => setRiderTitle(token, group.id, { rider: rider.id, title })))) return;
    useCompanion.getState().setLive({ riders: useCompanion.getState().live.riders.map((r) => (r.id === rider.id ? { ...r, eventRole: title } : r)) });
    if (group.id !== SIM_GROUP_ID) syncGroupNow();
  };
  /** The group's one shared point: its destination, named when it came from a search. */
  const pin = (p: LatLng | null, note?: string) => token && group && run(() => setRegroup(token, group.id, p && { lat: p.lat, lng: p.lng, note }));

  const me = live.me;
  const now = nowMs();
  const toLeader = me ? distanceToLeaderM(live.riders, me) : null;

  return (
    <Sheet open={open} title={group ? group.name : 'Group ride'} onClose={onClose}>
      {!token && group?.id !== SIM_GROUP_ID ? (
        <>
          <Text variant="label" tone="muted">Sign in to ride with a group. Your position is shared with the group only while the ride is on.</Text>
          <Button label="Sign in" onPress={() => { onClose(); router.push('/auth'); }} />
        </>
      ) : !group ? (
        <>
          <Field label="Name your ride" value={name} onChangeText={setName} placeholder="Sunday to Nandi Hills" maxLength={60} />
          <Button label="Start a group ride" disabled={busy} onPress={() => void start()} />
          <Field label="Or join with a code or invite link" value={code} onChangeText={(t) => setCode(codeFromInvite(t) ?? t.toUpperCase())} placeholder="ABC234" autoCapitalize="characters" autoCorrect={false} maxLength={MAX_PASTE} />
          <Button variant="soft" label="Join" disabled={busy || !typedCode} onPress={() => void join()} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="dataLarge">{group.code}</Text>
            <Button variant="soft" icon={Share2} label="Invite" onPress={() => void invite()} />
          </View>
          {toLeader !== null ? <Text variant="label" tone="muted">{km(toLeader)} from the leader</Text> : null}
          <Text variant="labelMedium">Tell the group</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {SIGNALS.map((s) => <ChoiceChip key={s} label={STATUS_LABEL[s]} selected={live.myStatus === s} onPress={() => signal(s)} />)}
          </View>
          {live.riders.length ? <RiderTiles tiles={riderTiles(live.riders, me, position, now)} canNavigate={canNavigate} onSelect={onRider ? (t) => onRider(t.id) : undefined} /> : null}
          {canTitle && live.riders.length ? (
            <>
              <Button variant="soft" label={titlesOpen ? 'Hide titles' : 'Give titles'} onPress={() => setTitlesOpen(!titlesOpen)} />
              {titlesOpen ? <TitlesList riders={live.riders} meId={me} onSet={(r, t) => void setTitle(r, t)} /> : null}
            </>
          ) : null}
          {live.regroup ? <Text variant="label" tone="muted">{`Group destination: ${live.regroup.note ?? 'a spot on the map'}. Everyone sees the road to it.`}</Text> : null}
          {leader ? (
            <>
              <PlaceSearch label="Set the group destination" near={position} onPick={(p) => void pin(p.point, p.name)} />
              <Button variant="soft" icon={Flag} label="Use my spot as the destination" disabled={!position || busy} onPress={() => position && void pin(position)} />
              {live.regroup ? <Button variant="soft" label="Remove the destination" onPress={() => void pin(null)} /> : null}
            </>
          ) : null}
          <Button variant="danger" icon={LogOut} label={leader ? 'End the group ride for everyone' : 'Leave the group'} disabled={busy} onPress={() => void leave()} />
          {live.error ? <Text variant="label" tone="caution">{live.error}</Text> : null}
        </>
      )}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
