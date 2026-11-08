import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ScalePressable } from '@/ui/motion';
import { space } from '@/theme/tokens';
import { nowMs } from '@/lib/clock';
import { riderTiles, STATUS_LABEL } from '@/lib/groupCore';
import { useCompanion } from '@/store/companion';

/** Dash while a group ride is on: the group's name and code, and every rider with what they last said. Nothing when there is no group. Opens the group sheet. */
export function LiveGroupCard({ onOpen }: { onOpen: () => void }) {
  const group = useCompanion((s) => s.group);
  const live = useCompanion((s) => s.live);
  if (!group) return null;
  const riders = riderTiles(live.riders, live.me, undefined, nowMs());
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Group ride ${group.name}, code ${group.code}, ${riders.length} riders. Open it.`} onPress={onOpen}>
      <Card style={{ gap: space[3] }}>
        <View style={{ gap: space[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Icon icon={Users} size={20} />
            <Text variant="label" tone="muted">Group ride</Text>
          </View>
          <Text variant="bodyMedium">{group.name}</Text>
          <Text variant="label" tone="muted">Code {group.code}</Text>
        </View>
        {riders.length ? (
          <View style={{ gap: space[2] }}>
            {riders.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3] }}>
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{r.isMe ? `${r.name} (you)` : r.name}</Text>
                <Text variant="label" tone={r.status === 'help' ? 'stop' : 'muted'}>{r.status === 'ok' ? (r.distance ?? STATUS_LABEL.ok) : STATUS_LABEL[r.status]}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </ScalePressable>
  );
}
