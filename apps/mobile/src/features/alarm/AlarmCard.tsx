import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { alarmWorld } from '@/alarmWorld';
import { alarmBackend, androidGaps, openAndroidSetting, requestAlarms, type AlarmBackend } from '@/lib/alarm/backend';
import { LEAD_CHOICES, pickGoal, planLadder, type GoalChoice } from '@/lib/alarm/ladder';
import { rideContexts, type AlarmSetting } from '@/lib/alarm/plan';
import { sunsetClock } from '@/lib/daylight';
import { notifier } from '@/lib/notifier';
import { useAlarms } from '@/store/alarms';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { Text } from '@/ui/Text';

type Target = Pick<AlarmSetting, 'key' | 'kind' | 'refId' | 'title' | 'startsAt'>;

const GAP_TEXT = { exact: ['Alarms may ring a few minutes late.', 'Allow exact alarms'], fullScreen: ['The alarm will not cover the lock screen.', 'Allow on the lock screen'] } as const;

/** What the alarm will do for the next ride it covers, in a sentence or two. */
function preview(setting: AlarmSetting): string | undefined {
  const w = alarmWorld(Date.now());
  const next = rideContexts({ ...w, settings: [setting], woke: {} })[0];
  if (!next) return undefined;
  const steps = planLadder(next.ctx, { leadMin: setting.leadMin, goal: setting.goal, now: w.now, clock: sunsetClock });
  if (!steps.length) return undefined;
  const goal = pickGoal(next.ctx, setting.goal);
  const rings = `Rings at ${sunsetClock(steps[0].fireAt)}${steps.length > 1 ? `, snoozes up to ${steps.length - 1} times, last ring ${sunsetClock(steps[steps.length - 1].fireAt)}` : ''}.`;
  if (goal.kind === 'start') return rings;
  return `${rings} Timed for the ${goal.kind} (${sunsetClock(goal.at)}): it tells you before a snooze would lose it.`;
}

/** Sees whether the ride would be timed for a sunrise or sunset, so the goal choice is only offered then. */
function sunGoal(setting: AlarmSetting): 'sunrise' | 'sunset' | undefined {
  const next = rideContexts({ ...alarmWorld(Date.now()), settings: [setting], woke: {} })[0];
  const kind = next && pickGoal(next.ctx, 'auto').kind;
  return kind === 'sunrise' || kind === 'sunset' ? kind : undefined;
}

/**
 * The wake-up alarm for a trip (each of its days) or a club ride: off, 15 or 30 minutes before the start. With a sunrise or sunset the
 * ride is timed for, the rider can keep the alarm aimed at it or only at the start.
 */
export function AlarmCard({ target }: { target: Target }) {
  const setting = useAlarms((s) => s.settings[target.key]);
  const [backend, setBackend] = useState<AlarmBackend>();
  const [gaps, setGaps] = useState(androidGaps);
  useEffect(() => { void alarmBackend().then(setBackend); }, []);
  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') setGaps(androidGaps()); });
    return () => app.remove();
  }, []);

  const choose = async (leadMin: number | undefined) => {
    if (leadMin === undefined) return useAlarms.getState().remove(target.key);
    useAlarms.getState().set({ ...target, leadMin, goal: setting?.goal ?? 'auto' });
    if ((await notifier.permission()) !== 'granted') await notifier.request();
    setBackend(await requestAlarms());
    setGaps(androidGaps());
  };
  const setGoal = (goal: GoalChoice) => setting && useAlarms.getState().set({ ...setting, goal });

  const sun = setting && sunGoal({ ...setting, goal: 'auto' });
  const line = setting && preview(setting);

  return (
    <Card style={{ gap: space[4] }}>
      <View style={{ gap: space[1] }}>
        <Text variant="bodyMedium">Wake-up alarm</Text>
        <Text variant="label" tone="muted">{target.kind === 'trip' ? 'Rings before each day starts.' : 'Rings before the ride leaves.'} It gets more insistent the closer the start.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <ChoiceChip label="Off" selected={!setting} onPress={() => void choose(undefined)} />
        {LEAD_CHOICES.map((m) => <ChoiceChip key={m} label={`${m} min before`} selected={setting?.leadMin === m} onPress={() => void choose(m)} />)}
      </View>
      {setting && sun ? (
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          <ChoiceChip label={`Catch the ${sun}`} selected={setting.goal === 'auto'} onPress={() => setGoal('auto')} />
          <ChoiceChip label="Just the start" selected={setting.goal === 'start'} onPress={() => setGoal('start')} />
        </View>
      ) : null}
      {setting ? <Text variant="label" tone="muted">{line ?? 'Nothing to ring for in the next week.'}</Text> : null}
      {setting && backend === 'notifications' && Platform.OS === 'ios' ? (
        <Text variant="label" tone="caution">This rings as a notification, so it stays quiet when the phone is on silent. Allow alarms for Myto Moto in Settings (iOS 26 or later) for a real alarm.</Text>
      ) : null}
      {setting ? gaps.map((g) => (
        <View key={g} style={{ gap: space[2] }}>
          <Text variant="label" tone="caution">{GAP_TEXT[g][0]}</Text>
          <Button variant="soft" label={GAP_TEXT[g][1]} onPress={() => openAndroidSetting(g)} />
        </View>
      )) : null}
    </Card>
  );
}
