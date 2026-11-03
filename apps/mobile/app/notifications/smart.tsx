import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BREAK_CHOICES, breakLabel, DEFAULT_BREAK_MIN } from '@/lib/breakReminder';
import { clockLabel } from '@/lib/community';
import { DEFAULT_HABIT_LEAD_MIN, findHabits, HABIT_LEAD_CHOICES } from '@/lib/habit';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { Checkbox } from '@/ui/Checkbox';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useNotifications } from '@/store/notifications';
import { useRides } from '@/store/rides';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The reminders that work out when to speak up: from the times the rider usually rides, the light left, and how long they have been riding. */
export default function SmartNotifications() {
  const prefs = useNotifications((s) => s.prefs);
  const rides = useRides((s) => s.rides);
  // Read the clock once when the screen opens: the times it shows do not change while it is on screen.
  const [now] = useState(Date.now);
  const habits = useMemo(() => findHabits(rides, now), [rides, now]);
  const set = useNotifications.getState();

  return (
    <Screen>
      <BackHeader title="Smart notifications" />
      <PageTitle sub="Worked out on this phone from your own rides. Nothing about them is sent anywhere.">Smart reminders</PageTitle>
      <ListCard>
        <Row label="Ready for your next ride?" sub="Before the time of day you usually set off, once you have ridden then on three days" chevron={false}
          right={<Checkbox checked={prefs.habit} label="Ready for your next ride?" onChange={(v) => set.setPref('habit', v)} />} />
        <Row label="Daylight alert" sub="About 45 minutes before sunset while you ride" chevron={false}
          right={<Checkbox checked={prefs.daylightAlert} label="Daylight alert" onChange={(v) => set.setPref('daylightAlert', v)} />} />
      </ListCard>
      <SectionTitle>Your usual ride times</SectionTitle>
      <Card style={{ gap: space[2] }}>
        {habits.length ? habits.map((h) => (
          <Text key={h.startMin} variant="label">{`Around ${clockLabel(h.startMin)} · ${h.weekdays.slice().sort().map((d) => DAYS[d]).join(', ')}`}</Text>
        )) : <Text variant="label" tone="muted">Nothing yet. After rides at about the same time on three different days in three weeks, the times show here.</Text>}
      </Card>
      <SectionTitle>How early to remind you</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">How long before your usual time to be asked if you are ready.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {HABIT_LEAD_CHOICES.map((m) => <ChoiceChip key={m} label={`${m} min`} selected={(prefs.habitLeadMin ?? DEFAULT_HABIT_LEAD_MIN) === m} onPress={() => set.setHabitLead(m)} />)}
        </View>
      </Card>
      <SectionTitle>Break reminder</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">How long you can ride without a stop of 10 minutes before you are reminded to take a break. A buzz and a sound come with it.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {BREAK_CHOICES.map((m) => <ChoiceChip key={m} label={breakLabel(m)} selected={(prefs.breakEveryMin ?? DEFAULT_BREAK_MIN) === m} onPress={() => set.setBreakEvery(m)} />)}
        </View>
      </Card>
    </Screen>
  );
}
