import { Linking, ScrollView, View } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { STATUS_LABEL, type RiderTile } from '@/lib/groupCore';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { useTheme } from '@/theme/ThemeProvider';
import { media, opacity, radius, space } from '@/theme/tokens';
import { Avatar } from '@/ui/Avatar';
import { StatusChip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Text } from '@/ui/Text';

/**
 * One tile for each rider in the group ride: who they are, how far, how fresh their position is, and any signal they gave. Tapping a
 * tile opens Google Maps to where that rider was last seen, once you have stopped. Only riders of this group are ever shown.
 */
export function RiderTiles({ tiles, canNavigate }: { tiles: RiderTile[]; canNavigate: boolean }) {
  const { c } = useTheme();
  const open = (t: RiderTile) => { if (t.position) void Linking.openURL(mapsDirectionsUrl(t.position)).catch(() => undefined); };
  return (
    <View style={{ gap: space[2] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        {tiles.map((t) => {
          const tappable = !t.isMe && !!t.position && canNavigate;
          return (
            <ScalePressable key={t.id} scaleTo={0.97} disabled={!tappable} accessibilityRole="button"
              accessibilityLabel={t.isMe ? 'You' : `${t.name}, ${t.distance ?? t.seen}. ${canNavigate ? 'Open directions in Google Maps' : 'Directions open when you have stopped'}`}
              onPress={() => open(t)}
              style={{ width: media.riderTile, borderRadius: radius.control, padding: space[3], gap: space[2], backgroundColor: c.raised, opacity: t.stale && !t.isMe ? opacity.stale : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Avatar name={t.name} size={media.avatarSm} />
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" numberOfLines={1}>{t.isMe ? 'You' : t.name}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>{t.role === 'leader' ? 'Leader' : t.isMe ? 'Member' : t.seen}</Text>
                </View>
              </View>
              <Text variant="label" tone="muted" numberOfLines={1}>{t.isMe ? 'This phone' : t.distance ? `${t.distance} · ${t.seen}` : t.seen}</Text>
              {t.status !== 'ok' ? <StatusChip status={t.status === 'help' ? 'stop' : 'caution'} label={STATUS_LABEL[t.status]} /> : null}
              {tappable ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
                  <Icon icon={Navigation} size={16} tone="accent" />
                  <Text variant="labelMedium" tone="accent">Navigate</Text>
                </View>
              ) : null}
            </ScalePressable>
          );
        })}
      </ScrollView>
      {!canNavigate ? <Text variant="caption" tone="muted">Directions open when you have stopped.</Text> : null}
    </View>
  );
}
