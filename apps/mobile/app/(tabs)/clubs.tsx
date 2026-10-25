import { useState } from 'react';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import { Button } from '@/ui/Button';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { HeroCard } from '@/ui/HeroCard';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Clubs() {
  const [rsvp, setRsvp] = useState<'going' | 'maybe' | undefined>();
  return (
    <Screen tabs brand>
      <PageTitle>Clubs</PageTitle>
      <HeroCard eyebrow="Sunday ride" title="Ridge sunrise run">
        <Text variant="label" tone="muted">Dawn Riders · {rsvp === 'going' ? 10 : 9} going · {rsvp === 'maybe' ? 4 : 3} maybe</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label={rsvp === 'going' ? 'You are going' : 'Going'} variant={rsvp === 'going' ? 'accent' : 'primary'} flex onPress={() => setRsvp('going')} />
          <Button label={rsvp === 'maybe' ? 'Maybe' : 'Maybe'} variant="soft" flex onPress={() => setRsvp('maybe')} />
        </View>
      </HeroCard>
      <SectionTitle>Your clubs</SectionTitle>
      <ListCard>
        <Row icon={Users} label="Dawn Riders" value="24 members" chevron />
        <Row icon={Users} label="Weekend Gravel" value="11 members" chevron />
      </ListCard>
      <View style={{ marginTop: 12 }}><Button variant="soft" label="Find a club" arrow /></View>
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 24 }}>Sample data. Live location and chat are not in the first release.</Text>
    </Screen>
  );
}
