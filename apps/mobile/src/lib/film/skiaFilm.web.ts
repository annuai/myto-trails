import { Image } from 'react-native';
import type { FilmLook } from '../filmLook';

/** The browser has no Skia: a filmed photo is only made in the phone app. */
export const filmEffect = null;
export async function bakeFilm(_source: string, _look: FilmLook, _longSide: number, _quality: number): Promise<string> {
  throw new Error('Film pictures are made in the phone app.');
}

/** The browser draws the photo itself, so it only needs the size. */
export const uprightPhoto = (source: string, _longSide: number): Promise<{ uri: string; width: number; height: number }> =>
  new Promise((resolve, reject) => Image.getSize(source, (width, height) => resolve({ uri: source, width, height }), reject));
