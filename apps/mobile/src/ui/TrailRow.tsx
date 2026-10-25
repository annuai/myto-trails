import { Image, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Tint } from '@/theme/tokens';
import { RouteArt } from './RouteArt';
import { StatusChip, type Status } from './Chip';
import { Text } from './Text';

export type TrailLike = { id: string; name: string; km: number; time: string; difficulty: string; status: Status; statusLabel: string; seed: number; tint: Tint; cover?: string; coverAlt?: string };

const Thumb = ({ trail, size }: { trail: TrailLike; size: number }) => trail.cover
  ? <Image source={{ uri: trail.cover }} accessibilityLabel={trail.coverAlt} style={{ width: size, height: size }} resizeMode="cover" />
  : <RouteArt seed={trail.seed} tint={trail.tint} height={size} width={size} />;

export function TrailRow({ trail, onPress }: { trail: TrailLike; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderRadius: radius.card, backgroundColor: pressed ? c.raised : c.card })}>
      <View style={{ width: 76, height: 76, borderRadius: radius.thumb, overflow: 'hidden' }}>
        <Thumb trail={trail} size={76} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyMedium">{trail.name}</Text>
        <Text variant="data" tone="muted">{trail.km} km · {trail.time} · {trail.difficulty}</Text>
        <StatusChip status={trail.status} label={trail.statusLabel} />
      </View>
    </Pressable>
  );
}

export function TrailTile({ trail, onPress }: { trail: TrailLike; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: 176, borderRadius: radius.card, backgroundColor: c.card, overflow: 'hidden' }}>
      <View style={{ height: 120, overflow: 'hidden' }}>{trail.cover ? <Image source={{ uri: trail.cover }} accessibilityLabel={trail.coverAlt} style={{ width: '100%', height: 120 }} resizeMode="cover" /> : <RouteArt seed={trail.seed} tint={trail.tint} height={120} />}</View>
      <View style={{ padding: 16, gap: 4 }}>
        <Text variant="dataLarge">{trail.km} km</Text>
        <Text variant="label" tone="muted" numberOfLines={1}>{trail.name}</Text>
      </View>
    </Pressable>
  );
}
