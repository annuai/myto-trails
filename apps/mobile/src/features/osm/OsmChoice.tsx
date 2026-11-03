import { View } from 'react-native';
import { Checkbox } from '@/ui/Checkbox';
import { checkbox } from '@/ui/Checkbox.tokens';
import { Text } from '@/ui/Text';
import { size, space } from '@/theme/tokens';
import { OSM_CHECKBOX, OSM_DISCLAIMER } from './copy';

/** The tick box, checked to begin with, and what it means underneath it. */
export function OsmChoice({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ gap: space[2] }}>
      {/* The box sits inside a larger touch area: pulled left by the difference so the box, not the empty target, lines up with the text above and below. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -(size.target - checkbox.box) / 2 }}>
        <Checkbox checked={checked} onChange={onChange} label={OSM_CHECKBOX} />
        <Text variant="bodyMedium" style={{ flex: 1 }} onPress={() => onChange(!checked)}>{OSM_CHECKBOX}</Text>
      </View>
      <Text variant="caption" tone="muted">{OSM_DISCLAIMER}</Text>
    </View>
  );
}
