import { Image, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** A picture that fills the space it is given, with the card's corners. It is decoration: the words beside it carry the meaning. */
export function Illustration({ source }: { source: ImageSourcePropType }) {
  const { c } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, borderRadius: radius.card, overflow: 'hidden', backgroundColor: c.card }}>
      <Image source={source} resizeMode="cover" accessibilityIgnoresInvertColors style={{ flex: 1, width: '100%' }} />
    </View>
  );
}
