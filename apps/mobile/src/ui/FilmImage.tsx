import { useId } from 'react';
import Svg, { Defs, FeColorMatrix, FeTurbulence, Filter, Image as SvgImage, RadialGradient, Rect, Stop } from 'react-native-svg';
import { lookParams, matrixValues, type FilmLook } from '@/lib/filmLook';
import { fixed } from '@/theme/tokens';
import { filmImage as t } from './FilmImage.tokens';

/** Black speckle: the noise's red channel becomes the alpha (only its upper part, so most of the picture is untouched and blacks and whites keep their contrast). */
const GREY = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.8 0 0 0 -0.6';

/**
 * A photo drawn with a film look. The look's colour matrix, grain and vignette are SVG filters over the picture, so
 * the same component shows the live preview and, captured at full size, makes the saved picture. `pixelWidth` and
 * `pixelHeight` are the photo's own size (they set the grain's scale); `width` and `height` are where it is drawn.
 */
export function FilmImage({ uri, pixelWidth, pixelHeight, width, height, look }: { uri: string; pixelWidth: number; pixelHeight: number; width: number; height: number; look: FilmLook }) {
  const key = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = lookParams(look.id, look.intensity);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${pixelWidth} ${pixelHeight}`}>
      <Defs>
        <Filter id={`c${key}`} x="0" y="0" width="100%" height="100%">
          <FeColorMatrix type="matrix" values={matrixValues(p.matrix)} />
        </Filter>
        <Filter id={`g${key}`} x="0" y="0" width="100%" height="100%">
          <FeTurbulence type="fractalNoise" baseFrequency={t.grainFrequency} numOctaves={t.grainOctaves} seed={t.grainSeed} stitchTiles="stitch" />
          <FeColorMatrix type="matrix" values={GREY} />
        </Filter>
        <RadialGradient id={`v${key}`} cx="50%" cy="50%" r="75%">
          <Stop offset={t.vignetteStart} stopColor={fixed.shadow} stopOpacity={0} />
          <Stop offset={1} stopColor={fixed.shadow} stopOpacity={p.vignette} />
        </RadialGradient>
      </Defs>
      <SvgImage href={{ uri }} x={0} y={0} width={pixelWidth} height={pixelHeight} preserveAspectRatio="xMidYMid slice" filter={p.neutral ? undefined : `url(#c${key})`} />
      {p.grain > 0 ? <Rect x={0} y={0} width={pixelWidth} height={pixelHeight} fill={fixed.shadow} filter={`url(#g${key})`} opacity={p.grain * t.grainOpacityScale} /> : null}
      {p.vignette > 0 ? <Rect x={0} y={0} width={pixelWidth} height={pixelHeight} fill={`url(#v${key})`} /> : null}
    </Svg>
  );
}
