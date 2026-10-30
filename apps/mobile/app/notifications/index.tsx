import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Bell, CalendarClock, ClipboardList, Pause, Settings, Trash2 } from 'lucide-react-native';
import { formatShort, toISO } from '@/lib/dates';
import { useNotifications } from '@/store/notifications';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

const iconFor = { todo: ClipboardList, trip: CalendarClock, ride: Pause } as const;
const when = (at: number) => `${formatShort(toISO(new Date(at)))}, ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

/** Reminders that have come due, newest first. Each can be cleared on its own. */
export default function Notifications() {
  const router = useRouter();
  const inbox = useNotifications((s) => s.inbox);
  useEffect(() => { useNotifications.getState().markAllRead(); }, []);
  return (
    <Screen>
      <BackHeader title="Back" right={<IconButton icon={Settings} label="Notification settings" onPress={() => router.push('/notifications/settings')} plain />} />
      <PageTitle sub="Reminders for your to-dos and trips. They stay on this phone.">Notifications</PageTitle>
      {inbox.length ? (
        <ListCard>
          {inbox.map((n) => (
            <Row key={n.id} icon={iconFor[n.kind]} label={n.title} sub={`${n.body} · ${when(n.at)}`} chevron={false}
              right={<IconButton icon={Trash2} label={`Clear ${n.title}`} onPress={() => useNotifications.getState().clear(n.id)} plain size={44} />} />
          ))}
        </ListCard>
      ) : <EmptyState icon={Bell} title="You're all caught up" body="Reminders for due to-dos and upcoming trips show up here." />}
    </Screen>
  );
}
