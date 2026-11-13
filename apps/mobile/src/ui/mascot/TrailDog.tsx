import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { Shape } from './Shape';
import { buildRig, dogRegion, poseAt, rockRegion, seamLine, shapeToSvg, skin, toPath, type Rig } from './rig';
import { trailDogRig as R } from './rig.tokens';
import { trailDogArt as art } from './TrailDog.tokens';

/** Once the dog has looked up it only breathes and swings its tail, so it is redrawn this many times a second, not every frame. */
const IDLE_FPS = 20;
const SETTLED = R.walk.lookStart + R.walk.lookSeconds + 0.5;

const fromSvg = (d: string): SkPath => Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();

let cache: { rig: Rig; still: SkPath[]; dogClip: SkPath; rockClip: SkPath; seam: SkPath } | undefined;
/** Parsed once for the whole app: the rig and every shape as drawn in the picture. */
function model() {
  if (!cache) {
    const rig = buildRig();
    cache = {
      rig,
      still: rig.shapes.map((_, i) => fromSvg(shapeToSvg(rig, i, rig.rest))),
      dogClip: fromSvg(toPath(dogRegion())),
      rockClip: fromSvg(toPath(rockRegion())),
      seam: fromSvg(toPath(seamLine()).replace(/Z$/, '')),
    };
  }
  return cache;
}

/**
 * The trail dog walking onto its rock and looking up, then idling (breathing, a slow tail). It plays once each time it is mounted (give it
 * a new `key` to replay); with Reduce Motion on it is simply the drawn picture. The rock is drawn once, still, and the dog, which is
 * skinned to a skeleton (rig.ts), above it, so neither the paws nor the outline can come apart. Browsers get TrailDog.web.tsx.
 */
export function TrailDog({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const { rig, still, dogClip, rockClip, seam } = useMemo(() => model(), []);
  const k = width / art.width;
  const t = useSharedValue(0);
  const last = useSharedValue(-1);
  useFrameCallback((frame) => {
    'worklet';
    const now = (frame.timeSinceFirstFrame ?? 0) / 1000;
    if (now > SETTLED && now - last.value < 1 / IDLE_FPS) return;
    last.value = now;
    t.value = now;
  }, !reduced);
  const pose = useDerivedValue(() => {
    'worklet';
    return poseAt(t.value);
  });
  const coords = useDerivedValue(() => {
    'worklet';
    const out = new Float32Array(rig.rest.length);
    skin(rig, pose.value, out);
    return out;
  });
  const alpha = useDerivedValue(() => {
    'worklet';
    return pose.value.alpha;
  });
  return (
    <Canvas style={{ width, height: art.height * k }}>
      <Group transform={[{ scale: k }]}>
        {reduced ? (
          rig.shapes.map((s, i) => <Path key={i} path={still[i]} color={art.colors[s.color]} />)
        ) : (
          <>
            <Group clip={rockClip}>
              {rig.shapes.map((s, i) => (s.maxY >= 985 ? <Path key={i} path={still[i]} color={art.colors[s.color]} /> : null))}
              <Path path={seam} color={art.colors[0]} style="stroke" strokeWidth={3} />
            </Group>
            <Group clip={dogClip} opacity={alpha}>
              {rig.shapes.map((s, i) => (rig.still[i] ? <Path key={i} path={still[i]} color={art.colors[s.color]} /> : <Shape key={i} rig={rig} index={i} color={art.colors[s.color]} coords={coords} />))}
            </Group>
          </>
        )}
      </Group>
    </Canvas>
  );
}
