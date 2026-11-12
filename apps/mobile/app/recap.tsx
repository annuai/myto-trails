import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';
import { CalendarDays, Share2 } from 'lucide-react-native';
import { shareCard } from '@/lib/shareCard';
import { recapTokens } from '@/lib/recapCard.tokens';
import { asText, distanceKm, durationParts, speedKmh } from '@/lib/units';
import { TITLES } from '@/lib/story/titles';
import { yearRecap, yearsWithRides } from '@/lib/yearRecap';
import { chooseStanding } from '@/lib/standingSync';
import { standingMoment } from '@/lib/story/standing';
import { useRides } from '@/store/rides';
import { useStandingPref } from '@/store/standingPref';
import { useStory } from '@/store/story';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Measure } from '@/ui/Measure';
import { Pillion } from '@/ui/Pillion';
import { RecapCard } from '@/ui/RecapCard';
import { Screen } from '@/ui/Screen';
import { useCountUp, useOnce } from '@/ui/motionHooks';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';

const INVITE_ID = 'invite:standing';

/** Your year: what you rode in a calendar year, with a picture to share. Only your own rides count, not the sample ride. */
export default function Recap() {
  const { c } = useTheme();
  const rides = useRides((s) => s.rides);
  const years = useMemo(() => yearsWithRides(rides), [rides]);
  const current = new Date().getFullYear();
  const [picked, setPicked] = useState<number>();
  const year = picked && years.includes(picked) ? picked : years.includes(current) ? current : years[0];
  const recap = useMemo(() => (year === undefined ? undefined : yearRecap(rides, year)), [rides, year]);
  // The year's distance counts up the first time it is opened, with the same soft ratchet as the other rolling figures.
  const play = useOnce(recap && year !== undefined ? `recap:${year}` : undefined);
  const shownKm = useCountUp(recap?.distanceKm ?? 0, play, { run: year });
  const optIn = useStandingPref((s) => s.optIn);
  const cohort = useStandingPref((s) => s.cohort);
  const invited = useStory((s) => s.seen.includes(INVITE_ID));
  const standing = optIn && cohort ? standingMoment({ metric: cohort.metric, value: cohort.value, row: cohort.row, region: cohort.region }) : undefined;
  const fullRef = useRef<ComponentRef<typeof View>>(null);
  const [message, setMessage] = useState<string>();
  const share = async () => {
    setMessage(undefined);
    try { await shareCard(fullRef.current); } catch (e) { setMessage(e instanceof Error ? e.message : 'The picture could not be shared.'); }
  };
  return (
    <Screen overlay={recap ? (
      // The picture that is saved is drawn at its full size, off screen, so it is sharp whatever the preview's size.
      <View pointerEvents="none" style={{ position: 'absolute', left: -recapTokens.size.width - 50, top: 0 }}>
        <RecapCard ref={fullRef} recap={recap} width={recapTokens.size.width} />
      </View>
    ) : null}>
      <BackHeader title="You" />
      <PageTitle sub="What you rode in a calendar year, from the rides in your log.">Your year</PageTitle>
      {!recap || year === undefined ? <EmptyState icon={CalendarDays} title="Your year is just getting started" body="Ride a little and your recap builds here." /> : (
        <>
          {years.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
              {years.map((y) => <ChoiceChip key={y} label={String(y)} selected={y === year} onPress={() => setPicked(y)} />)}
            </View>
          ) : null}
          <View style={{ backgroundColor: c.accent, borderRadius: radius.card, padding: space[6], gap: space[1] }}>
            <Text variant="label" style={{ color: c.accentInk }}>{year} on the road</Text>
            <Measure parts={distanceKm(play ? Math.round(shownKm) : recap.distanceKm)} size="liveCompact" color={c.accentInk} />
            <Text variant="label" style={{ color: c.accentInk }}>in {asText(durationParts(recap.durationSec))}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: space[1], marginTop: space[4] }}>
            <Pillion pose="campfire" size="md" />
            {recap.title ? <Text variant="label">{`${year}: ${TITLES.find((t) => t.id === recap.title)?.name}`}</Text> : null}
          </View>
          {standing ? <Text variant="label" style={{ marginTop: space[3], textAlign: 'center' }}>{standing.title}</Text> : null}
          <SectionTitle>Highlights</SectionTitle>
          <Card style={{ flexDirection: 'row' }}>
            <Stat value={`${recap.rides}`} label={recap.rides === 1 ? 'Ride' : 'Rides'} />
            <Stat value={`${recap.daysRidden}`} label={recap.daysRidden === 1 ? 'Day ridden' : 'Days ridden'} />
            <Stat parts={distanceKm(recap.averageKm)} label="Average ride" />
          </Card>
          <View style={{ marginTop: space[3] }}>
            <ListCard>
              {recap.longest ? <Row label="Longest ride" sub={recap.longest.name} value={asText(distanceKm(recap.longest.distanceKm))} mono chevron={false} /> : null}
              {recap.busiestMonth ? <Row label="Busiest month" sub={recap.busiestMonth.name} value={asText(distanceKm(recap.busiestMonth.distanceKm))} mono chevron={false} /> : null}
              <Row label="Top speed" value={asText(speedKmh(recap.topSpeedKmh))} mono chevron={false} />
            </ListCard>
          </View>
          {!optIn && !invited ? (
            <Card style={{ marginBottom: space[4], gap: space[2] }}>
              <Text variant="label">Compare with riders near you</Text>
              <Text variant="caption" tone="muted">Share each ride's date, distance and a rough area (about 100 km wide). Never your route. Turn off any time and it is deleted.</Text>
              <Button label="Turn on" onPress={() => { useStory.getState().markSeen(INVITE_ID); void chooseStanding(true); }} />
              <Button variant="soft" label="Not now" onPress={() => useStory.getState().markSeen(INVITE_ID)} />
            </Card>
          ) : null}
          <SectionTitle>Share it</SectionTitle>
          <View style={{ alignItems: 'center', marginBottom: space[4] }}><RecapCard recap={recap} width={recapTokens.previewWidth} /></View>
          <Button icon={Share2} label="Share my year" onPress={() => void share()} />
          <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>The picture shows no map and no ride names.</Text>
          {message ? <Text variant="label" tone="stop" style={{ marginTop: space[2] }}>{message}</Text> : null}
        </>
      )}
    </Screen>
  );
}
