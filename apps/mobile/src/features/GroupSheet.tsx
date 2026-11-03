import { useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, MapPin, Share2 } from 'lucide-react-native';
import { ListCard, Row } from '@/ui/ListCard';
import { createGroupRide, endGroupRide, joinGroupRide, leaveGroupRide, setRegroup } from '@/api/groups';
import { SITE_BASE } from '@/api/config';
import type { LatLng } from '@/lib/geo';
import { distanceToLeaderM, riderTiles, STATUS_LABEL, type GroupStatus, type RiderTile } from '@/lib/groupCore';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { codeFromInvite, inviteUrl } from '@/lib/inviteLink';
import { useAction } from '@/lib/useAction';
import { LeadConfirm, LeadPicker } from '@/features/group/PassTheLead';
import { RiderSheet } from '@/features/group/RiderSheet';
import { useLeadActions } from '@/features/group/useLeadActions';
import { RiderTiles } from '@/features/group/RiderTiles';
import { DestinationSheet } from '@/features/group/DestinationSheet';
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
  const [pickedId, setPickedId] = useState<string>();
  const [destOpen, setDestOpen] = useState(false);
  /** A leader leaving: choosing who gets the lead, then confirming, in this same sheet. */
  const [exit, setExit] = useState<'pick' | 'confirm' | undefined>();
  const [heir, setHeir] = useState<RiderTile>();
  const [passing, setPassing] = useState(false);
  const lead = useLeadActions();
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
  /** The group's one shared point: its destination, named when it came from a search. */
  const pin = (p: LatLng | null, note?: string) => token && group && run(() => setRegroup(token, group.id, p && { lat: p.lat, lng: p.lng, note }));

  const me = live.me;
  const now = nowMs();
  const toLeader = me ? distanceToLeaderM(live.riders, me) : null;
  const tiles = riderTiles(live.riders, me, position, now);
  /** Without a screen of its own to open a rider on, the card opens from here. */
  const picked = tiles.find((t) => t.id === pickedId);

  return (
    <>
    <Sheet open={open} title={exit === 'confirm' && heir ? `Pass the lead to ${heir.name}?` : exit === 'pick' ? 'Pass the lead' : group ? group.name : 'Group ride'} onClose={() => { setExit(undefined); onClose(); }}>
      {exit === 'pick' ? (
        <>
          <Text variant="label" tone="muted">You lead this group, so you pass the lead to a rider before you leave. Choose who.</Text>
          <LeadPicker tiles={tiles} successorId={live.successor} onPick={(t) => { setHeir(t); setExit('confirm'); }} />
          <Button variant="soft" label="Cancel" onPress={() => setExit(undefined)} />
        </>
      ) : exit === 'confirm' && heir ? (
        <LeadConfirm name={heir.name} leaving moving={!canNavigate} busy={passing} onBack={() => setExit('pick')} onConfirm={() => { setPassing(true); void lead.passAndLeave(heir.id).then((ok) => { setPassing(false); if (ok) { setExit(undefined); onClose(); } }); }} />
      ) : (<>
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
          {live.riders.length ? <RiderTiles tiles={tiles} canNavigate={canNavigate} onSelect={(t) => { if (onRider) onRider(t.id); else { setPickedId(t.id); onClose(); } }} /> : null}
          {leader ? (
            <>
              <ListCard><Row icon={MapPin} label="Destination" value={live.regroup ? live.regroup.note ?? 'A spot on the map' : 'Not set'} onPress={() => setDestOpen(true)} /></ListCard>
              {live.regroup ? <Button variant="soft" label="Remove the destination" onPress={() => void pin(null)} /> : null}
            </>
          ) : live.regroup ? <Text variant="label" tone="muted">{`Group destination: ${live.regroup.note ?? 'a spot on the map'}. Everyone sees the road to it.`}</Text> : null}
          {leader && tiles.some((t) => !t.isMe) ? <Button icon={LogOut} label="Pass the lead and leave" disabled={busy} onPress={() => setExit('pick')} /> : null}
          <Button variant="danger" icon={LogOut} label={leader ? 'End the group ride for everyone' : 'Leave the group'} disabled={busy} onPress={() => void leave()} />
          {live.error ? <Text variant="label" tone="caution">{live.error}</Text> : null}
        </>
      )}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      </>)}
    </Sheet>
    <DestinationSheet open={open && destOpen} onClose={() => setDestOpen(false)} near={position} current={live.regroup ?? undefined} onSet={async (p, name) => { await pin(p, name); }} />
    {picked && !onRider ? <RiderSheet tile={picked} me={position} canNavigate={canNavigate} onClose={() => setPickedId(undefined)} /> : null}
    </>
  );
}
