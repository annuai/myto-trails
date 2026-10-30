import { View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useCrash } from '@/store/crash';
import { useCompanion } from '@/store/companion';
import { useProfile } from '@/store/profile';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useRouter } from 'expo-router';

/** Crash detection: the switch, what it does and does not do, and a way to see the alert without crashing. */
export default function Safety() {
  const router = useRouter();
  const enabled = useCrash((s) => s.enabled);
  const group = useCompanion((s) => !!s.group);
  const contacts = useProfile((s) => s.contacts.length);

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Beta. Not tested on real falls.">Crash detection</PageTitle>
      <ListCard>
        <Row icon={ShieldAlert} label="Watch for crashes while I ride" sub="Uses the phone's motion sensors and GPS. Off by default." chevron={false}
          right={<Checkbox checked={enabled} label="Watch for crashes while I ride" onChange={(v) => useCrash.getState().setEnabled(v)} />} />
      </ListCard>
      <SectionTitle>What happens</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">If a hard impact at speed is followed by the bike stopping dead and staying still, the phone buzzes and asks &ldquo;Are you OK?&rdquo; for 60 seconds. Tap I&rsquo;m OK, on the screen or on the lock screen notification, to cancel.</Text>
        <Text variant="label" tone="muted">If you do not answer on a group ride, your group is told you need help, the same as pressing Help. The screen then offers a call to your main contact and to the emergency number for where you are. You can change that number on the screen.</Text>
        <Text variant="labelMedium" tone="stop">It does not message or call anyone by itself. Ride alone and nobody is told unless you call. The phone must be on the bike or on you, with Myto Moto recording the ride.</Text>
      </Card>
      {contacts === 0 ? (
        <>
          <SectionTitle>Add someone to call</SectionTitle>
          <View style={{ gap: space[3] }}>
            <Text variant="label" tone="muted">There are no emergency contacts yet, so the call buttons would only offer the emergency number for where you are.</Text>
            <Button variant="soft" label="Add emergency contacts" onPress={() => router.push('/documents/contacts')} />
          </View>
        </>
      ) : null}
      <SectionTitle>Check it works</SectionTitle>
      <View style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">{group ? 'A test shows the same screens. It does not tell your group.' : 'A test shows the same screens and sends nothing.'}</Text>
        <Button variant="soft" label="Test the alert" onPress={() => { useCrash.getState().begin(Date.now(), true); router.back(); }} />
      </View>
    </Screen>
  );
}
