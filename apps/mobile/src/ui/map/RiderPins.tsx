import { Pressable, ScrollView, View } from 'react-native';
import { MapPin, Navigation2, X } from 'lucide-react-native';
import { STATUS_LABEL } from '@/lib/groupCore';
import { clusterLabel, type RiderCluster, type RiderMark } from '@/lib/riderClusters';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, inkSolid, light, radius, size, space } from '@/theme/tokens';
import { IconButton } from '../IconButton';
import { Text } from '../Text';

/** The colour of the rider in this slot: the same on the map and in the rider list. The map's labels are white, so it uses the light set; a list passes its own theme's `c.riders`. */
export const riderColor = (slot: number, riders: readonly string[] = light.riders): string => riders[slot % riders.length]!;

/** A coloured dot with the rider's name beside it. The row is anchored on its left edge, so the dot sits on the position. */
export function RiderPin({ mark }: { mark: RiderMark }) {
  const color = riderColor(mark.slot);
  // A rider who has asked for something is ringed and says what: red for help, orange for the rest. Colour is never the only sign.
  const asking = mark.status && mark.status !== 'ok' ? mark.status : undefined;
  const ring = asking === 'help' ? fixed.stopFill : fixed.track;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size.riderDot, height: size.riderDot, borderRadius: radius.chip, backgroundColor: color, borderWidth: size.rule, borderColor: asking ? ring : fixed.white }} />
      <View style={{ marginLeft: space[1], paddingHorizontal: space[2], paddingVertical: space.half, borderRadius: radius.chip, backgroundColor: asking ? ring : fixed.white, maxWidth: size.riderLabel }}>
        <Text variant="labelMedium" numberOfLines={1} style={{ color: asking ? fixed.white : color }}>{asking ? `${mark.name.split(' ')[0]} · ${STATUS_LABEL[asking]}` : mark.name}</Text>
      </View>
    </View>
  );
}

/** Riders too close to name one by one: up to three overlapping dots in their colours and how many there are, in a round-ended badge. Tapping it lists them. */
export function ClusterPin({ cluster }: { cluster: RiderCluster }) {
  return (
    <View accessibilityLabel={clusterLabel(cluster)} style={{ minHeight: size.chip, paddingHorizontal: space[2], borderRadius: radius.chip, backgroundColor: inkSolid, borderWidth: size.rule, borderColor: fixed.white, flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <View style={{ flexDirection: 'row' }}>
        {cluster.marks.slice(0, 3).map((m, i) => <View key={m.id} style={{ width: size.riderDot, height: size.riderDot, borderRadius: radius.chip, backgroundColor: riderColor(m.slot), borderWidth: size.rule, borderColor: inkSolid, marginLeft: i ? -space[2] : 0 }} />)}
      </View>
      <Text variant="labelMedium" style={{ color: fixed.white }}>{cluster.marks.length}</Text>
    </View>
  );
}

/** The group's destination as a map pin, its tip on the spot, with the place name above when there is one. */
export function DestinationPin({ name }: { name?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {name ? (
        <View style={{ paddingHorizontal: space[2], paddingVertical: space.half, borderRadius: radius.chip, backgroundColor: fixed.white, maxWidth: size.riderLabel }}>
          <Text variant="labelMedium" numberOfLines={1} style={{ color: fixed.ink }}>{name}</Text>
        </View>
      ) : null}
      <MapPin size={size.pin} color={fixed.white} fill={inkSolid} strokeWidth={size.outline} />
    </View>
  );
}

/** Who is in a badge: a card over the map with each rider's colour and name. */
export function ClusterList({ cluster, onClose }: { cluster: RiderCluster; onClose: () => void }) {
  const { c } = useTheme();
  return (
    <>
      <Pressable accessibilityLabel="Close the list of riders" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      <View style={{ position: 'absolute', top: space[3], left: space[3], right: space[3], maxHeight: size.clusterList, padding: space[3], borderRadius: radius.control, backgroundColor: c.raised, gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="labelMedium">{`${cluster.marks.length} riders here`}</Text>
          <IconButton plain size={size.chip} icon={X} label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ gap: space[2] }}>
          {cluster.marks.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <View style={{ width: size.riderDot, height: size.riderDot, borderRadius: radius.chip, backgroundColor: riderColor(m.slot, c.riders) }} />
              <Text variant="label" numberOfLines={1} style={{ flex: 1, color: riderColor(m.slot, c.riders) }}>{m.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

/**
 * The arrow for the way the rider is facing, like Google Maps'. `rotation` is the heading minus the map's own bearing, in degrees:
 * while the map follows the rider it is turned to the heading, so the arrow points up the screen; once the rider has turned the
 * map by hand it still points the way the bike is going.
 */
export function HeadingPointer({ rotation = 0 }: { rotation?: number }) {
  return (
    <View style={{ width: size.pin, height: size.pin, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${rotation}deg` }] }}>
      <Navigation2 size={size.pin - space[2]} color={fixed.white} fill={fixed.position} strokeWidth={size.rule} />
    </View>
  );
}
