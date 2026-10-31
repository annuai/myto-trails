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
import { NotOpenNotice } from '@/ui/NotOpenNotice';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
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
  const [text, setText] = useState('');
  const act = useAction();
  const clubs = useClubs(text);
  const { mine, others } = clubs;
  const searching = clubs.searched.length > 0;
  const open = (id: string) => router.push(`/club/${id}`);
  const create = async (b: { name: string; description: string; womenOnly: boolean }) => {
    const r = await act.run(() => createClub(token!, b));
    if (r) { setCreating(false); clubs.reload(); open(r.value); }
  };
  return (
    <Screen tabs brand onNearEnd={signedIn && others.hasMore ? others.loadMore : undefined} overlay={<CreateClubSheet open={creating} busy={act.busy} problem={act.problem} onSubmit={(b) => void create(b)} onClose={() => { setCreating(false); act.clear(); }} />}>
      <PageTitle>Clubs</PageTitle>
      <NotOpenNotice />
      {signedIn ? <Field label="Search" placeholder="Club name or what it is about" value={text} onChangeText={setText} returnKeyType="search" /> : null}
      {!signedIn ? (
        <Card style={{ gap: space[4] }}>
          <Text variant="label" tone="muted">Sign in with the same email link as moto-trails.com to see your clubs.</Text>
          <Button icon={LogIn} label="Sign in" onPress={() => router.push('/you')} />
        </Card>
      ) : mine.error && !mine.data ? (
        <Card style={{ gap: space[4] }}>
          <Text variant="label" tone="stop">{mine.error}</Text>
          <Button variant="soft" label="Try again" onPress={clubs.reload} />
        </Card>
      ) : !mine.data ? (
        <Text variant="body" tone="muted">Loading…</Text>
      ) : (
        <>
          <SectionTitle first onAdd={() => setCreating(true)} addLabel="Start a club">Your clubs</SectionTitle>
          {mine.data.length ? <View style={{ gap: space[3] }}>{mine.data.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
            : searching ? null : <EmptyState icon={Users} title="Find your people" body="Ask to join a club below, or start your own with the + button." />}
          {others.items.length ? (
            <>
              <SectionTitle>Find a club</SectionTitle>
              <View style={{ gap: space[3] }}>{others.items.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
              {others.loadingMore ? <Text variant="label" tone="muted" style={{ textAlign: 'center', marginTop: space[4] }}>Loading more clubs…</Text> : null}
              {others.error ? <View style={{ marginTop: space[4], gap: space[2] }}><Text variant="label" tone="stop">{others.error}</Text><Button variant="soft" label="Try again" onPress={others.loadMore} /></View> : null}
            </>
          ) : others.error ? (
            <View style={{ marginTop: space[4], gap: space[2] }}><Text variant="label" tone="stop">{others.error}</Text><Button variant="soft" label="Try again" onPress={clubs.reload} /></View>
          ) : others.loading ? <Text variant="label" tone="muted" style={{ marginTop: space[4] }}>{searching ? 'Searching…' : 'Loading clubs…'}</Text> : null}
          {searching && others.loaded && !others.loading && !mine.data.length && !others.items.length && !others.error ? <EmptyState icon={Users} title="No clubs match" body="Try another name, or start your own with the + button." /> : null}
        </>
      )}
    </Screen>
  );
}
