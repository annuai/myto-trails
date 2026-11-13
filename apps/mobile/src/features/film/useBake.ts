import { bakeFilm } from '@/lib/film/skiaFilm';
import type { FilmLook } from '@/lib/filmLook';
import { filmImage } from '@/ui/FilmImage.tokens';

/** The size, in pixels, a baked picture gets: the photo's own proportions with the long side at the standard journal size (never larger than the photo). */
export function bakeSize(w: number, h: number, longSide: number = filmImage.bakeLongSide) {
  const k = Math.min(1, longSide / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

/** Bakes the look into the photo on the GPU (see lib/film/skiaFilm) and returns the new picture's URI. */
export function useBake(uri: string | null) {
  const bake = async (look: FilmLook): Promise<string> => {
    if (!uri) throw new Error('Nothing to bake.');
    return bakeFilm(uri, look, filmImage.bakeLongSide, filmImage.bakeJpegQuality);
  };
  return { bake };
}
