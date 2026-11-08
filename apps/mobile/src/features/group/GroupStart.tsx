import { View } from 'react-native';
import { MapPin, Share2, Users } from 'lucide-react-native';
import { riderTiles } from '@/lib/groupCore';
import { nowMs } from '@/lib/clock';
import type { LatLng } from '@/lib/geo';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { codeFromInvite } from '@/lib/inviteLink';
import { RiderTiles } from './RiderTiles';
import { useCanNavigate } from './useCanNavigate';
import type { useGroupSession } from './useGroupSession';

/** Long enough to paste a whole invite link into the code field; a link is turned into its code as it lands. */
const MAX_PASTE = 300;

type Session = ReturnType<typeof useGroupSession>;

/**
 * The Group side of the Ride start page: what is specific to riding together. With no group it is two cards, start one (name it, choose
 * where to) or join one with a code. Once there is a group it is the lobby: the code to share, who has joined, and where the group is going.
 * What it shares with a solo ride (the map, the pre-ride checks, the options, the Start button) is drawn by the page around it.
 */
export function GroupStart({ session, here, destinationLabel, onDestination, onHow, onManage, onSignIn, signInProblem }: {
  session: Session;
  /** The phone's position, for how far each rider is. */
  here?: LatLng;
  /** The place the group is going to, if one is chosen. */
  destinationLabel?: string;
  /** Opens the place picker; the page decides whether the pick is kept for a new group or becomes the group's. */
  onDestination: () => void;
  onHow: () => void;
  /** Opens the group sheet: signals, passing the lead, leaving or ending. */
  onManage: () => void;
  onSignIn: () => void;
  signInProblem?: string;
}) {
  const { token, group, live, leader, name, setName, code, setCode, typedCode, busy, problem, join, invite } = session;
  const canNavigate = useCanNavigate();

  if (!token && !group) {
    return (
      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Icon icon={Users} size={20} /><Text variant="bodyMedium">Sign in to ride together</Text></View>
        <Text variant="label" tone="muted">Your position is shared with the group only while the ride is on.</Text>
        <Button label="Sign in" onPress={onSignIn} />
        {signInProblem ? <Text variant="label" tone="stop">{signInProblem}</Text> : null}
      </Card>
    );
  }

  if (group) {
    const tiles = riderTiles(live.riders, live.me, here, nowMs());
    const others = tiles.filter((t) => !t.isMe).length;
    return (
      <View style={{ gap: space[3] }}>
        <Card style={{ gap: space[3] }}>
          <Text variant="label" tone="muted">{leader ? 'You are leading' : 'You have joined'} · {group.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="dataLarge" accessibilityLabel={`Code ${group.code.split('').join(' ')}`}>{group.code}</Text>
            <Button variant="soft" onCard icon={Share2} label="Invite" onPress={() => void invite()} />
          </View>
          <Text variant="label" tone="muted">{others === 0 ? 'Just you so far. Share the code and riders appear here as they join.' : `${others + 1} riders so far. Others can still join with the code.`}</Text>
        </Card>
        {tiles.length > 1 ? <RiderTiles tiles={tiles} canNavigate={canNavigate} /> : null}
        <ListCard><Row icon={MapPin} label="Destination" value={destinationLabel ?? 'Not set'} onPress={leader ? onDestination : undefined} chevron={!!leader} /></ListCard>
        <Button variant="soft" label="Manage group" arrow onPress={onManage} />
        {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      <Card style={{ gap: space[3] }}>
        <Text variant="bodyMedium">Start a group</Text>
        <Field label="Name your ride" value={name} onChangeText={setName} placeholder="Sunday to Nandi Hills" maxLength={60} />
        <Button variant="soft" onCard icon={MapPin} arrow label={destinationLabel ? `To ${destinationLabel}. Somewhere else?` : 'Where to?'} onPress={onDestination} />
        <Text variant="label" tone="muted">Press Start group below. You get a code to share, and everyone who joins shows on your map.</Text>
      </Card>
      <Card style={{ gap: space[3] }}>
        <Text variant="bodyMedium">Join a group</Text>
        <Field label="Code or invite link" value={code} onChangeText={(t) => setCode(codeFromInvite(t) ?? t.toUpperCase())} placeholder="ABC234" autoCapitalize="characters" autoCorrect={false} maxLength={MAX_PASTE} />
        <Button variant="soft" onCard label="Join" disabled={busy || !typedCode} onPress={() => void join()} />
      </Card>
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      <TextButton label="How group rides work" tone="ink" onPress={onHow} />
    </View>
  );
}
