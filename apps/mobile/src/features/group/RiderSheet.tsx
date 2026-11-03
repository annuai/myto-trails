import { Linking, View } from 'react-native';
import { Navigation, Route } from 'lucide-react-native';
import type { LatLng } from '@/lib/geo';
import { ROLE_LABEL } from '@/lib/eventCore';
import { STATUS_LABEL, type RiderTile } from '@/lib/groupCore';
import { Icon } from '@/ui/Icon';
import { ROLE_ICON } from './roleIcons';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { useGuideTarget } from '@/store/guideTarget';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { media, radius, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/Chip';
import { HoldButton } from '@/ui/HoldButton';
import { OsmMap } from '@/ui/map/OsmMap';
import { riderColor } from '@/ui/map/RiderPins';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { useDestinationRoute } from './useDestinationRoute';

/**
 * One rider of the group: where they are on a small map, and how far and how long they still have to go to the group's
 * destination. The figures are for the road from their last known position, so an old position gives an old answer, and it says so.
 */
export function RiderSheet({ tile, destination, canNavigate, onClose }: { tile: RiderTile; destination?: LatLng & { name?: string }; canNavigate: boolean; onClose: () => void }) {
  const route = useDestinationRoute(tile.position ?? undefined, destination);
  const { c } = useTheme();
  const rescue = useGuideTarget((s) => s.rescue);
  /** The rider is already on their way to this rider. */
  const helping = rescue?.riderId === tile.id;
  const go = () => { useGuideTarget.getState().startRescue({ riderId: tile.id, name: tile.name, startStatus: tile.status }); onClose(); };
  const color = riderColor(tile.slot, c.riders);
  const name = tile.isMe ? 'You' : tile.name;
  const mark = tile.position ? [{ id: tile.id, name, slot: tile.slot, lat: tile.position.lat, lng: tile.position.lng }] : undefined;
  return (
    <Sheet open title={name} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: space[3], height: space[3], borderRadius: radius.chip, backgroundColor: color }} />
        <Text variant="labelMedium" style={{ color }}>{tile.position ? `Last seen ${tile.seen}` : 'Not seen yet'}</Text>
      </View>
      {tile.position ? (
        <OsmMap height={media.mapCard} radius={radius.card} interactive={false} follow={!destination} position={tile.position} line={destination ? route?.line ?? [tile.position, destination] : undefined} riderMarks={mark} destination={destination} />
      ) : <Text variant="label" tone="muted">This rider has not shared a position yet.</Text>}
      {!destination ? <Text variant="label" tone="muted">The leader has not set a group destination yet.</Text>
        : !tile.position ? null
        : route ? (
          <View style={{ gap: space[1] }}>
            <Text variant="dataLarge">{asText(distanceKm(route.km))}</Text>
            <Text variant="label" tone="muted">{`About ${asText(durationParts(route.etaMin * 60))} to ${destination.name ?? 'the destination'}${route.straight ? ', in a straight line: the road service could not be reached' : ''}`}</Text>
          </View>
        ) : <Text variant="label" tone="muted">Finding the road to {destination.name ?? 'the destination'}…</Text>}
      {tile.stale && tile.position ? <Text variant="label" tone="caution">Their position is old, so this is from where they were last seen.</Text> : null}
      {tile.eventRole ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Icon icon={ROLE_ICON[tile.eventRole]} size={size.chip / 2 + space[1]} tone="muted" /><Text variant="labelMedium" tone="muted">{ROLE_LABEL[tile.eventRole]}</Text></View> : null}
      {!tile.isMe && tile.status !== 'ok' ? <StatusChip status={tile.status === 'help' ? 'stop' : 'caution'} label={STATUS_LABEL[tile.status]} /> : null}
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
