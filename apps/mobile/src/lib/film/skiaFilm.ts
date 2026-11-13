import { ImageFormat, Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import type { FilmLook } from '../filmLook';
import { FILM_SKSL, uniformMap } from './filmShader';

/** The compiled film shader (phone only: the browser has no Skia). Made once. */
export const filmEffect = Skia.RuntimeEffect.Make(FILM_SKSL);

/** The uniforms in the order the shader declares them, for `makeShaderWithChildren`. */
const ORDER = ['size', 'rowR', 'rowG', 'rowB', 'curve', 'shadowTone', 'highlightTone', 'split', 'grain', 'grainFrac', 'vignette', 'screenMode', 'screenMix', 'cellFrac', 'leak', 'seed'] as const;

/**
 * A copy of a photo as an upright JPEG with its long side at most `longSide`. Re-encoding applies the photo's EXIF rotation and turns
 * any format the phone writes (the camera's HEIC, for one) into one Skia can read, which it cannot do for HEIC: drawn straight from the
 * camera's file, the preview is blank, or lies on its side. Returns the copy's file URI and its size.
 */
export async function uprightPhoto(source: string, longSide: number, compress = 0.9): Promise<{ uri: string; width: number; height: number }> {
  const probe = await manipulateAsync(source, []);
  const resize = probe.width >= probe.height ? { width: Math.min(probe.width, longSide) } : { height: Math.min(probe.height, longSide) };
  const { uri, width, height } = await manipulateAsync(source, [{ resize }], { format: SaveFormat.JPEG, compress });
  return { uri, width, height };
}

/**
 * Bakes a film look into a photo with the same shader the viewfinder runs, and returns the new picture's file URI. The
 * source is first re-encoded at the journal size, which also applies its EXIF rotation, so the picture is the right way up.
 */
export async function bakeFilm(source: string, look: FilmLook, longSide: number, quality: number): Promise<string> {
  if (!filmEffect) throw new Error('The film shader did not compile.');
  const sized = await uprightPhoto(source, longSide, 1);
  const data = await Skia.Data.fromURI(sized.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not read the photo.');
  const { width, height } = sized;
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not make a canvas.');
  const map = uniformMap(look, width, height);
  const input = image.makeShaderOptions(0, 0, 1, 0); // clamp, clamp, linear, no mip
  const shader = filmEffect.makeShaderWithChildren(ORDER.flatMap((k) => map[k]!), [input]);
  const paint = Skia.Paint();
  paint.setShader(shader);
  const canvas = surface.getCanvas();
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, Math.round(quality * 100));
  const out = new File(Paths.cache, `film-${Date.now()}.jpg`);
  out.create({ overwrite: true });
  out.write(bytes);
  return out.uri;
}
