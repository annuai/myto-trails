import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { endGroupRide, joinGroupRide, leaveGroupRide } from '@/api/groups';
import { normalizeInviteCode } from '@/lib/inviteLink';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/**
 * Where an invite link lands (myto://join/CODE, opened from the page the shared https link shows). Nothing happens until the rider taps
 * Join: opening a link should never put someone's position on a group's map by itself.
 */
export default function JoinGroup() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = normalizeInviteCode(String(raw ?? ''));
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const group = useCompanion((s) => s.group);
  const { busy, problem, run } = useAction();

  const joinNow = async () => {
    if (!token || !code) return;
    const r = await run(() => joinGroupRide(token, { code, displayName: user?.displayName ?? 'Rider' }));
    if (!r) return;
    useCompanion.getState().setGroup({ id: r.value.id, code, name: r.value.name, role: r.value.role });
    router.replace('/ride');
  };
  // A rider is in one group ride at a time: to join this one they leave (or, as its leader, end) the one they are in.
  const switchAndJoin = async () => {
    if (!token || !group) return;
    const left = await run(() => (group.role === 'leader' ? endGroupRide(token, group.id) : leaveGroupRide(token, group.id)));
    if (!left) return;
    useCompanion.getState().setGroup(null);
    await joinNow();
  };

  return (
    <Screen>
      <BackHeader title="Group ride" />
      {!code ? (
        <Stack gap={4}>
          <PageTitle>This invite link does not look right</PageTitle>
          <Text variant="label" tone="muted">Ask the rider who invited you to send it again, or open Ride, then Group ride, and type the code.</Text>
          <Button variant="soft" label="Go to Ride" onPress={() => router.replace('/ride')} />
        </Stack>
      ) : (
        <Stack gap={4}>
          <PageTitle sub="You were invited to ride together. Your position is shared with the group only while the ride is on.">Join a group ride</PageTitle>
          <Card style={{ alignItems: 'center' }}>
            <Text variant="dataLarge">{code}</Text>
          </Card>
          {!token ? (
            <>
              <Text variant="label" tone="muted">Sign in first. Then open the invite link again to join.</Text>
              <Button label="Sign in" onPress={() => router.push('/auth')} />
            </>
          ) : group?.code === code ? (
            <>
              <Text variant="bodyMedium">You are already in this group ride.</Text>
              <Button icon={Users} label="Open Ride" onPress={() => router.replace('/ride')} />
            </>
          ) : group ? (
            <>
              <Text variant="bodyMedium">You are already in "{group.name}".</Text>
              <Text variant="label" tone="muted">{group.role === 'leader' ? 'You started it, so joining this one ends it for everyone in it.' : 'Joining this one takes you out of it.'}</Text>
              <Button label="Leave it and join this one" disabled={busy} onPress={() => void switchAndJoin()} />
              <Button variant="soft" label="Keep my current group" onPress={() => router.replace('/ride')} />
            </>
          ) : (
            <Button icon={Users} label={busy ? 'Joining…' : 'Join the ride'} disabled={busy} onPress={() => void joinNow()} />
          )}
          {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
        </Stack>
      )}
    </Screen>
  );
}
