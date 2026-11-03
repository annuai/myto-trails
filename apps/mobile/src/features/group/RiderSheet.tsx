import { Linking, View } from 'react-native';
import { Crown, Navigation, Route } from 'lucide-react-native';
import type { LatLng } from '@/lib/geo';
import { ROLE_LABEL, ROLES } from '@/lib/eventCore';
import { riderGap, gapWords } from '@/lib/riderGap';
import { STATUS_LABEL, type RiderTile, type RiderTitle } from '@/lib/groupCore';
import { mapsDirectionsUrl } from '@/lib/navigate';
import type { TrailLine } from '@/lib/trailGuide';
import { shortDistanceM, withUnit } from '@/lib/units';
import { useGuideTarget } from '@/store/guideTarget';
import { useTheme } from '@/theme/ThemeProvider';
import { media, radius, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip, StatusChip } from '@/ui/Chip';
import { HoldButton } from '@/ui/HoldButton';
import { Icon } from '@/ui/Icon';
import { OsmMap } from '@/ui/map/OsmMap';
import { riderColor } from '@/ui/map/RiderPins';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { ROLE_ICON } from './roleIcons';
import { useRiderTitles } from './useRiderTitles';

/**
 * One rider of the group. It says how far they are from you and whether that is ahead of you or behind you, live: the card is drawn again
 * with every new position, so the figure follows the two of you. It is not about the destination. Under it: where they are, what they have
 * signalled, their titles (the leader sets them here, any number), and the ways to go to them. An old position gives an old answer, and it says so.
 */
export function RiderSheet({ tile, me, heading, road, canNavigate, onClose }: { tile: RiderTile; /** Where you are now. */ me?: LatLng; /** The way you are heading, to tell ahead from behind off a road. */ heading?: number; /** The road you are riding, to measure along it. */ road?: TrailLine; canNavigate: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { canSet, set } = useRiderTitles();
  const rescue = useGuideTarget((s) => s.rescue);
  /** The rider is already on their way to this rider. */
  const helping = rescue?.riderId === tile.id;
  const go = () => { useGuideTarget.getState().startRescue({ riderId: tile.id, name: tile.name, startStatus: tile.status }); onClose(); };
  const color = riderColor(tile.slot, c.riders);
  const name = tile.isMe ? 'You' : tile.name;
  const gap = tile.position && me && !tile.isMe ? riderGap({ me, rider: tile.position, heading, road }) : undefined;
  const toggle = (role: RiderTitle) => void set(tile.id, tile.titles.includes(role) ? tile.titles.filter((t) => t !== role) : [...tile.titles, role]);
  return (
    <Sheet open title={name} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: space[3], height: space[3], borderRadius: radius.chip, backgroundColor: color }} />
        <Text variant="labelMedium" style={{ color }}>{tile.position ? `Last seen ${tile.seen}` : 'Not seen yet'}</Text>
        {tile.role === 'leader' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}><Icon icon={Crown} size={size.chip / 2 + space[1]} tone="muted" /><Text variant="labelMedium" tone="muted">Leader</Text></View> : null}
      </View>
      {gap ? (
        <View style={{ gap: space.half }}>
          <Text variant="dataLarge">{withUnit(shortDistanceM(gap.m))}</Text>
          <Text variant="label" tone="muted">{gapWords(gap)}</Text>
        </View>
      ) : null}
      {tile.position && me && !tile.isMe ? (
        // The two of you, with the line between: it is the gap, not a route.
        <OsmMap height={media.mapCard} radius={radius.card} interactive={false} position={me} line={[me, tile.position]} riderMarks={[{ id: tile.id, name, slot: tile.slot, lat: tile.position.lat, lng: tile.position.lng }]} />
      ) : !tile.position ? <Text variant="label" tone="muted">This rider has not shared a position yet.</Text> : null}
      {tile.stale && tile.position ? <Text variant="label" tone="caution">Their position is old, so this is from where they were last seen.</Text> : null}
      {!tile.isMe && tile.status !== 'ok' ? <StatusChip status={tile.status === 'help' ? 'stop' : 'caution'} label={STATUS_LABEL[tile.status]} /> : null}
      {canSet ? (
        <View style={{ gap: space[2] }}>
          <Text variant="labelMedium">Titles</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {ROLES.map((role) => <ChoiceChip key={role} icon={ROLE_ICON[role]} label={ROLE_LABEL[role]} selected={tile.titles.includes(role)} onPress={() => toggle(role)} />)}
          </View>
        </View>
      ) : tile.titles.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
          {tile.titles.map((t) => <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Icon icon={ROLE_ICON[t]} size={size.chip / 2 + space[1]} tone="muted" /><Text variant="labelMedium" tone="muted">{ROLE_LABEL[t]}</Text></View>)}
        </View>
      ) : null}
      {!tile.isMe && tile.position ? (helping ? (
        <>
          <Button label="Help given, continue the ride" onPress={() => { useGuideTarget.getState().endRescue(); onClose(); }} />
          <Button variant="soft" label={`Keep going to ${tile.name}`} onPress={onClose} />
        </>
      ) : canNavigate ? <Button icon={Route} label={`Navigate to ${tile.name}`} onPress={go} />
        // Moving, the button must be held, like Stop and SOS: a bump or a glove cannot send the rider off their road.
        : <HoldButton label={`Hold to navigate to ${tile.name}`} icon={Route} color={c.accent} borderOnly row ms={700} minHeight={size.button} onComplete={go} />) : null}
      {!tile.isMe && tile.position && canNavigate && !helping ? <Button variant="soft" icon={Navigation} label={`Directions to ${tile.name}`} onPress={() => void Linking.openURL(mapsDirectionsUrl(tile.position!)).catch(() => undefined)} /> : null}
    </Sheet>
  );
}
