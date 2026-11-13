/**
 * The traced pictures are lists of closed shapes made of M, L, C and Z. This reads them into flat number arrays once, so a rig can
 * move every point and write the shape back out as an SVG path each frame. Plain numbers and marked 'worklet' for the UI thread.
 */
export const VERB = { M: 0, L: 1, C: 2, Z: 3 } as const;

export type ShapeInfo = {
  color: number;
  /** The highest and lowest y the shape reaches, as drawn. */
  minY: number;
  maxY: number;
  verbStart: number;
  verbCount: number;
  pointStart: number;
  pointCount: number;
};

export type Shapes = {
  shapes: ShapeInfo[];
  verbs: Uint8Array;
  /** x, y of every point, as drawn in the picture. */
  rest: Float32Array;
};

/** `paths` is [colour index, SVG path] for each shape in drawing order. */
export function parseShapes(paths: readonly (readonly [number, string])[]): Shapes {
  const shapes: ShapeInfo[] = [];
  const verbList: number[] = [];
  const pts: number[] = [];
  for (const [color, d] of paths) {
    const tok = d.match(/[MLCZ]|-?\d*\.?\d+/g) as string[];
    const verbStart = verbList.length;
    const pointStart = pts.length / 2;
    let minY = Infinity;
    let maxY = -Infinity;
    let i = 0;
    while (i < tok.length) {
      const k = tok[i++] as keyof typeof VERB;
      verbList.push(VERB[k]);
      const n = k === 'Z' ? 0 : k === 'C' ? 3 : 1;
      for (let j = 0; j < n; j++) {
        const x = Number(tok[i++]);
        const y = Number(tok[i++]);
        pts.push(x, y);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    shapes.push({ color, minY, maxY, verbStart, verbCount: verbList.length - verbStart, pointStart, pointCount: pts.length / 2 - pointStart });
  }
  return { shapes, verbs: Uint8Array.from(verbList), rest: Float32Array.from(pts) };
}

/** One shape as an SVG path string, with its points taken from `coords` (same layout as `rest`). */
export function shapeToSvg(rig: Shapes, shape: number, coords: Float32Array): string {
  'worklet';
  const s = rig.shapes[shape];
  let d = '';
  let p = s.pointStart * 2;
  for (let v = s.verbStart; v < s.verbStart + s.verbCount; v++) {
    const verb = rig.verbs[v];
    if (verb === VERB.Z) d += 'Z';
    else if (verb === VERB.C) {
      d += `C${coords[p].toFixed(1)} ${coords[p + 1].toFixed(1)} ${coords[p + 2].toFixed(1)} ${coords[p + 3].toFixed(1)} ${coords[p + 4].toFixed(1)} ${coords[p + 5].toFixed(1)}`;
      p += 6;
    } else {
      d += `${verb === VERB.M ? 'M' : 'L'}${coords[p].toFixed(1)} ${coords[p + 1].toFixed(1)}`;
      p += 2;
    }
  }
  return d;
}
