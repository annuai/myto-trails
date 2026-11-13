import { useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { dragPlacement, overlayBox, pinchPlacement, toPictureDelta, type OverlayInk, type PhotoLayout, type Placement } from '@/lib/photoCard';
import type { PickedPhoto } from '@/lib/pickPhoto';
import type { CardModel } from '@/lib/rideCard';
import { PhotoCard } from '@/ui/PhotoCard';

/**
 * The photo card with the overlay the rider can drag and pinch. Gestures report screen pixels; they are turned into
 * picture pixels, and the placement helpers keep the overlay inside the picture, so nothing here clamps.
 */
export function PhotoComposer({ model, photo, layout, ink, placement, onPlacement, width }: { model: CardModel; photo: PickedPhoto; layout: PhotoLayout; ink: OverlayInk; placement: Placement; onPlacement: (p: Placement) => void; width: number }) {
  const height = (width * model.height) / model.width;
  const box = useMemo(() => overlayBox(layout, model), [layout, model]);
  const card = useMemo(() => ({ width: model.width, height: model.height }), [model.width, model.height]);
  // Gesture callbacks outlive a render, so they read the newest placement from a ref.
  const latest = useRef(placement);
  latest.current = placement;
  const startScale = useRef(placement.scale);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().runOnJS(true).onChange((e) => {
      onPlacement(dragPlacement(latest.current, toPictureDelta(e.changeX, width, model.width), toPictureDelta(e.changeY, height, model.height), box, card));
    });
    const pinch = Gesture.Pinch().runOnJS(true)
      .onBegin(() => { startScale.current = latest.current.scale; })
      .onChange((e) => {
        // Scale about the overlay's centre: only the scale changes, from the scale at gesture start; a drag at the same time keeps its position.
        onPlacement(pinchPlacement({ ...latest.current, scale: startScale.current }, e.scale, box, card));
      });
    return Gesture.Simultaneous(pan, pinch);
  }, [onPlacement, width, height, model.width, model.height, box, card]);

  return (
    <GestureDetector gesture={gesture}>
      <PhotoCard model={model} width={width} photo={photo} layout={layout} ink={ink} placement={placement} />
    </GestureDetector>
  );
}
