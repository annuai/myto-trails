// Stand-in for expo-linear-gradient: the app's ink fill is a single colour, so a plain View is enough (and it avoids pulling in the Expo runtime).
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export const LinearGradient = ({ colors, style, children }: { colors: readonly string[]; start?: unknown; end?: unknown; style?: StyleProp<ViewStyle>; children?: ReactNode; pointerEvents?: unknown }) => (
  <View style={[{ backgroundColor: colors[0] }, style]}>{children}</View>
);
