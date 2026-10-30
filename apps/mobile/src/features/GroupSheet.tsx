import { useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, LogOut, Share2 } from 'lucide-react-native';
import { createGroupRide, endGroupRide, joinGroupRide, leaveGroupRide, setRegroup } from '@/api/groups';
import { SITE_BASE } from '@/api/config';
import type { LatLng } from '@/lib/geo';
import { distanceToLeaderM, riderTiles, STATUS_LABEL, type GroupStatus } from '@/lib/groupCore';
import { codeFromInvite, inviteUrl } from '@/lib/inviteLink';
import { useAction } from '@/lib/useAction';
import { RiderTiles } from '@/features/group/RiderTiles';
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

const SIGNALS: GroupStatus[] = ['ok', 'wait_up', 'fuel', 'break', 'help'];
/** Long enough to paste a whole invite link into the code field; a link is turned into its code as it lands. */
const MAX_PASTE = 300;
const km = (m: number) => withUnit(shortDistanceM(m));

/**
 * Ride together: one rider starts a group and shares the six-character code, the others join with it. Everyone sees everyone
 * on the map, and a few quick signals ("Wait up", "Fuel stop") replace typing. The leader can drop a regroup pin.
 */
export function GroupSheet({ open, onClose, position }: { open: boolean; onClose: () => void; position?: LatLng }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const group = useCompanion((s) => s.group);
  const live = useCompanion((s) => s.live);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { busy, problem, run } = useAction();
  const leader = group?.role === 'leader';
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
    if (!token || !group) return;
    if (await run(() => (leader ? endGroupRide(token, group.id) : leaveGroupRide(token, group.id)))) { useCompanion.getState().setGroup(null); onClose(); }
  };
  const pin = (p: LatLng | null) => token && group && run(() => setRegroup(token, group.id, p));

  const me = live.me;
  const now = Date.now();
  const toLeader = me ? distanceToLeaderM(live.riders, me) : null;

  return (
    <Sheet open={open} title={group ? group.name : 'Group ride'} onClose={onClose}>
      {!token ? (
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
          {live.riders.length ? <RiderTiles tiles={riderTiles(live.riders, me, position, now)} canNavigate={canNavigate} /> : null}
          {leader ? (
            <>
              <Button variant="soft" icon={Flag} label={live.regroup ? 'Move the regroup pin here' : 'Drop a regroup pin here'} disabled={!position || busy} onPress={() => position && void pin(position)} />
              {live.regroup ? <Button variant="soft" label="Remove the regroup pin" onPress={() => void pin(null)} /> : null}
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
