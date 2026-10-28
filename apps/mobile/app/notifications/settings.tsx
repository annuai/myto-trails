import { useState } from 'react';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { notifier } from '@/lib/notifier';
import { usePermission } from '@/lib/usePermission';
import { syncReminders } from '@/NotificationHost';
import { useNotifications } from '@/store/notifications';
import type { Prefs } from '@/store/notificationsCore';

const toggles: { key: keyof Prefs; label: string; sub: string }[] = [
  { key: 'todos', label: 'To-dos and documents', sub: 'A week, a day and the day it is due, and once if it is overdue' },
  { key: 'trips', label: 'Trip plans', sub: '9 pm the evening before, and 7:30 am on ride day' },
  { key: 'paused', label: 'Ride paused', sub: 'After 30 minutes paused, so a ride is not forgotten' },
  { key: 'showDetails', label: 'Show details on the lock screen', sub: 'Off: a reminder only says "Myto Moto reminder"' },
];

/** Which reminders to send, and whether the phone allows them. */
export default function NotificationSettings() {
  const prefs = useNotifications((s) => s.prefs);
  const { permission, refresh } = usePermission();
  const [note, setNote] = useState<string>();

  const turnOn = async () => { await notifier.request(); refresh(); await syncReminders().catch(() => undefined); };
  const test = async () => {
    setNote(undefined);
    if ((await notifier.permission()) !== 'granted') return setNote('Turn on notifications first.');
    await notifier.notifyNow({ id: `test:${Date.now()}`, fireAt: Date.now(), title: prefs.showDetails ? 'Test reminder' : 'Myto Moto reminder', body: prefs.showDetails ? 'Reminders work on this phone' : 'This is how a reminder looks', route: '/notifications' });
  };

  return (
    <Screen>
      <BackHeader title="Notifications" />
      <PageTitle sub="Reminders are scheduled on this phone. Nothing about them is sent anywhere.">Reminders</PageTitle>
      {permission === 'granted' ? null : permission === 'denied' ? (
        <>
          <Text variant="label" tone="muted">Notifications are off for Myto Moto in the phone's settings.</Text>
          <Button label="Open phone settings" onPress={() => notifier.openSettings()} />
        </>
      ) : permission === 'undetermined' ? (
        <>
          <Text variant="label" tone="muted">Myto Moto can remind you before a to-do is due or the day before a ride.</Text>
          <Button label="Turn on notifications" onPress={() => void turnOn()} />
        </>
      ) : null}
      <SectionTitle>Send me</SectionTitle>
      <ListCard>
        {toggles.map((t) => (
          <Row key={t.key} label={t.label} sub={t.sub} chevron={false}
            right={<Checkbox checked={prefs[t.key]} label={t.label} onChange={(v) => useNotifications.getState().setPref(t.key, v)} />} />
        ))}
      </ListCard>
      <SectionTitle>Check it works</SectionTitle>
      <Button variant="soft" label="Send a test notification" onPress={() => void test()} />
      {note ? <Text variant="label" tone="stop" style={{ marginTop: 12 }}>{note}</Text> : null}
    </Screen>
  );
}
