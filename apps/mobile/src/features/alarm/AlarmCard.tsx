import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { alarmWorld } from '@/alarmWorld';
import { alarmBackend, androidGaps, openAndroidSetting, requestAlarms, type AlarmBackend } from '@/lib/alarm/backend';
import { CUSTOM_LEAD, LEAD_CHOICES, pickGoal, planLadder, type GoalChoice } from '@/lib/alarm/ladder';
import { nextStartAt, rideContexts, type AlarmSetting } from '@/lib/alarm/plan';
import { sunsetClock } from '@/lib/daylight';
import { notifier } from '@/lib/notifier';
import { useAlarms } from '@/store/alarms';
import { useTrips } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';

type Target = Pick<AlarmSetting, 'key' | 'kind' | 'refId' | 'title' | 'startsAt'>;

const isPreset = (m: number) => (LEAD_CHOICES as readonly number[]).includes(m);
const leadText = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);

const GAP_TEXT = { exact: ['Alarms may ring a few minutes late.', 'Allow exact alarms'], fullScreen: ['The alarm will not cover the lock screen.', 'Allow on the lock screen'] } as const;

/** What the alarm will do for the next ride it covers, in a sentence or two. */
function preview(setting: AlarmSetting, now: number): string | undefined {
  const w = alarmWorld(now);
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
function sunGoal(setting: AlarmSetting, now: number): 'sunrise' | 'sunset' | undefined {
  const next = rideContexts({ ...alarmWorld(now), settings: [setting], woke: {} })[0];
  const kind = next && pickGoal(next.ctx, 'auto').kind;
  return kind === 'sunrise' || kind === 'sunset' ? kind : undefined;
}

/**
 * The wake-up alarm for a trip (each of its days) or a club ride: off, 15 or 30 minutes before the start, or a custom time (5 minutes
 * to 3 hours, in steps of 5). With a sunrise or sunset the ride is timed for, the rider can keep the alarm aimed at it or only at the
 * start. Once every start has passed there is nothing left to wake up for, so the card goes.
 */
export function AlarmCard({ target }: { target: Target }) {
  const setting = useAlarms((s) => s.settings[target.key]);
  const [backend, setBackend] = useState<AlarmBackend>();
  const [gaps, setGaps] = useState(androidGaps);
  const [customOpen, setCustomOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const trips = useTrips((s) => s.trips);
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

  if (nextStartAt({ now, trips }, target) === undefined) return null;
  const custom = !!setting && (customOpen || !isPreset(setting.leadMin));
  const step = (by: number) => setting && useAlarms.getState().set({ ...setting, leadMin: Math.min(CUSTOM_LEAD.max, Math.max(CUSTOM_LEAD.min, setting.leadMin + by)) });
  const sun = setting && sunGoal({ ...setting, goal: 'auto' }, now);
  const line = setting && preview(setting, now);

  return (
    <Card style={{ gap: space[4] }}>
      <View style={{ gap: space[1] }}>
        <Text variant="bodyMedium">Wake-up alarm</Text>
        <Text variant="label" tone="muted">{target.kind === 'trip' ? 'Rings before each day starts.' : 'Rings before the ride leaves.'} It gets more insistent the closer the start.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <ChoiceChip label="Off" selected={!setting} onPress={() => { setCustomOpen(false); void choose(undefined); }} />
        {LEAD_CHOICES.map((m) => <ChoiceChip key={m} label={`${m} min before`} selected={!custom && setting?.leadMin === m} onPress={() => { setCustomOpen(false); void choose(m); }} />)}
        <ChoiceChip label="Custom" selected={custom} onPress={() => { setCustomOpen(true); void choose(setting && !isPreset(setting.leadMin) ? setting.leadMin : CUSTOM_LEAD.default); }} />
      </View>
      {custom && setting ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
          <Text variant="labelMedium">Ring before the start</Text>
          <View accessibilityRole="adjustable" accessibilityLabel={`${leadText(setting.leadMin)} before the start`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconButton icon={Minus} label={`${CUSTOM_LEAD.step} minutes later`} onPress={() => step(-CUSTOM_LEAD.step)} />
            <Text variant="dataLarge">{leadText(setting.leadMin)}</Text>
            <IconButton icon={Plus} label={`${CUSTOM_LEAD.step} minutes earlier`} onPress={() => step(CUSTOM_LEAD.step)} />
          </View>
        </View>
      ) : null}
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
