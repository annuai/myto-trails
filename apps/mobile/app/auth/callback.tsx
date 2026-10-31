import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { finishSignIn } from '@/lib/signIn';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Where the website sends the web build after sign-in (phones use the myto:// link instead). */
export default function AuthCallback() {
  const { code, state } = useLocalSearchParams<{ code?: string; state?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    finishSignIn(String(code ?? ''), String(state ?? '')).then((next) => router.replace(next as never)).catch((e: Error) => setError(e.message));
  }, [code, state, router]);
  return (
    <Screen>
      <PageTitle>Signing you in</PageTitle>
      {error ? (<><Text variant="body" tone="stop">{error}</Text><Button label="Back" variant="soft" onPress={() => router.replace('/you')} /></>) : <ActivityIndicator />}
    </Screen>
  );
}
