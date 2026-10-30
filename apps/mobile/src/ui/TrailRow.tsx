import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Tint, space, media } from '@/theme/tokens';
import { asText, distanceKm } from '@/lib/units';
import { Measure } from './Measure';
import { RouteArt } from './RouteArt';
import { StatusChip, type Status } from './Chip';
import { Text } from './Text';
import { ScalePressable } from './motion';

export type TrailLike = { id: string; name: string; km: number; time: string; difficulty: string; status: Status; statusLabel: string; seed: number; tint: Tint; cover?: string; coverAlt?: string };

const Thumb = ({ trail, size }: { trail: TrailLike; size: number }) => trail.cover
  ? <Image source={{ uri: trail.cover }} accessibilityLabel={trail.coverAlt} style={{ width: size, height: size }} resizeMode="cover" />
  : <RouteArt seed={trail.seed} tint={trail.tint} height={size} width={size} />;

export function TrailRow({ trail, onPress }: { trail: TrailLike; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[3], borderRadius: radius.card, backgroundColor: pressed ? c.raised : c.card })}>
      <View style={{ width: media.trailThumb, height: media.trailThumb, borderRadius: radius.thumb, overflow: 'hidden' }}>
        <Thumb trail={trail} size={76} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyMedium">{trail.name}</Text>
        <Text variant="data" tone="muted">{asText(distanceKm(trail.km))} · {trail.time} · {trail.difficulty}</Text>
        <StatusChip status={trail.status} label={trail.statusLabel} />
      </View>
    </ScalePressable>
  );
}

export function TrailTile({ trail, onPress }: { trail: TrailLike; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress} style={{ width: media.trailTileW, borderRadius: radius.card, backgroundColor: c.card, overflow: 'hidden' }}>
      <View style={{ height: media.trailTileH, overflow: 'hidden' }}>{trail.cover ? <Image source={{ uri: trail.cover }} accessibilityLabel={trail.coverAlt} style={{ width: '100%', height: media.trailTileH }} resizeMode="cover" /> : <RouteArt seed={trail.seed} tint={trail.tint} height={120} />}</View>
      <View style={{ padding: space[4], gap: space[1] }}>
        <Measure parts={distanceKm(trail.km)} />
        <Text variant="label" tone="muted" numberOfLines={1}>{trail.name}</Text>
      </View>
    </ScalePressable>
  );
}
