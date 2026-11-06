import { useMemo } from 'react';
import { View } from 'react-native';
import { Navigation2 } from 'lucide-react-native';
import { formatShort, toISO } from '@/lib/dates';
import { NUDGE_META } from '@/lib/nudge/types';
import { syncReminders } from '@/NotificationHost';
import { useNudges } from '@/store/nudges';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const when = (at: number) => `${formatShort(toISO(new Date(at)))}, ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

/** What the ride nudges have planned, and what they have already sent: so a rider can see why a nudge comes, and that there are few. */
export default function PlannedNudges() {
  const level = useNudges((s) => s.level);
  const planned = useNudges((s) => s.planned);
  const history = useNudges((s) => s.history);
  const past = useMemo(() => [...history].reverse().slice(0, 12), [history]);
  return (
    <Screen>
      <BackHeader title="Smart reminders" />
      <PageTitle sub="Worked out on this phone, and rebuilt every time you open the app.">Planned nudges</PageTitle>
      {!level || level === 'off' ? <EmptyState icon={Navigation2} title="Ride nudges are off" body="Turn them on in Smart reminders to get an occasional idea to go riding." /> : (
        <>
          <SectionTitle first>Coming up</SectionTitle>
          {planned.length ? (
            <ListCard>{planned.map((n) => <Row key={n.id} icon={Navigation2} label={n.title} sub={`${NUDGE_META[n.type].label} · ${when(n.fireAt)}`} chevron={false} />)}</ListCard>
          ) : <Text variant="label" tone="muted">Nothing planned. That is normal: a nudge only appears when there is a good reason, and never more than about one a week.</Text>}
          <SectionTitle>Recently sent</SectionTitle>
          {past.length ? (
            <ListCard>{past.map((h) => <Row key={h.id} label={NUDGE_META[h.type].label} sub={`${when(h.fireAt)} · ${h.opened ? 'opened' : 'not opened'}`} chevron={false} />)}</ListCard>
          ) : <Text variant="label" tone="muted">None yet.</Text>}
          <Text variant="caption" tone="muted" style={{ marginTop: space[4] }}>If you do not open them, there are fewer. A kind that is ignored four times rests for three weeks.</Text>
          <View style={{ marginTop: space[4] }}><Button variant="soft" label="Plan again now" onPress={() => void syncReminders()} /></View>
        </>
      )}
    </Screen>
  );
}
