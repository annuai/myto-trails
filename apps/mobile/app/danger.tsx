import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Trash2, UserX } from 'lucide-react-native';
import { eraseEverything } from '@/lib/eraseAll';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The two things that cannot be undone, kept off the You page so they are never tapped by accident. */
export default function DangerZone() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [confirm, setConfirm] = useState(false);
  const erase = () => { eraseEverything(token); setConfirm(false); router.replace('/'); };
  return (
    <Screen overlay={
      <Sheet open={confirm} title="Erase all my data?" onClose={() => setConfirm(false)}>
        <Text variant="body" tone="muted">This removes your rides, ride journals, trips, routes, to-dos, documents and contacts from this phone, and signs you out. It cannot be undone.</Text>
        <Button label="Erase everything" variant="danger" icon={Trash2} onPress={erase} />
        <Button label="Keep my data" variant="soft" onPress={() => setConfirm(false)} />
      </Sheet>
    }>
      <BackHeader title="You" />
      <PageTitle sub="Neither of these can be undone.">Danger zone</PageTitle>
      <Card style={{ gap: space[3] }}>
        <Text variant="bodyMedium">Erase all my data</Text>
        <Text variant="label" tone="muted">Removes everything this app keeps on this phone: rides, journals, trips, routes, to-dos, documents and emergency contacts. Your account stays.</Text>
        <Button variant="danger" icon={Trash2} label="Erase all my data" onPress={() => setConfirm(true)} />
      </Card>
      <Card style={{ gap: space[3], marginTop: space[4] }}>
        <Text variant="bodyMedium">Delete account</Text>
        <Text variant="label" tone="muted">{token ? 'Deletes your Moto Trails account, your profile and your saved trails. What is kept on this phone is not touched.' : 'Sign in to delete your account.'}</Text>
        <Button variant="danger" icon={UserX} label="Delete account" disabled={!token} onPress={() => router.push('/delete-account')} />
      </Card>
    </Screen>
  );
}
