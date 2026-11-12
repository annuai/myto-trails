import { useState } from 'react';
import { View } from 'react-native';
import { CATEGORY_TITLES } from '@moto-trails/domain';
import { ApiFailure } from '@/api/client';
import { setChallengeJoined, setLeaderboardOptIn, useTrailmarks } from '@/api/trailmarks';
import { badgeGroups, badgeStamp } from '@/lib/badges';
import { MARKS } from '@/lib/marks';
import { useMarks } from '@/store/marks';
import { useRides } from '@/store/rides';
import { formatDate } from '@/lib/dates';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ProgressBar } from '@/ui/HeroCard';
import { Reveal } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Stamp } from '@/ui/Stamp';
import { Text } from '@/ui/Text';

/**
 * Every mark, earned or not, then badges, Trailmarks and challenges. Marks come from facts the phone holds. Badges, Trailmarks and
 * challenge progress come from the server (contributions are checked by moderators first), so they wait, with a plain hint, until
 * the rider is signed in and online. None of it is about speed.
 */
export default function Marks() {
  const held = useMarks((s) => s.held);
  const rides = useRides((s) => s.rides);
  const earned = MARKS.filter((m) => held[m.id]).length;
  const tm = useTrailmarks();
  const [notice, setNotice] = useState<string | null>(null);
  const groups = badgeGroups(rides, tm.data?.snapshot);

  const run = async (job: (token: string) => Promise<void>) => {
    if (!tm.token) return;
    setNotice(null);
    try { await job(tm.token); tm.reload(); } catch (e) { setNotice(e instanceof ApiFailure ? e.message : 'Could not reach Moto Trails.'); }
  };

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="First times, badges and thank-yous. Nothing here is about speed.">Marks</PageTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: space[4] }}>{earned} of {MARKS.length} earned</Text>
      <View style={{ gap: space[3] }}>
        {MARKS.map((m, i) => {
          const at = held[m.id];
          return (
            <Reveal key={m.id} delay={i * 40}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
                <Stamp def={m} earned={!!at} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" tone={at ? 'ink' : 'muted'}>{m.title}</Text>
                  <Text variant="label" tone="muted">{at ? formatDate(new Date(at).toISOString().slice(0, 10)) : m.hint}</Text>
                </View>
              </Card>
            </Reveal>
          );
        })}
      </View>

      <SectionTitle>Badges</SectionTitle>
      {groups.map((g) => (
        <View key={g.category} style={{ gap: space[3], marginBottom: space[5] }}>
          <Text variant="labelMedium" tone="muted">{CATEGORY_TITLES[g.category]}</Text>
          {g.items.map((s) => (
            <Card key={s.def.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
              <Stamp def={badgeStamp(s)} earned={s.state === 'earned'} />
              <View style={{ flex: 1, gap: space[1] }}>
                <Text variant="bodyMedium" tone={s.state === 'earned' ? 'ink' : 'muted'}>{s.def.title}</Text>
                <Text variant="label" tone="muted">{s.state === 'earned' ? 'Earned.' : s.state === 'needs_data' ? s.hint : s.def.hint}</Text>
                {s.state === 'in_progress' || s.state === 'locked' ? (
                  <>
                    <ProgressBar value={s.current} max={s.target} label={`${s.def.title}: ${s.current} of ${s.target}`} />
                    <Text variant="label" tone="muted">{s.current} of {s.target}</Text>
                  </>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      ))}

      <SectionTitle>Trailmarks</SectionTitle>
      <Card style={{ gap: space[2] }}>
        <Text variant="hero">{tm.data ? tm.data.total : '–'}</Text>
        <Text variant="label" tone="muted">{tm.data?.note ?? 'A thank-you for helping the map, not money or crypto. They can’t be bought, sold or cashed out.'}</Text>
        {!tm.signedIn ? <Text variant="label" tone="muted">Sign in to see yours. They are given after a moderator or other riders confirm your contribution.</Text> : null}
        {tm.data?.recent.map((e) => <Text key={`${e.action}${e.at}`} variant="label">+{e.points} {e.label}</Text>)}
      </Card>

      <SectionTitle>Challenges</SectionTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: space[3] }}>Optional. Nothing counts until you join, and you can leave any time.</Text>
      {tm.data ? (
        <View style={{ gap: space[3] }}>
          {tm.data.challenges.map((c) => (
            <Card key={c.def.id} style={{ gap: space[2] }}>
              <Text variant="bodyMedium">{c.def.title}</Text>
              <Text variant="label" tone="muted">{c.hint}</Text>
              {c.state === 'in_progress' || c.state === 'complete' ? <ProgressBar value={c.current} max={c.target} label={`${c.def.title}: ${c.current} of ${c.target}`} /> : null}
              {c.state !== 'locked' ? (
                <Button variant="soft" onCard label={c.joined ? 'Leave challenge' : 'Join challenge'} onPress={() => run((t) => setChallengeJoined(t, c.def.id, !c.joined))} />
              ) : null}
            </Card>
          ))}
          <Card style={{ gap: space[2] }}>
            <Text variant="bodyMedium">Leaderboard</Text>
            <Text variant="label" tone="muted">Ranks contributions to the map, never speed or distance. Off unless you choose it, and shows only your public name.</Text>
            <Button variant="soft" onCard label={tm.data.leaderboardOptIn ? 'Leave the leaderboard' : 'Join the leaderboard'} onPress={() => run((t) => setLeaderboardOptIn(t, !tm.data!.leaderboardOptIn))} />
          </Card>
          {notice ? <Text variant="label" tone="stop">{notice}</Text> : null}
        </View>
      ) : (
        <Card><Text variant="label" tone="muted">{tm.error ?? (tm.signedIn ? 'Loading your challenges.' : 'Sign in to see and join challenges.')}</Text></Card>
      )}
    </Screen>
  );
}
