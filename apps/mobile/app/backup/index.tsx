import { useRouter } from 'expo-router';
import { Cloud, Download, Upload } from 'lucide-react-native';
import { useSync, waitingCount } from '@/store/sync';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

/** Everything about keeping your data safe, in one place: a file you keep (export and import) and syncing between your phones. */
export default function BackupAndSync() {
  const router = useRouter();
  const sync = useSync();
  const waiting = waitingCount(sync);
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="A file you keep, or the same rides, trips and to-dos on every phone you sign in on.">Backup & Sync</PageTitle>
      <ListCard>
        <Row icon={Upload} label="Export my data" sub="One encrypted file you keep" onPress={() => router.push('/backup/export')} />
        <Row icon={Download} label="Import data" sub="From a Myto Moto backup file" onPress={() => router.push('/backup/import')} />
        <Row icon={Cloud} label="Sync across phones" sub={sync.enabled ? (sync.lastError ?? (waiting > 0 ? `Waiting to sync: ${waiting}` : 'Up to date')) : 'Rides, trips and to-dos on every phone you sign in on'} value={sync.enabled ? 'On' : 'Off'} onPress={() => router.push('/sync')} />
      </ListCard>
    </Screen>
  );
}
