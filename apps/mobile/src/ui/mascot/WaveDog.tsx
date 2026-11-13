import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { Shape } from './Shape';
import { buildWaveRig, shapeToSvg, skinWave, wavePoseAt, type WaveRig } from './waveRig';
import { waveArt as art } from './Wave.tokens';

let cache: { rig: WaveRig; still: SkPath[] } | undefined;
/** Parsed once for the whole app. */
function model() {
  if (!cache) {
    const rig = buildWaveRig();
    cache = { rig, still: rig.shapes.map((_, i) => Skia.Path.MakeFromSVGString(shapeToSvg(rig, i, rig.rest)) ?? Skia.Path.Make()) };
  }
  return cache;
}

/**
 * Pillion waving hello: three waves, a rest, and round again, breathing all the while. The arm is skinned to a bone (waveRig.ts), so the
 * outline and the fills bend together and the paw never breaks off. With Reduce Motion on it is the drawn picture. Browsers get WaveDog.web.tsx.
 */
export function WaveDog({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const { rig, still } = useMemo(() => model(), []);
  const k = width / art.width;
  const t = useSharedValue(0);
  useFrameCallback((frame) => {
    'worklet';
    t.value = (frame.timeSinceFirstFrame ?? 0) / 1000;
  }, !reduced);
  const coords = useDerivedValue(() => {
    'worklet';
    const out = new Float32Array(rig.rest.length);
    skinWave(rig, wavePoseAt(t.value), out);
    return out;
  });
  return (
    <Canvas style={{ width, height: art.height * k }}>
      <Group transform={[{ scale: k }]}>
        {rig.shapes.map((s, i) => (reduced ? <Path key={i} path={still[i]} color={art.colors[s.color]} /> : <Shape key={i} rig={rig} index={i} color={art.colors[s.color]} coords={coords} />))}
      </Group>
    </Canvas>
  );
}
