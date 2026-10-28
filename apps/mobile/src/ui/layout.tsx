import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { space } from '@/theme/tokens';

type Gap = keyof typeof space;
type Props = { gap?: Gap; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent']; wrap?: boolean; flex?: boolean; children: ReactNode };

/** Children one under the other, with a gap taken from the spacing tokens. */
export function Stack({ gap = 3, align, justify, flex, children }: Omit<Props, 'wrap'>) {
  return <View style={{ gap: space[gap], alignItems: align, justifyContent: justify, flex: flex ? 1 : undefined }}>{children}</View>;
}

/** Children side by side, with a gap taken from the spacing tokens. */
export function Inline({ gap = 3, align = 'center', justify, wrap, flex, children }: Props) {
  return <View style={{ flexDirection: 'row', gap: space[gap], alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap', flex: flex ? 1 : undefined }}>{children}</View>;
}
