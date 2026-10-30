import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CONTACT_EMAIL } from '@moto-trails/domain';
import { Globe } from 'lucide-react-native';
import { ApiFailure } from '@/api/client';
import { registerInterest } from '@/api/countries';
import { validEmail } from '@/lib/browsing';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** A country we are not open in yet. Says so plainly, says we plan to open soon, and offers one email when it happens. */
export default function ComingSoon() {
  const router = useRouter();
  const { iso2, name } = useLocalSearchParams<{ iso2: string; name?: string }>();
  const country = name || iso2 || 'this country';
  const [email, setEmail] = useState(useAuth.getState().user?.email ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string>();

  const send = async () => {
    if (!iso2) return;
    if (!validEmail(email)) return setError('Enter a valid email address.');
    setError(undefined);
    setState('sending');
    try {
      await registerInterest(iso2, email.trim());
      setState('done');
    } catch (e) {
      setState('idle');
      setError(e instanceof ApiFailure && e.status === 429 ? 'Too many tries. Please wait a little and try again.' : e instanceof ApiFailure && e.status === 409 ? 'Moto Trails is already open there. Pick it from the country list.' : e instanceof ApiFailure && e.status === 400 ? 'That email address does not look right.' : e instanceof ApiFailure ? e.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <Screen>
      <BackHeader title="Country" />
      <PageTitle sub="We plan to open there soon.">{`Coming soon to ${country}`}</PageTitle>
      {state === 'done' ? (
        <View style={{ gap: space[4] }}>
          <EmptyState icon={Globe} title="You're on the list" body={`We'll email you once, when Moto Trails opens in ${country}. Nothing else.`} />
          <Button variant="soft" label="Back to the open countries" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          <Text variant="body" tone="muted">{`Moto Trails isn't open in ${country} yet. Every trail needs someone who can check whether riding it is allowed there, so we open one country at a time. Trails in the countries we are open in stay available.`}</Text>
          <Field label="Your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error} />
          <Text variant="caption" tone="muted">{`We'll email you once, when Moto Trails opens in ${country}. Nothing else. To have your email removed, write to ${CONTACT_EMAIL}.`}</Text>
          <Button label="Tell me when it opens" disabled={state === 'sending'} onPress={() => void send()} />
          <Button variant="soft" label="Not now" onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}
