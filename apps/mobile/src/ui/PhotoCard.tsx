import { forwardRef, type ComponentRef } from 'react';
import { Image, View } from 'react-native';
import { overlayBox, type OverlayInk, type PhotoLayout, type Placement } from '@/lib/photoCard';
import type { PickedPhoto } from '@/lib/pickPhoto';
import type { CardModel } from '@/lib/rideCard';
import { PhotoOverlay } from './PhotoOverlay';

/**
 * The share card made of the rider's own photo: the photo fills the card (cover: an odd aspect is cropped, never
 * stretched) and the overlay lies on it where `placement` says (centre as fractions of the card, plus a scale).
 */
export const PhotoCard = forwardRef<ComponentRef<typeof View>, { model: CardModel; width: number; photo: PickedPhoto; layout: PhotoLayout; ink: OverlayInk; redRoute?: boolean; placement: Placement; /** Called once the photo has loaded (true) or failed to (false), so the picture is not saved before it shows. */ onReady?: (loaded: boolean) => void }>(function PhotoCard({ model, width, photo, layout, ink, redRoute, placement, onReady }, ref) {
  const height = (width * model.height) / model.width;
  const box = overlayBox(layout, model);
  const k = (width / model.width) * placement.scale;
  const ow = box.width * k, oh = box.height * k;
  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden' }}>
      <Image source={{ uri: photo.uri }} resizeMode="cover" onLoad={() => onReady?.(true)} onError={() => onReady?.(false)} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      <View style={{ position: 'absolute', left: placement.x * width - ow / 2, top: placement.y * height - oh / 2, width: ow, height: oh }}>
        <PhotoOverlay model={model} layout={layout} ink={ink} redRoute={redRoute} width={ow} />
      </View>
    </View>
  );
});
