import { View } from 'react-native';
import { Canvas, Fill, ImageShader, RuntimeShader, useImage } from '@shopify/react-native-skia';
import type { FilmLook } from '@/lib/filmLook';
import { uniformMap } from '@/lib/film/filmShader';
import { filmEffect } from '@/lib/film/skiaFilm';

/**
 * A photo drawn with a film look by the GPU film shader (lib/film/filmShader): the same shader that runs on the camera's
 * viewfinder and bakes the saved photo. `pixelWidth` and `pixelHeight` are kept for the browser version, which needs them.
 */
export function FilmImage({ uri, width, height, look }: { uri: string; pixelWidth: number; pixelHeight: number; width: number; height: number; look: FilmLook }) {
  const image = useImage(uri);
  if (!image || !filmEffect) return <View style={{ width, height }} />;
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <RuntimeShader source={filmEffect} uniforms={uniformMap(look, width, height)}>
          <ImageShader image={image} fit="cover" rect={{ x: 0, y: 0, width, height }} />
        </RuntimeShader>
      </Fill>
    </Canvas>
  );
}
