import { createElement as h, useEffect, useId, useMemo } from 'react';
import { buildRig, dogRegion, poseAt, rockRegion, seamLine, shapeToSvg, skin, toPath } from './rig';
import { trailDogRig as R } from './rig.tokens';
import { trailDogArt as art } from './TrailDog.tokens';

const SETTLED = R.walk.lookStart + R.walk.lookSeconds + 0.5;

/** The browser version: the same rig drawn as plain SVG, redrawn by `requestAnimationFrame`. See TrailDog.tsx. */
export function TrailDog({ width }: { width: number }) {
  const rig = useMemo(() => buildRig(), []);
  const key = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const dog = document.getElementById(`dog${key}`);
    if (reduced || !dog) return;
    const els = Array.from(dog.children);
    const out = new Float32Array(rig.rest.length);
    const start = performance.now();
    let last = -1;
    let id = 0;
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      id = requestAnimationFrame(frame);
      if (t > SETTLED && t - last < 1 / 20) return;
      last = t;
      const pose = poseAt(t);
      skin(rig, pose, out);
      rig.shapes.forEach((_, i) => {
        if (!rig.still[i]) els[i]?.setAttribute('d', shapeToSvg(rig, i, out));
      });
      dog.setAttribute('opacity', String(pose.alpha));
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [rig, reduced, key]);
  const path = (i: number) => h('path', { key: i, d: shapeToSvg(rig, i, rig.rest), fill: art.colors[rig.shapes[i].color] });
  const dogClip = toPath(dogRegion());
  const rockClip = toPath(rockRegion());
  return h('svg', { width, height: (width * art.height) / art.width, viewBox: `0 0 ${art.width} ${art.height}`, style: { display: 'block' } },
    h('defs', null, h('clipPath', { id: `clipDog${key}` }, h('path', { d: dogClip })), h('clipPath', { id: `clipRock${key}` }, h('path', { d: rockClip }))),
    reduced
      ? rig.shapes.map((_, i) => path(i))
      : [
          h('g', { key: 'rock', clipPath: `url(#clipRock${key})` }, rig.shapes.map((s, i) => (s.maxY >= 985 ? path(i) : null)), h('path', { key: 'seam', d: toPath(seamLine()).replace(/Z$/, ''), fill: 'none', stroke: art.colors[0], strokeWidth: 3 })),
          h('g', { key: 'dog', id: `dog${key}`, clipPath: `url(#clipDog${key})` }, rig.shapes.map((_, i) => path(i))),
        ]);
}
