import { useState } from 'react';
import { useRouter } from 'expo-router';
import { FileUp } from 'lucide-react-native';
import { phoneTarget, pickBackupFile } from '@/lib/backup/device';
import { BackupError, type BackupPayload } from '@/lib/backup/format';
import { applyBackup, openBackup, summarize, type ImportMode } from '@/lib/backup/import';
import { BackupSummary } from '@/ui/BackupSummary';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { PassphraseField } from '@/ui/PassphraseField';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function ImportBackup() {
  const router = useRouter();
  const [text, setText] = useState<string>();
  const [pass, setPass] = useState('');
  const [payload, setPayload] = useState<BackupPayload>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(undefined);
    try { await fn(); } catch (e) { setError(e instanceof BackupError ? e.message : 'Something went wrong. Nothing was changed.'); } finally { setBusy(false); }
  };
  const choose = () => run(async () => { const t = await pickBackupFile(); if (t !== undefined) setText(t); });
  const unlock = () => run(async () => { if (text) setPayload(await openBackup(text, pass)); });
  const apply = (mode: ImportMode) => run(async () => { if (payload) { await applyBackup(payload, mode, phoneTarget); setDone(true); } });

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Open a .myto backup made with Export my data.">Import data</PageTitle>
      <Stack gap={5}>
        {done ? (
          <Stack gap={3}><Text variant="label" tone="good">Backup restored.</Text><Button label="Done" onPress={() => router.back()} /></Stack>
        ) : payload ? (
          <>
            <BackupSummary summary={summarize(payload)} />
            <Text variant="caption" tone="muted">Replace swaps everything on this phone for the backup. Merge adds what is missing and, when both have the same item, keeps the one changed last.</Text>
            <Button label="Merge with what is on this phone" disabled={busy} onPress={() => void apply('merge')} />
            <Button variant="danger" label="Replace everything on this phone" disabled={busy} onPress={() => void apply('replace')} />
          </>
        ) : text !== undefined ? (
          <>
            <PassphraseField value={pass} onChange={setPass} />
            <Button label={busy ? 'Opening…' : 'Open backup'} disabled={busy || !pass} onPress={() => void unlock()} />
          </>
        ) : (
          <Button icon={FileUp} label="Choose backup file" disabled={busy} onPress={() => void choose()} />
        )}
        {error ? <Text variant="label" tone="stop">{error}</Text> : null}
      </Stack>
    </Screen>
  );
}
