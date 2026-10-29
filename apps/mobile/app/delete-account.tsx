import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { canConfirmDelete, deleteFailureMessage } from '@/lib/deleteAccount';
import { deleteAccount } from '@/lib/signIn';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const GOES = [
  'Your account, your email address and every device signed in to it.',
  'Your profile, picture and bike, and your saved trails.',
  'Your comments, questions and club posts, and the replies other riders wrote under them.',
  'Your club memberships and join requests, including any phone number you gave.',
  'Your drafts, and uploaded photos and route files that were not published.',
];
const STAYS = [
  'Trails you submitted that were published, with their photos and routes. Your name is removed from them.',
  'Problem reports you filed, shown as from a "Former rider".',
];

export default function DeleteAccount() {
  const router = useRouter();
  const email = useAuth((s) => s.user?.email);
  const signedIn = !!useAuth((s) => s.token);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const go = async () => {
    setBusy(true); setError(undefined);
    try {
      await deleteAccount();
      router.replace('/');
    } catch (e) {
      setError(deleteFailureMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button variant="danger" icon={Trash2} label={busy ? 'Deleting…' : 'Delete my account'} disabled={busy || !signedIn || !canConfirmDelete(typed)} onPress={() => void go()} />}>
      <BackHeader title="You" />
      <PageTitle sub={email ? `Signed in as ${email}. This cannot be undone.` : 'This cannot be undone.'}>Delete your account</PageTitle>
      {!signedIn ? <Text variant="label" tone="muted">You are not signed in.</Text> : (
        <Stack gap={5}>
          <Stack gap={2}>
            <SectionTitle>What is deleted</SectionTitle>
            <Card><Stack gap={2}>{GOES.map((t) => <Text key={t} variant="label">• {t}</Text>)}</Stack></Card>
          </Stack>
          <Stack gap={2}>
            <SectionTitle>What stays</SectionTitle>
            <Card><Stack gap={2}>{STAYS.map((t) => <Text key={t} variant="label">• {t}</Text>)}</Stack></Card>
          </Stack>
          <Text variant="caption" tone="muted">Your rides, journal, documents and emergency contacts on this phone are not touched. Use "Erase all my data" in the Danger zone for those.</Text>
          <Field label="Type delete to confirm" value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} />
          {error ? <Text variant="label" tone="stop">{error}</Text> : null}
        </Stack>
      )}
    </Screen>
  );
}
