import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { media } from '@/theme/tokens';
import { clubCover } from './ClubCover.tokens';

/** A club's cover image, or its initials on the accent colour when no cover is set. */
export function ClubCover({ name, url, height = media.coverCard }: { name: string; url?: string | null; height?: number }) {
  const { c } = useTheme();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return url ? (
    <Image source={{ uri: url }} accessibilityLabel={`${name} cover`} style={{ width: '100%', height }} resizeMode="cover" />
  ) : (
    <View accessibilityLabel={`${name}, no cover image`} style={{ width: '100%', height, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="hero" style={{ color: c.accentInk, letterSpacing: clubCover.tracking }}>{initials}</Text>
    </View>
  );
}
