import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { media } from '@/theme/tokens';

/** A rider's picture, or their initials on the accent colour when they have not set one. */
export function Avatar({ name, url, size = media.avatarSm }: { name: string; url?: string | null; size?: number }) {
  const { c } = useTheme();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  return url ? (
    <Image source={{ uri: url }} accessibilityLabel={`${name}'s picture`} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
  ) : (
    <View accessibilityLabel={`${name}, no picture`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="labelMedium" style={{ color: c.accentInk, fontSize: size * 0.38, lineHeight: size * 0.5 }}>{initials}</Text>
    </View>
  );
}
