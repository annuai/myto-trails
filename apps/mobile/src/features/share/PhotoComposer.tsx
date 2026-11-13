import { useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { applyPan, applyPinch, overlayBox, type OverlayInk, type PhotoLayout, type Placement } from '@/lib/photoCard';
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
  // Gesture callbacks outlive a render and events can arrive faster than React renders, so they work on refs:
  // the newest placement (synced from props each render, so an outside change wins; set by each event) and the callback.
  const latest = useRef(placement);
  latest.current = placement;
  const emit = useRef(onPlacement);
  emit.current = onPlacement;
  const startScale = useRef(placement.scale);
  const shown = useMemo(() => ({ width, height }), [width, height]);

  const gesture = useMemo(() => {
    const push = (next: Placement) => { latest.current = next; emit.current(next); };
    const pan = Gesture.Pan().runOnJS(true).onChange((e) => push(applyPan(latest.current, e.changeX, e.changeY, shown, box, card)));
    const pinch = Gesture.Pinch().runOnJS(true)
      .onBegin(() => { startScale.current = latest.current.scale; })
      .onChange((e) => push(applyPinch(latest.current, startScale.current, e.scale, box, card)));
    return Gesture.Simultaneous(pan, pinch);
  }, [shown, box, card]);

  return (
    <GestureDetector gesture={gesture}>
      <PhotoCard model={model} width={width} photo={photo} layout={layout} ink={ink} placement={placement} />
    </GestureDetector>
  );
}
