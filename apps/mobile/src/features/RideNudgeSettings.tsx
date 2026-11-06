import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { notifier } from '@/lib/notifier';
import { NUDGE_META, NUDGE_TYPES, type NudgeLevel } from '@/lib/nudge/types';
import { syncReminders } from '@/NotificationHost';
import { useNudges } from '@/store/nudges';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { ChoiceChip } from '@/ui/Chip';
import { SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';

export const LEVELS: { level: NudgeLevel; label: string; line: string }[] = [
  { level: 'off', label: 'Off', line: 'No ride nudges.' },
  { level: 'occasional', label: 'Occasional', line: 'About one a week at most, when there is a good reason.' },
  { level: 'regular', label: 'Regular', line: 'Up to two a week.' },
];

/** Choosing a level turns nudges on and asks the phone for permission if it has not been asked. Used in Smart reminders and in the question after a first ride. */
export async function chooseNudgeLevel(level: NudgeLevel) {
  useNudges.getState().setLevel(level);
  if (level !== 'off' && (await notifier.permission()) === 'undetermined') await notifier.request().catch(() => false);
  void syncReminders();
}

/** Ride nudges in Smart reminders: how often, which kinds, and what is planned. */
export function RideNudgeSettings() {
  const router = useRouter();
  const level = useNudges((s) => s.level);
  const muted = useNudges((s) => s.muted);
  const current = LEVELS.find((l) => l.level === level);
  return (
    <>
      <SectionTitle>Ride nudges</SectionTitle>
      <View style={{ gap: space[3] }}>
      <Card style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">An occasional idea to go for a ride: a dry day coming, a club ride, a weekend that looks free. Never more than one a day, never at night, and fewer the less you open them. Worked out on this phone from your own rides.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {LEVELS.map((l) => <ChoiceChip key={l.level} label={l.label} selected={level === l.level} onPress={() => void chooseNudgeLevel(l.level)} />)}
        </View>
        <Text variant="label" tone="muted">{current ? current.line : 'Not chosen yet. You will be asked after your first ride.'}</Text>
      </Card>
      {level && level !== 'off' ? (
        <>
          <ListCard>
            {NUDGE_TYPES.map((t) => (
              <Row key={t} label={NUDGE_META[t].label} sub={NUDGE_META[t].hint} chevron={false}
                right={<Checkbox checked={!muted.includes(t)} label={NUDGE_META[t].label} onChange={(v) => { useNudges.getState().setMuted(t, !v); void syncReminders(); }} />} />
            ))}
          </ListCard>
          <ListCard><Row label="What is planned" sub="The next nudges, and the ones you have had" onPress={() => router.push('/notifications/nudges')} /></ListCard>
          <Text variant="caption" tone="muted">The weather comes from a free service (Open-Meteo), which is asked about a place rounded to about 11 km, never the exact spot of a ride.</Text>
        </>
      ) : null}
      </View>
    </>
  );
}
