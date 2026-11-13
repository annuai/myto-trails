import { useLayoutEffect, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { applyPan, applyPinch, overlayBox, type OverlayInk, type PhotoLayout, type Placement } from '@/lib/photoCard';
import type { PickedPhoto } from '@/lib/pickPhoto';
import type { CardModel } from '@/lib/rideCard';
import { useLatest } from '@/lib/useLatest';
import { PhotoCard } from '@/ui/PhotoCard';

/**
 * The photo card with the overlay the rider can drag and pinch. Gestures report screen pixels; they are turned into
 * picture pixels, and the placement helpers keep the overlay inside the picture, so nothing here clamps.
 */
export function PhotoComposer({ model, photo, layout, ink, placement, onPlacement, onActive, width }: { model: CardModel; photo: PickedPhoto; layout: PhotoLayout; ink: OverlayInk; placement: Placement; onPlacement: (p: Placement) => void; /** True while a finger drags or pinches the overlay (so the screen can stop scrolling), false when it lets go. */ onActive?: (active: boolean) => void; width: number }) {
  const height = (width * model.height) / model.width;
  const box = useMemo(() => overlayBox(layout, model), [layout, model]);
  const card = useMemo(() => ({ width: model.width, height: model.height }), [model.width, model.height]);
  // Gesture callbacks outlive a render and events can arrive faster than React renders, so they work on a ref of the newest
  // placement (synced from props after each render, so an outside change wins; set by each event) and on stable callbacks.
  const latest = useRef(placement);
  useLayoutEffect(() => { latest.current = placement; }, [placement]);
  const startScale = useRef(1);
  /** How many of pan and pinch are running: they overlap, so the drag ends only when both have. */
  const running = useRef(0);
  const shown = useMemo(() => ({ width, height }), [width, height]);
  // Stable handlers (useLatest) that always see the newest props, so the gesture is built once per size and never mid-drag.
  const push = useLatest((next: Placement) => { latest.current = next; onPlacement(next); });
  const begin = useLatest(() => { running.current += 1; if (running.current === 1) onActive?.(true); });
  const end = useLatest(() => { running.current = Math.max(0, running.current - 1); if (running.current === 0) onActive?.(false); });
  const pan = useLatest((changeX: number, changeY: number) => push(applyPan(latest.current, changeX, changeY, shown, box, card)));
  const pinchStart = useLatest(() => { begin(); startScale.current = latest.current.scale; });
  const pinch = useLatest((factor: number) => push(applyPinch(latest.current, startScale.current, factor, box, card)));

  const gesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan().runOnJS(true).onBegin(() => begin()).onFinalize(() => end()).onChange((e) => pan(e.changeX, e.changeY)),
    Gesture.Pinch().runOnJS(true).onBegin(() => pinchStart()).onFinalize(() => end()).onChange((e) => pinch(e.scale)),
  ), [begin, end, pan, pinchStart, pinch]);

  return (
    <GestureDetector gesture={gesture}>
      <PhotoCard model={model} width={width} photo={photo} layout={layout} ink={ink} placement={placement} />
    </GestureDetector>
  );
}
