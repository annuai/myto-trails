import { useRef, type ComponentRef } from 'react';
import { Image, PixelRatio, Platform, type View } from 'react-native';
import { filmImage } from '@/ui/FilmImage.tokens';

/** The size, in pixels, a baked picture gets: the photo's own proportions with the long side at the standard journal size (never larger than the photo). */
export function bakeSize(w: number, h: number, longSide: number = filmImage.bakeLongSide) {
  const k = Math.min(1, longSide / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

/** A hidden, full-size copy of the picture to capture: `ref` goes on it, `bake` takes the picture and returns the file. Phone only (a browser cannot draw the filters into a bitmap). */
export function useBake(uri: string | null) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const bake = async (size: { width: number; height: number }): Promise<string> => {
    if (Platform.OS === 'web') throw new Error('Film pictures are made in the phone app.');
    if (uri) await Image.prefetch(uri);
    await new Promise((r) => setTimeout(r, filmImage.bakeSettleMs));
    if (!ref.current) throw new Error('Nothing to capture.');
    const { captureRef } = await import('react-native-view-shot');
    return captureRef(ref, { format: 'jpg', quality: filmImage.bakeJpegQuality, result: 'tmpfile', width: size.width, height: size.height });
  };
  return { ref, bake, ratio: PixelRatio.get() };
}
