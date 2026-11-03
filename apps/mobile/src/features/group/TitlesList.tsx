import { View } from 'react-native';
import type { EventRole } from '@/api/types';
import { ROLE_LABEL, ROLES } from '@/lib/eventCore';
import type { GroupRiderView } from '@/lib/groupCore';
import { space } from '@/theme/tokens';
import { ChoiceChip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { ROLE_ICON } from './roleIcons';

/**
 * For the leader: every rider with the titles they can be given, one chosen at a time, or none. A title is a job the whole group sees next
 * to the rider's name (a medic is who to look for when someone needs help).
 */
export function TitlesList({ riders, meId, onSet }: { riders: GroupRiderView[]; meId?: string; onSet: (rider: GroupRiderView, title: EventRole | null) => void }) {
  return (
    <View style={{ gap: space[4] }}>
      <Text variant="label" tone="muted">Give a rider a job the group can see beside their name. Tap their title again to take it away.</Text>
      {riders.map((r) => (
        <View key={r.id} style={{ gap: space[2] }}>
          <Text variant="labelMedium">{r.id === meId ? `${r.name} (you)` : r.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {ROLES.map((role) => <ChoiceChip key={role} icon={ROLE_ICON[role]} label={ROLE_LABEL[role]} selected={r.eventRole === role} onPress={() => onSet(r, r.eventRole === role ? null : role)} />)}
          </View>
        </View>
      ))}
    </View>
  );
}
