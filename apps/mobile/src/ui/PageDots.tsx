import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { InkFill } from './InkFill';

/** Which page of a set the rider is on: the current one is a longer pill. Read aloud as "Step 2 of 5" instead of five dots. */
export function PageDots({ count, index }: { count: number; index: number }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`Step ${index + 1} of ${count}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] }}>
      {Array.from({ length: count }, (_, i) => i === index
        ? <InkFill key={i} style={{ height: size.dot, width: space[6], borderRadius: radius.chip }} />
        : <View key={i} style={{ height: size.dot, width: size.dot, borderRadius: radius.chip, backgroundColor: c.line }} />)}
    </View>
  );
}
