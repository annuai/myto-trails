import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { exportToShareSheet } from '@/lib/backup/device';
import { BackupError, MIN_PASSPHRASE_LENGTH } from '@/lib/backup/format';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { PassphraseField, passphraseHint } from '@/ui/PassphraseField';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function ExportBackup() {
  const router = useRouter();
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const go = async () => {
    if (pass.length < MIN_PASSPHRASE_LENGTH) return setError(`Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`);
    if (pass !== again) return setError('The two passphrases are not the same.');
    setBusy(true); setError(undefined);
    try {
      const shared = await exportToShareSheet(pass);
      if (shared) setDone(true); else setError('Sharing is not available on this device.');
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'Could not create the backup.');
    } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button icon={Share2} label={busy ? 'Encrypting…' : 'Create and share backup'} disabled={busy} onPress={() => void go()} />}>
      <BackHeader title="You" />
      <PageTitle sub="One encrypted file with your rides, ride journals (notes, photos and voice notes), to-dos, documents, document photos and emergency details.">Export my data</PageTitle>
      <Stack gap={5}>
        <Banner eyebrow="Cannot be recovered" title="If you forget the passphrase, nobody can open the backup, not even us." />
        <PassphraseField value={pass} onChange={setPass} hint={passphraseHint} />
        <PassphraseField label="Passphrase again" value={again} onChange={setAgain} />
        <Text variant="caption" tone="muted">Your sign-in, downloaded trail packs and unsent quotes are not included.</Text>
        {error ? <Text variant="label" tone="stop">{error}</Text> : null}
        {done ? <Stack gap={3}><Text variant="label" tone="good">Backup shared. Keep the file and the passphrase safe.</Text><Button variant="soft" label="Done" onPress={() => router.back()} /></Stack> : null}
      </Stack>
    </Screen>
  );
}
