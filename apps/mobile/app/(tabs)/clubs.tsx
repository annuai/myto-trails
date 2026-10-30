import { useState } from 'react';
import { useDistanceUnit } from '@/store/region';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, Users } from 'lucide-react-native';
import { createClub } from '@/api/community';
import { useClubs } from '@/api/useApi';
import type { ClubSummary } from '@/api/types';
import { CreateClubSheet } from '@/features/community/CreateClubSheet';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { EmptyState } from '@/ui/EmptyState';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ScalePressable } from '@/ui/motion';
import { media, space } from '@/theme/tokens';

function ClubCard({ club, onPress }: { club: ClubSummary; onPress: () => void }) {
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress}>
      <Card padded={false}>
        <ClubCover name={club.name} url={club.coverUrl} height={media.coverCard} />
        <View style={{ padding: space[4], gap: space[1] }}>
          <Text variant="bodyMedium">{club.name}</Text>
          <Text variant="label" tone="muted">
            {club.memberCount} {club.memberCount === 1 ? 'member' : 'members'}{club.womenOnly ? ' · Women only' : ''}{club.role === 'admin' ? ' · You are admin' : ''}{club.requested ? ' · Request sent' : ''}
          </Text>
        </View>
      </Card>
    </ScalePressable>
  );
}

export default function Clubs() {
  useDistanceUnit(); // re-draws any distance when the unit changes
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const signedIn = !!token;
  const [creating, setCreating] = useState(false);
  const act = useAction();
  const clubs = useClubs();
  const mine = clubs.data?.filter((c) => c.role) ?? [];
  const others = clubs.data?.filter((c) => !c.role) ?? [];
  const open = (id: string) => router.push(`/club/${id}`);
  const create = async (b: { name: string; description: string; womenOnly: boolean }) => {
    const r = await act.run(() => createClub(token!, b));
    if (r) { setCreating(false); clubs.reload(); open(r.value); }
  };
  return (
    <Screen tabs brand overlay={<CreateClubSheet open={creating} busy={act.busy} problem={act.problem} onSubmit={(b) => void create(b)} onClose={() => { setCreating(false); act.clear(); }} />}>
      <PageTitle>Clubs</PageTitle>
      {!signedIn ? (
        <Card style={{ gap: space[4] }}>
          <Text variant="label" tone="muted">Sign in with the same email link as moto-trails.com to see your clubs.</Text>
          <Button icon={LogIn} label="Sign in" onPress={() => router.push('/you')} />
        </Card>
      ) : clubs.error && !clubs.data ? (
        <Card style={{ gap: space[4] }}>
          <Text variant="label" tone="stop">{clubs.error}</Text>
          <Button variant="soft" label="Try again" onPress={clubs.reload} />
        </Card>
      ) : !clubs.data ? (
        <Text variant="body" tone="muted">Loading…</Text>
      ) : (
        <>
          <SectionTitle first onAdd={() => setCreating(true)} addLabel="Start a club">Your clubs</SectionTitle>
          {mine.length ? <View style={{ gap: space[3] }}>{mine.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
            : <EmptyState icon={Users} title="No club yet" body="Ask to join a club below, or start one with the + button." />}
          {others.length ? (
            <>
              <SectionTitle>Find a club</SectionTitle>
              <View style={{ gap: space[3] }}>{others.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
