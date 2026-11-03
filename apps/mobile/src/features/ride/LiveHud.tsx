import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Users, X } from 'lucide-react-native';
import type { Instruction } from '@/lib/guidance';
import { ROLE_ICON } from '@/features/group/roleIcons';
import { ROLE_LABEL } from '@/lib/eventCore';
import { railOrder, STATUS_LABEL, type RiderTile } from '@/lib/groupCore';
import { asText, distanceKm, durationParts, shortDistanceM, type Quantity } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, inkSolid, opacity as fade2, radius, scrim, shadow, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { useAnimatedValue } from '@/ui/useAnimatedValue';
import { roundedDistanceM } from '@/lib/rideCamera';
import { IconButton } from '@/ui/IconButton';
import { riderColor } from '@/ui/map/RiderPins';
import { Text } from '@/ui/Text';
import { TURN_ICON } from './turnIcons';

/**
 * The next manoeuvre, floating over the top of the map: a big arrow, the distance to it in large numbers, and what to do. A thin line
 * under it says how far there is to go. Off the line the card is outlined and says a new way is being found.
 */
export function TurnCard({ instruction, compact, onStop, stopLabel = 'Stop guiding', prompt }: { instruction: Instruction; /** Sideways on a handlebar mount, where height is short. */ compact?: boolean; /** Given when the rider asked to be guided to a place: shows a way to stop. */ onStop?: () => void; stopLabel?: string; /** A question under the card with one answer, such as carrying on after helping a rider. */ prompt?: { text: string; action: string; onAction: () => void } }) {
  const { c } = useTheme();
  const i = instruction;
  // In whole steps (5 m, 10 m, 100 m by distance), so the digits do not flicker every second.
  const to: Quantity | null = i.distM === null ? null : shortDistanceM(roundedDistanceM(i.distM));
  // A new instruction fades in rather than snapping, so a change of turn reads as one smooth move.
  const shown = useAnimatedValue(1);
  const kindKey = `${i.kind}|${i.text}`;
  useEffect(() => { shown.setValue(0.3); Animated.timing(shown, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [kindKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // What the guidance is about leads the last line, after the instruction: "Group destination · 3.2 km to go".
  const togo = [i.eyebrow, i.remainingM === null || i.arrived ? '' : `${asText(distanceKm(i.remainingM / 1000))} to go${i.etaMin ? ` · about ${asText(durationParts(i.etaMin * 60))}` : ''}`].filter(Boolean).join(' · ');
  const tile = compact ? size.button : size.bigButton;
  return (
    // The shared Card surface, floating: padded its own way, outlined when off the route, and not clipped so its shadow shows.
    <Card padded={false} style={{ padding: space[3], gap: space[2], borderWidth: size.rule, borderColor: i.off ? c.caution : c.card, overflow: 'visible', ...shadow.ride }}>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], opacity: shown }}>
        <View style={{ width: tile, height: tile, borderRadius: radius.control, backgroundColor: i.off ? c.caution : c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={TURN_ICON[i.kind]} size={compact ? size.target : size.pin + space[2]} strokeWidth={2.25} color={c.accentInk} />
        </View>
        <View style={{ flex: 1, gap: space.half }}>
          {to ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
              <Text variant={compact ? 'liveSecondaryCompact' : 'liveSecondary'}>{to.value}</Text><Text variant="bodyMedium" tone="muted">{to.unit}</Text>
            </View>
          ) : null}
          <Text variant="bodyMedium" numberOfLines={2}>{i.text}</Text>
        </View>
        {onStop ? <IconButton plain size={size.compact} icon={X} label={stopLabel} onPress={onStop} /> : null}
      </Animated.View>
      {i.off ? <Text variant="label" tone="caution">Off the route. Finding a new way…</Text> : <Text variant="label" tone="muted" numberOfLines={1}>{togo}</Text>}
      {prompt ? (
        <View style={{ gap: space[2] }}>
          <Text variant="bodyMedium">{prompt.text}</Text>
          <Button label={prompt.action} onPress={prompt.onAction} />
        </View>
      ) : null}
    </Card>
  );
}

/** Distance, time and speed in one row: the numbers a rider glances at, small enough to leave the map the room. */
export function StatsStrip({ distance, time, speed, paused, note }: { distance: Quantity; time: string; speed: Quantity; paused: boolean; /** One quiet line under the numbers: how fresh the GPS is. */ note?: string }) {
  const cell = (label: string, value: string) => (
    <View style={{ flex: 1, gap: space.half }}><Text variant="caption" tone="muted" numberOfLines={1}>{label}</Text><Text variant="liveSecondaryCompact" numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>
  );
  return (
    <Card padded={false} style={{ paddingHorizontal: space[4], paddingVertical: space[2], gap: space.half }}>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {cell(`Distance (${distance.unit})`, distance.value)}
        {cell(paused ? 'Paused' : 'Time', time)}
        {cell(`Speed (${speed.unit})`, speed.value)}
      </View>
      {note ? <Text variant="caption" tone="muted" numberOfLines={1}>{note}</Text> : null}
    </Card>
  );
}

/**
 * The riders under the map, most important first (see railOrder): a rider calling for help, then anyone else who has signalled, the leader, and
 * the nearest. A group can be thirty, so the row names a few and ends with one "All" chip that opens the whole group. Each chip is dark with
 * white text for contrast, a disc in the rider's colour (the colour of their dot on the map) holding their initial, their name, and how far
 * they are. A rider who has asked for something shows what, and is outlined; a crown marks the leader. Tapping a chip opens that rider.
 */
export function GroupRail({ tiles, onSelect, onAll }: { tiles: RiderTile[]; onSelect: (t: RiderTile) => void; onAll: () => void }) {
  const { c } = useTheme();
  const { shown, total } = railOrder(tiles);
  const [view, setView] = useState({ x: 0, width: 0, content: 0 });
  if (!shown.length) return null;
  const moreRight = view.content - (view.x + view.width) > 1, moreLeft = view.x > 1;
  const fade = (side: 'left' | 'right') => (
    <LinearGradient pointerEvents="none" colors={side === 'right' ? [scrim.edgeClear, scrim.edge] : [scrim.edge, scrim.edgeClear]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: size.chip, borderRadius: radius.chip }} />
  );
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space[2] }} scrollEventThrottle={32}
        onLayout={(e) => setView((v) => ({ ...v, width: e.nativeEvent.layout.width }))} onContentSizeChange={(w) => setView((v) => ({ ...v, content: w }))} onScroll={(e) => setView((v) => ({ ...v, x: e.nativeEvent.contentOffset.x }))}>
        {shown.map((t) => {
          const asking = t.status !== 'ok';
          const tone = t.status === 'help' ? 'stop' : 'caution';
          return (
            <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name}${t.role === 'leader' ? ', leader' : ''}${t.titles.map((x) => `, ${ROLE_LABEL[x]}`).join('')}, ${t.distance ?? t.seen}${asking ? `, ${STATUS_LABEL[t.status]}` : ''}. Show where they are`} onPress={() => onSelect(t)}
              style={{ minHeight: size.target, borderRadius: radius.chip, paddingLeft: space[2], paddingRight: space[4], backgroundColor: inkSolid, flexDirection: 'row', alignItems: 'center', gap: space[2], borderWidth: size.rule, borderColor: asking ? c[tone] : inkSolid, opacity: t.stale ? fade2.stale : 1, ...shadow.ride }}>
              <View style={{ width: size.chip, height: size.chip, borderRadius: radius.chip, backgroundColor: riderColor(t.slot, c.riders), alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="labelMedium" style={{ color: inkSolid }}>{t.name.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
                  <Text variant="labelMedium" numberOfLines={1} style={{ color: fixed.white }}>{t.name.split(' ')[0]}</Text>
                  {t.role === 'leader' ? <Icon icon={Crown} size={size.chip / 2} tone="muted" /> : null}
                  {t.titles.map((x) => <Icon key={x} icon={ROLE_ICON[x]} size={size.chip / 2} tone="muted" />)}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
                  {asking ? <Text variant="caption" tone={tone} numberOfLines={1}>{STATUS_LABEL[t.status]}</Text> : null}
                  <Text variant="data" tone="muted" numberOfLines={1}>{t.distance ?? t.seen}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {total >= 3 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`All ${total} riders`} onPress={onAll}
            style={{ minHeight: size.target, borderRadius: radius.chip, paddingHorizontal: space[4], backgroundColor: inkSolid, flexDirection: 'row', alignItems: 'center', gap: space[2], ...shadow.ride }}>
            <Icon icon={Users} size={size.chip / 2 + space[1]} color={fixed.white} />
            <Text variant="labelMedium" style={{ color: fixed.white }}>{`All ${total}`}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {moreLeft ? fade('left') : null}
      {moreRight ? fade('right') : null}
    </View>
  );
}
