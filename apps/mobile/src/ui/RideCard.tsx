import { forwardRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Polyline, Text as SvgText, TSpan } from 'react-native-svg';
import type { CardModel } from '@/lib/rideCard';
import { fixed } from '@/theme/tokens';
import { LOGO_PATHS, LOGO_RATIO, LOGO_VIEWBOX } from './logoPaths';

const PAD = 88;
const LOGO_H = 64;
const FAINT = 0.64;

/** The numbers of one stat, for example "2 h" and "15 min", as one run of text. */
function Value({ parts, size }: { parts: CardModel['stats'][number]['parts']; size: number }) {
  return (
    <>
      {parts.map((p, i) => (
        <TSpan key={i}>
          <TSpan fontFamily="Geist_600SemiBold" fontSize={size}>{p.value}</TSpan>
          <TSpan fontFamily="Geist_500Medium" fontSize={size * 0.42} fillOpacity={FAINT}>{` ${p.unit}${i < parts.length - 1 ? '  ' : ''}`}</TSpan>
        </TSpan>
      ))}
    </>
  );
}

/**
 * The shareable picture of a ride. Drawn as one SVG on the card's own 1080 wide canvas and scaled to `width`, so the
 * preview and the picture that is saved are the same drawing. The route is the privacy-trimmed one from the model.
 */
export const RideCard = forwardRef<ComponentRef<typeof View>, { model: CardModel; width: number }>(function RideCard({ model, width }, ref) {
  const { width: W, height: H } = model;
  const routeSide = Math.min(W - PAD * 2, H * 0.46);
  const routeTop = H * 0.2;
  // The drawing keeps the route's proportions inside a square of `routeSide`.
  const fit = model.routeAspect >= 1 ? { w: routeSide, h: routeSide / model.routeAspect } : { w: routeSide * model.routeAspect, h: routeSide };
  const ox = (W - fit.w) / 2, oy = routeTop + (routeSide - fit.h) / 2;
  const route = model.route?.map((p) => `${(ox + p.x * fit.w).toFixed(1)},${(oy + p.y * fit.h).toFixed(1)}`).join(' ');
  const statY = Math.min(H - PAD - LOGO_H - 140, routeTop + routeSide + 150);
  const colW = (W - PAD * 2) / Math.max(1, model.stats.length);
  const logoW = LOGO_H * LOGO_RATIO;
  return (
    <View ref={ref} collapsable={false} style={{ width, height: (width * H) / W, backgroundColor: fixed.ink }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <SvgText x={PAD} y={PAD + 70} fill={fixed.white} fontFamily="Geist_600SemiBold" fontSize={72}>{model.title.length > 22 ? `${model.title.slice(0, 21)}…` : model.title}</SvgText>
        <SvgText x={PAD} y={PAD + 130} fill={fixed.white} fillOpacity={FAINT} fontFamily="Geist_500Medium" fontSize={36}>{model.date}</SvgText>
        {route ? <Polyline points={route} fill="none" stroke={fixed.track} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {model.stats.map((s, i) => (
          <G key={s.key}>
            <SvgText x={PAD + i * colW} y={statY} fill={fixed.white} fillOpacity={FAINT} fontFamily="Geist_500Medium" fontSize={30}>{s.label.toUpperCase()}</SvgText>
            <SvgText x={PAD + i * colW} y={statY + 100} fill={fixed.white}><Value parts={s.parts} size={model.stats.length > 3 ? 64 : 84} /></SvgText>
          </G>
        ))}
        <G transform={`translate(${PAD}, ${H - PAD - LOGO_H}) scale(${LOGO_H / 42})`}>
          {LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={fixed.white} />)}
        </G>
        <SvgText x={PAD + logoW + 24} y={H - PAD - 16} fill={fixed.white} fillOpacity={FAINT} fontFamily="Geist_500Medium" fontSize={34}>Myto Moto</SvgText>
      </Svg>
    </View>
  );
});
