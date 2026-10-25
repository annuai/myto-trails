import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, Users } from 'lucide-react-native';
import { useClubs } from '@/api/useApi';
import type { ClubSummary } from '@/api/types';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { EmptyState } from '@/ui/EmptyState';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ScalePressable } from '@/ui/motion';

function ClubCard({ club, onPress }: { club: ClubSummary; onPress: () => void }) {
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress}>
      <Card padded={false}>
        <ClubCover name={club.name} url={club.coverUrl} height={110} />
        <View style={{ padding: 16, gap: 4 }}>
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
  const router = useRouter();
  const signedIn = !!useAuth((s) => s.token);
  const clubs = useClubs();
  const mine = clubs.data?.filter((c) => c.role) ?? [];
  const others = clubs.data?.filter((c) => !c.role) ?? [];
  const open = (id: string) => router.push(`/club/${id}`);
  return (
    <Screen tabs brand>
      <PageTitle>Clubs</PageTitle>
      {!signedIn ? (
        <Card style={{ gap: 14 }}>
          <Text variant="label" tone="muted">Sign in with the same email link as moto-trails.com to see your clubs.</Text>
          <Button icon={LogIn} label="Sign in" onPress={() => router.push('/you')} />
        </Card>
      ) : clubs.error && !clubs.data ? (
        <Card style={{ gap: 14 }}>
          <Text variant="label" tone="stop">{clubs.error}</Text>
          <Button variant="soft" label="Try again" onPress={clubs.reload} />
        </Card>
      ) : !clubs.data ? (
        <Text variant="body" tone="muted">Loading…</Text>
      ) : (
        <>
          <SectionTitle>Your clubs</SectionTitle>
          {mine.length ? <View style={{ gap: 12 }}>{mine.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
            : <EmptyState icon={Users} title="No club yet" body="Ask to join a club below, or start one on moto-trails.com." />}
          {others.length ? (
            <>
              <SectionTitle>Find a club</SectionTitle>
              <View style={{ gap: 12 }}>{others.map((c) => <ClubCard key={c.clubId} club={c} onPress={() => open(c.clubId)} />)}</View>
            </>
          ) : null}
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 24 }}>Joining, posts and ride plans are on moto-trails.com for now.</Text>
        </>
      )}
    </Screen>
  );
}
