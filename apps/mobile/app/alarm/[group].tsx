import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Backpack, CalendarClock, CloudRain, Sun, Sunrise, Sunset } from 'lucide-react-native';
import { alarmWorld } from '@/alarmWorld';
import { pickGoal } from '@/lib/alarm/ladder';
import { contextOf } from '@/lib/alarm/plan';
import { sunsetClock } from '@/lib/daylight';
import { useAlarms } from '@/store/alarms';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const MIN = 60_000;
const span = (ms: number) => { const m = Math.round(Math.abs(ms) / MIN); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

/**
 * Where "I'm up" lands: the ride, how long until it leaves, the sun it is timed for, the weather and what is left to pack, and the way
 * to the trip or club ride. Opening it counts as being up, so the ride's other rings are cancelled.
 */
export default function AlarmScreen() {
  const { group: raw } = useLocalSearchParams<{ group: string }>();
  const group = decodeURIComponent(raw ?? '');
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  // The minutes to the start count down while the screen is open.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const found = useMemo(() => contextOf(alarmWorld(now), group), [group, now]);
  useEffect(() => { if (group) useAlarms.getState().markWoke(group, Date.now()); }, [group]);

  if (!found) {
    return (
      <Screen>
        <BackHeader />
        <PageTitle sub="The trip or club ride this alarm was for is no longer planned.">Good morning</PageTitle>
        <Button label="Go to Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const { ctx, setting } = found;
  const goal = pickGoal(ctx, setting.goal);
  const until = ctx.startsAt - now;
  const w = ctx.weather;
  const open = () => router.replace((setting.kind === 'trip' ? `/trips/${setting.refId}` : `/event/${setting.refId}`) as never);

  return (
    <Screen>
      <BackHeader />
      <PageTitle sub={until > 0 ? `${ctx.group ? 'Leaves' : 'Starts'} at ${sunsetClock(ctx.startsAt)}, in ${span(until)}` : `${ctx.group ? 'Left' : 'Started'} at ${sunsetClock(ctx.startsAt)}, ${span(until)} ago`}>{ctx.title}</PageTitle>
      <View style={{ gap: space[4] }}>
        <ListCard>
          <Row icon={CalendarClock} label={ctx.group ? 'The group leaves' : 'The ride starts'} value={sunsetClock(ctx.startsAt)} chevron={false} />
          {goal.kind !== 'start' ? <Row icon={goal.kind === 'sunrise' ? Sunrise : Sunset} label={goal.kind === 'sunrise' ? 'Sunrise' : 'Sunset'} value={sunsetClock(goal.at)} sub={goal.at > now ? 'Leave on time to catch it' : undefined} chevron={false} /> : null}
          {w ? <Row icon={w.rainPct >= 50 ? CloudRain : Sun} label={w.rainPct >= 50 ? `Rain likely (${w.rainPct}%)` : 'Dry'} sub={w.rainPct >= 50 ? 'Pack the rain liner' : undefined} value={`${Math.round(w.maxC)}°`} chevron={false} /> : null}
          {ctx.packLeft ? <Row icon={Backpack} label={`${ctx.packLeft} ${ctx.packLeft === 1 ? 'thing' : 'things'} still to pack`} onPress={open} /> : null}
        </ListCard>
        <Button big variant="accent" label={setting.kind === 'trip' ? 'Open the trip' : 'Open the ride'} onPress={open} />
        <Text variant="label" tone="muted">The other rings for this ride are off.</Text>
      </View>
    </Screen>
  );
}
