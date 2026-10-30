import { useRouter } from 'expo-router';
import { Stamp } from 'lucide-react-native';
import { useRidden } from '@/features/passport/useRidden';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { deviceLocale } from '@/lib/locale';

const month = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(deviceLocale(), { month: 'short', year: 'numeric' });

/** The trails the rider says they have ridden. Marked from a trail's page; kept on their account. */
export default function Passport() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const { items, error, reload } = useRidden();
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub={items ? `${items.length} ${items.length === 1 ? 'trail' : 'trails'} ridden` : undefined}>Trails ridden</PageTitle>
      {!token ? <EmptyState icon={Stamp} title="Sign in to keep your list" body="Mark a trail as ridden from its page and it appears here, on any phone you sign in on." />
        : error && !items ? <><Text variant="label" tone="stop">{error}</Text><Button variant="soft" label="Try again" onPress={reload} /></>
        : !items ? <Text variant="label" tone="muted">Loading…</Text>
        : items.length === 0 ? <EmptyState icon={Stamp} title="Your trail list starts here" body="Open a trail you have ridden and tap I've ridden this." />
        : (
          <ListCard>
            {items.map((t) => <Row key={t.slug} icon={Stamp} label={t.name} sub={[t.riddenMonth && month(t.riddenMonth), t.bike].filter(Boolean).join(' · ') || undefined} onPress={() => router.push(`/trail/${t.slug}`)} />)}
          </ListCard>
        )}
    </Screen>
  );
}
