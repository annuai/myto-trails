import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSpeedTicks } from '@/features/ride/useSpeedTicks';
import { buzz } from '@/lib/haptics';
import { demoRoute, demoStops } from '@/lib/motionDemo';
import { MARKS } from '@/lib/marks';
import { distanceKm, durationParts, asText } from '@/lib/units';
import { useMarkToast } from '@/store/markToast';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { DrawnCheck } from '@/ui/DrawnCheck';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Measure } from '@/ui/Measure';
import { Odometer } from '@/ui/Odometer';
import { RideMap } from '@/ui/RideMap';
import { Screen } from '@/ui/Screen';
import { ServiceRing } from '@/ui/ServiceRing';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { useCountUp } from '@/ui/motionHooks';
import { preview } from './motion.tokens';

/** Every moment from the delight and motion plan in one place, each with a button to play it again, and the haptics to feel one by one. */
export default function MotionPreview() {
  const { c } = useTheme();
  const route = useMemo(() => demoRoute(), []);
  const stops = useMemo(() => demoStops(route), [route]);
  const [run, setRun] = useState(1);
  const km = useCountUp(12.4, run > 0, { ms: motion.duration.trace, delay: motion.traceDelay, run, steps: 12 });
  const sec = useCountUp(2310, run > 0, { ms: motion.duration.trace, delay: motion.traceDelay, run, steps: 0 });

  const [total, setTotal] = useState(12480);
  const [left, setLeft] = useState(0.44);
  const [doneAt, setDoneAt] = useState<number>();

  const items = ['Tyre pressure', 'Chain tension', 'Brake levers', 'Lights and horn'];
  const [ticked, setTicked] = useState<boolean[]>(items.map(() => false));
  const all = ticked.every(Boolean);
  const wasAll = useRef(false);
  useEffect(() => { if (all && !wasAll.current) buzz.confirm(); wasAll.current = all; }, [all]);

  const [speed, setSpeed] = useState(0);
  const [sweeping, setSweeping] = useState(false);
  useSpeedTicks(speed, sweeping);
  useEffect(() => {
    if (!sweeping) return;
    const id = setInterval(() => setSpeed((s) => {
      if (s >= preview.sweepTop) { setSweeping(false); return s; }
      return s + preview.sweepStep;
    }), preview.sweepStepMs);
    return () => clearInterval(id);
  }, [sweeping]);

  const crew = ['Asha', 'Ben', 'You'];
  const [homeN, setHomeN] = useState(0);
  const [homing, setHoming] = useState(false);
  useEffect(() => {
    if (!homing) return;
    const id = setInterval(() => setHomeN((n) => {
      if (n >= crew.length) { setHoming(false); return n; }
      if (n + 1 === crew.length) buzz.confirm(); else buzz.tick();
      return n + 1;
    }), preview.homeStepMs);
    return () => clearInterval(id);
  }, [homing]); // eslint-disable-line react-hooks/exhaustive-deps
  const everyone = homeN >= crew.length;

  const [skel, setSkel] = useState(0);

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Every new moment, replayable. Best on a real phone: that is where the haptics are.">Motion preview</PageTitle>

      <SectionTitle first>Ride end</SectionTitle>
      <RideMap points={route} waypoints={stops} height={preview.map} radius={radius.card} ink={{ play: run > 0, run }} />
      <View style={{ backgroundColor: c.accent, borderRadius: radius.card, padding: space[5], gap: space[1], marginTop: space[3] }}>
        <Text variant="label" style={{ color: c.accentInk }}>You rode</Text>
        <Measure parts={distanceKm(+km.toFixed(1))} size="liveCompact" color={c.accentInk} />
        <Text variant="label" style={{ color: c.accentInk }}>in {asText(durationParts(Math.round(sec)))}</Text>
      </View>
      <View style={{ marginTop: space[3] }}><Button variant="soft" label="Replay the ride ending" onPress={() => setRun((r) => r + 1)} /></View>

      <SectionTitle>Odometer</SectionTitle>
      <Card style={{ gap: space[4] }}>
        <Odometer id="demo-odometer" km={total} label="Demo total" />
        <Button variant="soft" label="Add a 142 km ride" onPress={() => setTotal((t) => t + 142)} />
      </Card>

      <SectionTitle>Service ring</SectionTitle>
      <Card style={{ gap: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <ServiceRing left={left} due={left <= 0} doneAt={doneAt} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Chain lube</Text>
            <Text variant="label" tone="muted">{left >= 1 ? 'Fresh. Logged just now' : `${Math.round(left * 500)} km left`}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <Button variant="soft" flex label="Ride 100 km" onPress={() => setLeft((l) => Math.max(0, l - 0.2))} />
          <Button flex label="Mark done" onPress={() => { setLeft(1); setDoneAt(Date.now()); buzz.confirm(); }} />
        </View>
      </Card>

      <SectionTitle>Checks</SectionTitle>
      <Card>
        {items.map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Checkbox checked={ticked[i]!} label={t} onChange={(v) => setTicked((a) => a.map((x, j) => (j === i ? v : x)))} />
            <Text variant="body">{t}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] }}>
          <DrawnCheck on={all} color={c.good} size={space[6]} stroke={space[1] - 1} />
          <Text variant="bodyMedium" tone={all ? 'good' : 'muted'}>{all ? 'All clear' : `${ticked.filter(Boolean).length} of ${items.length}`}</Text>
        </View>
      </Card>

      <SectionTitle>Speed ticks</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Measure parts={{ value: String(speed), unit: 'km/h' }} size="liveCompact" />
        <Button variant="soft" label={sweeping ? 'Sweeping…' : 'Sweep 0 to 80'} onPress={() => { setSpeed(0); setSweeping(true); }} />
      </Card>

      <SectionTitle>{"Everyone's home"}</SectionTitle>
      <Card style={{ gap: space[3], ...(everyone ? { backgroundColor: c.cardTint.sage } : null) }}>
        {everyone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <DrawnCheck on color={c.good} size={space[6]} stroke={space[1] - 1} />
            <Text variant="bodyMedium" tone="good">{"Everyone's home"}</Text>
          </View>
        ) : <Text variant="label" tone="muted">Sunday ride</Text>}
        {crew.map((n, i) => (
          <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body">{n}</Text>
            {i < homeN ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}><DrawnCheck on color={c.good} size={space[5]} stroke={space[1] - 1} /><Text variant="label" tone="good">Home</Text></View> : <Text variant="label" tone="muted">On the road</Text>}
          </View>
        ))}
        <Button variant="soft" onCard label={homing ? 'Riders getting in…' : 'Replay'} onPress={() => { setHomeN(0); setHoming(true); }} />
      </Card>

      <SectionTitle>Marks</SectionTitle>
      <Button variant="soft" label="Stamp a mark" onPress={() => useMarkToast.getState().push([MARKS[Math.floor(Math.random() * MARKS.length)]!.id])} />

      <SectionTitle>Loading</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Skeleton key={skel} />
        <Button variant="soft" label="Show again" onPress={() => setSkel((n) => n + 1)} />
      </Card>

      <SectionTitle>Feel each haptic</SectionTitle>
      <View style={{ gap: space[2] }}>
        {([['Tick: a choice changed', buzz.tick], ['Confirm: a task finished', buzz.confirm], ['Settle: something landed', buzz.settle], ['Milestone: a mark earned', buzz.milestone], ['Roll: one detent of a number', buzz.roll], ['Speed: a speedometer detent', buzz.speed], ['Help: needs attention', buzz.help]] as const).map(([label, fn]) => (
          <Button key={label} variant="soft" label={label} onPress={fn} />
        ))}
      </View>
    </Screen>
  );
}
