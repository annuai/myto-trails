import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SYNC_LIMITS } from '@moto-trails/domain';
import { getSyncUsage, type SyncUsage } from '@/api/sync';
import { disableSync, enableSync, syncNow } from '@/lib/sync/syncNow';
import { startSignIn } from '@/lib/signIn';
import { useAuth } from '@/store/auth';
import { useSync, waitingCount } from '@/store/sync';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const MB = 1024 * 1024;

function ago(at: number | null, now = Date.now()): string {
  if (!at) return 'Not yet';
  const m = Math.round((now - at) / 60_000);
  return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

/** Sync across phones: off until the rider turns it on, with plain words about what leaves the phone. */
export default function SyncScreen() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const s = useSync();
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<SyncUsage>();
  const [note, setNote] = useState<string>();

  const loadUsage = useCallback(() => { if (token && s.enabled) void getSyncUsage(token).then(setUsage).catch(() => undefined); }, [token, s.enabled]);
  useEffect(loadUsage, [loadUsage, s.lastSyncedAt]);

  const run = async (f: () => Promise<void>, failed: string) => {
    setBusy(true); setNote(undefined);
    try { await f(); } catch { setNote(failed); } finally { setBusy(false); }
  };
  const waiting = waitingCount(s);

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Your rides, trips and to-dos on every phone you sign in on, and safe if you lose one.">Sync</PageTitle>

      {/* One column with a gap, so a note never touches the card or button next to it. */}
      <View style={{ gap: space[3] }}>
        {!token ? (
          <>
            <Text variant="label" tone="muted">Sign in to sync. Your account is how Myto Moto knows which phones are yours.</Text>
            <Button label="Sign in" onPress={() => void startSignIn('/sync')} />
          </>
        ) : !s.enabled ? (
          <>
            <Card style={{ gap: space[3] }}>
              <Text variant="label">What is sent</Text>
              <Text variant="label" tone="muted">Your rides with their routes, your trips and your to-dos. They are stored on Myto Moto&apos;s servers, tied to your account, so another phone of yours can show them.</Text>
              <Text variant="label">What stays on this phone</Text>
              <Text variant="label" tone="muted">Photos, voice notes, documents, licence, medical details and backups. Nothing else is read.</Text>
              <Text variant="label">Your control</Text>
              <Text variant="label" tone="muted">{`Up to ${SYNC_LIMITS.maxRides} rides and ${SYNC_LIMITS.maxTrackTotalBytes / MB} MB of routes. Turn sync off any time, and delete your copy from here. Deleting your account deletes it too.`}</Text>
            </Card>
            <Button label="Turn on sync" disabled={busy} onPress={() => void run(enableSync, 'Could not turn on sync. Try again.')} />
          </>
        ) : (
          <>
            <SectionTitle first>Status</SectionTitle>
            <ListCard>
              <Row label="Last synced" value={ago(s.lastSyncedAt)} chevron={false} />
              <Row label="Waiting to sync" value={String(waiting)} chevron={false} />
              {usage ? <Row label="Rides in the cloud" value={`${usage.rides} of ${usage.maxRides}`} sub={`${(usage.trackBytes / MB).toFixed(1)} of ${usage.maxTrackBytes / MB} MB of routes`} chevron={false} /> : null}
            </ListCard>
            {s.blocked === 'quota' ? <Text variant="label" tone="stop">{`Your cloud copy is full (${SYNC_LIMITS.maxRides} rides). Delete rides you no longer need and the rest will follow.`}</Text> : null}
            {s.skipped > 0 ? <Text variant="label" tone="muted">{`${s.skipped} item${s.skipped === 1 ? ' is' : 's are'} too large to sync and stay on this phone.`}</Text> : null}
            {s.lastError ? <Text variant="label" tone="stop">{s.lastError}</Text> : null}
            <Button variant="soft" label={busy ? 'Syncing…' : 'Sync now'} disabled={busy} onPress={() => void run(syncNow, 'Sync failed. Try again.')} />
            <SectionTitle>Turn off</SectionTitle>
            <Button variant="soft" label="Turn off sync" disabled={busy} onPress={() => void run(() => disableSync({ eraseCloud: false }), 'Could not turn off sync.')} />
            <Button variant="danger" label="Delete my cloud copy" disabled={busy} onPress={() => void run(() => disableSync({ eraseCloud: true }), 'Could not delete your cloud copy. Check your connection and try again.')} />
            <Text variant="label" tone="muted">Your phones keep their own rides, trips and to-dos either way.</Text>
          </>
        )}
        {note ? <Text variant="label" tone="stop">{note}</Text> : null}
        {!s.enabled ? <Button variant="soft" label="Back" onPress={() => router.back()} /> : null}
      </View>
    </Screen>
  );
}
