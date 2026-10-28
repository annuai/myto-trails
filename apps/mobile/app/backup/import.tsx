import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FileUp } from 'lucide-react-native';
import { discardPickedBackup, phoneTarget, pickBackupFile, withBackup } from '@/lib/backup/device';
import { BackupError } from '@/lib/backup/format';
import { applyBackup, summarize, type ImportMode, type Summary } from '@/lib/backup/import';
import { BackupSummary } from '@/ui/BackupSummary';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { PassphraseField } from '@/ui/PassphraseField';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function ImportBackup() {
  const router = useRouter();
  const [uri, setUri] = useState<string>();
  const [pass, setPass] = useState('');
  const [summary, setSummary] = useState<Summary>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(undefined);
    try { await fn(); } catch (e) { setError(e instanceof BackupError ? e.message : 'Something went wrong. Nothing was changed.'); } finally { setBusy(false); }
  };
  // The picked file is a private copy in the cache: remove it when this screen goes away.
  useEffect(() => () => { if (uri) discardPickedBackup(uri); }, [uri]);
  const choose = () => run(async () => { const u = await pickBackupFile(); if (u !== undefined) setUri(u); });
  // Opening reads only the header and the data; the photos and voice notes are read one at a time when you restore.
  const unlock = () => run(async () => { if (uri) setSummary(await withBackup(uri, pass, async (o) => summarize(o.meta))); });
  const apply = (mode: ImportMode) => run(async () => { if (uri) { await withBackup(uri, pass, (o) => applyBackup(o, mode, phoneTarget)); setDone(true); } });

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Open a .myto backup made with Export my data.">Import data</PageTitle>
      <Stack gap={5}>
        {done ? (
          <Stack gap={3}><Text variant="label" tone="good">Backup restored.</Text><Button label="Done" onPress={() => router.back()} /></Stack>
        ) : summary ? (
          <>
            <BackupSummary summary={summary} />
            <Text variant="caption" tone="muted">Replace swaps everything on this phone for the backup. Merge adds what is missing and, when both have the same item, keeps the one changed last.</Text>
            <Button label="Merge with what is on this phone" disabled={busy} onPress={() => void apply('merge')} />
            <Button variant="danger" label="Replace everything on this phone" disabled={busy} onPress={() => void apply('replace')} />
          </>
        ) : uri !== undefined ? (
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
