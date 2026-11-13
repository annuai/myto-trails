import { createElement as h, useEffect, useId, useMemo } from 'react';
import { buildWaveRig, shapeToSvg, skinWave, wavePoseAt } from './waveRig';
import { waveArt as art } from './Wave.tokens';

/** The browser version: the same rig drawn as plain SVG, redrawn by `requestAnimationFrame`. See WaveDog.tsx. */
export function WaveDog({ width }: { width: number }) {
  const rig = useMemo(() => buildWaveRig(), []);
  const key = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const root = document.getElementById(`wave${key}`);
    if (reduced || !root) return;
    const els = Array.from(root.children);
    const out = new Float32Array(rig.rest.length);
    const start = performance.now();
    let id = 0;
    const frame = (now: number) => {
      id = requestAnimationFrame(frame);
      skinWave(rig, wavePoseAt((now - start) / 1000), out);
      rig.shapes.forEach((_, i) => els[i]?.setAttribute('d', shapeToSvg(rig, i, out)));
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [rig, reduced, key]);
  return h('svg', { width, height: (width * art.height) / art.width, viewBox: `0 0 ${art.width} ${art.height}`, style: { display: 'block' } },
    h('g', { id: `wave${key}` }, rig.shapes.map((s, i) => h('path', { key: i, d: shapeToSvg(rig, i, rig.rest), fill: art.colors[s.color] }))));
}
