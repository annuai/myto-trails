import { forwardRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Text as SvgText, TSpan } from 'react-native-svg';
import { recapTokens as T } from '@/lib/recapCard.tokens';
import { asText, distanceKm, durationParts, type Quantity } from '@/lib/units';
import type { YearRecap } from '@/lib/yearRecap';
import { fixed } from '@/theme/tokens';
import { LOGO_PATHS, LOGO_RATIO } from './logoPaths';

/** A number and its smaller unit as one run of text, like the ride card. */
function Value({ parts, size, unitSize }: { parts: Quantity[]; size: number; unitSize: number }) {
  return (
    <>
      {parts.map((p, i) => (
        <TSpan key={i}>
          <TSpan fontFamily="Geist_600SemiBold" fontSize={size}>{p.value}</TSpan>
          <TSpan fontFamily="Geist_500Medium" fontSize={unitSize} fillOpacity={T.faint}>{` ${p.unit}${i < parts.length - 1 ? '  ' : ''}`}</TSpan>
        </TSpan>
      ))}
    </>
  );
}

/** A year's riding in hours when it is an hour or more ("112 h"), else minutes. A year of rides is never shown to the minute. */
export const hoursOf = (sec: number): Quantity[] => (sec >= 3600 ? [{ value: String(Math.round(sec / 3600)), unit: 'h' }] : durationParts(sec));

/**
 * The shareable picture of a rider's year: distance, rides, days ridden, time, the longest ride and the busiest month. It has no map and
 * no ride names, so it shows nothing about where the rider lives or goes. Drawn on its own fixed canvas and scaled to `width`, so the
 * preview and the picture that is saved are the same drawing.
 */
export const RecapCard = forwardRef<ComponentRef<typeof View>, { recap: YearRecap; width: number }>(function RecapCard({ recap, width }, ref) {
  const { width: W, height: H } = T.size;
  const col = (W - T.pad * 2) / 3, half = (W - T.pad * 2) / 2;
  const logoW = T.logoHeight * LOGO_RATIO;
  const label = (x: number, y: number, text: string) => <SvgText x={x} y={y} fill={fixed.white} fillOpacity={T.faint} fontFamily="Geist_500Medium" fontSize={T.font.label}>{text}</SvgText>;
  return (
    <View ref={ref} collapsable={false} style={{ width, height: (width * H) / W, backgroundColor: fixed.ink, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <SvgText x={T.pad} y={T.y.kicker} fill={fixed.white} fillOpacity={T.faint} fontFamily="Geist_500Medium" fontSize={T.font.kicker}>YOUR YEAR ON THE ROAD</SvgText>
        <SvgText x={T.pad} y={T.y.year} fill={fixed.track} fontFamily="Geist_600SemiBold" fontSize={T.font.year}>{String(recap.year)}</SvgText>
        {label(T.pad, T.y.heroLabel, 'DISTANCE')}
        <SvgText x={T.pad} y={T.y.hero} fill={fixed.white}><Value parts={[distanceKm(recap.distanceKm)]} size={T.font.heroValue} unitSize={T.font.heroUnit} /></SvgText>
        {[['RIDES', [{ value: String(recap.rides), unit: '' }]], ['DAYS RIDDEN', [{ value: String(recap.daysRidden), unit: '' }]], ['IN THE SADDLE', hoursOf(recap.durationSec)]].map(([text, parts], i) => (
          <G key={text as string}>
            {label(T.pad + i * col, T.y.gridLabel, text as string)}
            <SvgText x={T.pad + i * col} y={T.y.grid} fill={fixed.white}><Value parts={parts as Quantity[]} size={T.font.value} unitSize={T.font.unit} /></SvgText>
          </G>
        ))}
        {recap.longest ? (
          <G>
            {label(T.pad, T.y.bestLabel, 'LONGEST RIDE')}
            <SvgText x={T.pad} y={T.y.best} fill={fixed.white}><Value parts={[distanceKm(recap.longest.distanceKm)]} size={T.font.value} unitSize={T.font.unit} /></SvgText>
          </G>
        ) : null}
        {recap.busiestMonth ? (
          <G>
            {label(T.pad + half, T.y.bestLabel, 'BUSIEST MONTH')}
            <SvgText x={T.pad + half} y={T.y.best} fill={fixed.white} fontFamily="Geist_600SemiBold" fontSize={T.font.month}>{recap.busiestMonth.name}</SvgText>
            <SvgText x={T.pad + half} y={T.y.bestSub} fill={fixed.white} fillOpacity={T.faint} fontFamily="Geist_500Medium" fontSize={T.font.unit}>{asText(distanceKm(recap.busiestMonth.distanceKm))}</SvgText>
          </G>
        ) : null}
        <G transform={`translate(${T.pad}, ${H - T.pad - T.logoHeight}) scale(${T.logoHeight / 42})`}>
          {LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={fixed.white} />)}
        </G>
        <SvgText x={T.pad + logoW + 24} y={H - T.pad - 16} fill={fixed.white} fillOpacity={T.faint} fontFamily="Geist_500Medium" fontSize={T.font.badge}>Myto Moto</SvgText>
      </Svg>
    </View>
  );
});
