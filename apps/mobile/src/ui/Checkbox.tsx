import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { InkFill } from './InkFill';
import { ScalePressable } from './motion';
import { size } from '@/theme/tokens';
import { checkbox } from './Checkbox.tokens';

/** 28 px box inside a 48 px target. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.9} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}>
      {checked ? (
        <InkFill style={{ width: checkbox.box, height: checkbox.box, borderRadius: checkbox.radius, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Check} size={18} tone="onInk" strokeWidth={3} />
        </InkFill>
      ) : (
        <View style={{ width: checkbox.box, height: checkbox.box, borderRadius: checkbox.radius, borderWidth: size.rule, borderColor: c.muted }} />
      )}
    </ScalePressable>
  );
}
