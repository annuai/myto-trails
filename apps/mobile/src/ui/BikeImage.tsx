import { Image, View, type ViewStyle } from 'react-native';
import { Bike } from 'lucide-react-native';
import { resolveBikeImage } from '@moto-trails/domain';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import type { BikeImageVariants } from '@/api/types';
import { bikeImage } from './BikeImage.tokens';
import { Icon } from './Icon';

type Source = string | BikeImageVariants | null | undefined;

/**
 * One image per bike: the rider's own photo, else the catalogue picture, else a placeholder. `want` is the width in
 * pixels the picture is shown at, so the smallest sufficient catalogue variant is loaded.
 */
export function BikeImage({ own, preset, want, label, style }: { own?: Source; preset?: Source; want: number; label: string; style?: ViewStyle }) {
  const { c } = useTheme();
  const { url, own: isOwn } = resolveBikeImage(own, preset, want);
  return (
    <View accessibilityLabel={url ? label : `${label}, no picture yet`} style={[{ width: '100%', aspectRatio: bikeImage.aspect, borderRadius: radius.control, overflow: 'hidden', backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }, style]}>
      {url ? (
        // The rider's photo fills the frame; catalogue pictures are transparent cut-outs and must not be cropped.
        <Image source={{ uri: url }} accessibilityLabel={label} style={{ width: '100%', height: '100%' }} resizeMode={isOwn ? 'cover' : 'contain'} />
      ) : (
        <Icon icon={Bike} tone="muted" />
      )}
    </View>
  );
}
