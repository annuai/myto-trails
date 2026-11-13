import { Canvas, Fill, ImageShader, RuntimeShader, useImage } from '@shopify/react-native-skia';
import type { LookId } from '@/lib/filmLook';
import { uniformMap } from '@/lib/film/filmShader';
import { filmEffect } from '@/lib/film/skiaFilm';
import { cameraTokens as k } from './CameraCapture.tokens';

const SAMPLE = require('../../../assets/rider-on-ridge.jpg') as number;

/** A look's thumbnail: the real film shader on a sample photo, so the strip shows what each look does. */
export function LookSwatch({ id, size = k.swatch }: { id: LookId; size?: number }) {
  const image = useImage(SAMPLE);
  if (!image || !filmEffect) return null;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Fill>
        <RuntimeShader source={filmEffect} uniforms={uniformMap({ id, intensity: 1 }, size, size)}>
          <ImageShader image={image} fit="cover" rect={{ x: 0, y: 0, width: size, height: size }} />
        </RuntimeShader>
      </Fill>
    </Canvas>
  );
}
