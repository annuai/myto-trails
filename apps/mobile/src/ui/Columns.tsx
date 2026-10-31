import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLayout } from './useLayout';

import { space } from '@/theme/tokens';
/** One column in portrait, two side by side in landscape. Put the most important content on the left. */
export function Columns({ left, right, ratio = 1, rightStartsWithSection }: { left: ReactNode; right: ReactNode; ratio?: number; rightStartsWithSection?: boolean }) {
  const { landscape } = useLayout();
  if (!landscape) return <>{left}{right}</>;
  return (
    <View style={{ flexDirection: 'row', gap: space[6], alignItems: 'flex-start' }}>
      <View style={{ flex: ratio, minWidth: 0 }}>{left}</View>
      <View style={{ flex: 1, minWidth: 0, marginTop: rightStartsWithSection ? -space[8] : 0 }}>{right}</View>
    </View>
  );
}
