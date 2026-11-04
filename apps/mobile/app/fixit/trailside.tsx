import { useRouter } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { trailsideGuides } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { space } from '@/theme/tokens';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** For a rider stopped on the road: a short list of the common faults, each opening one big step at a time. */
export default function Trailside() {
  const router = useRouter();
  const content = useFixitContent();
  return (
    <Screen>
      <BackHeader title="Fix it" />
      <PageTitle sub="Pick what is wrong. You will get one step at a time.">Roadside</PageTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: space[4] }}>Hurt or in danger? Hold SOS on the ride screen instead.</Text>
      {!content ? <Unavailable /> : <ListCard>
        {trailsideGuides(content).map((g) => <Row key={g.id} icon={Wrench} label={g.title} sub={`${g.minutes} min`} onPress={() => router.push(`/fixit/${g.id}?walk=1`)} />)}
        <Row label="Something else" sub="All the guides" onPress={() => router.push('/fixit')} />
      </ListCard>}
    </Screen>
  );
}
