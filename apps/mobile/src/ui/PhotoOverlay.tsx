import { forwardRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Polyline, Text as SvgText, TSpan } from 'react-native-svg';
import { overlayBox, type OverlayInk, type PhotoLayout } from '@/lib/photoCard';
import type { CardModel } from '@/lib/rideCard';
import { LOGO_PATHS } from './logoPaths';
import { photoCardTokens as t } from './PhotoCard.tokens';

type Stat = CardModel['stats'][number];

function Value({ parts, size }: { parts: Stat['parts']; size: number }) {
  return (
    <>
      {parts.map((p, i) => (
        <TSpan key={i}>
          <TSpan fontFamily="Geist_600SemiBold" fontSize={size}>{p.value}</TSpan>
          <TSpan fontFamily="Geist_500Medium" fontSize={size * 0.42} fillOpacity={t.faint}>{` ${p.unit}${i < parts.length - 1 ? '  ' : ''}`}</TSpan>
        </TSpan>
      ))}
    </>
  );
}

/** Everything the overlay draws, in one colour: drawn twice, first as the offset shadow, then in the ink. */
function Drawing({ model, layout, color, w, h }: { model: CardModel; layout: PhotoLayout; color: string; w: number; h: number }) {
  const n = Math.max(1, model.stats.length);
  const bar = layout === 'bar';
  const logoH = t.logoHeight;
  const logoY = h - logoH;
  let routeBox: { x: number; y: number; w: number; h: number } | null = null;
  let statTop = 0;
  if (model.route) {
    // A route sits above the stats, fitted without stretching it: a short strip on the bar, a tall block in the corner.
    const room = bar ? { w, h: h - 190 } : { w, h: 400 };
    const side = Math.min(room.w, room.h) - 20;
    const fit = model.routeAspect >= 1 ? { w: side, h: side / model.routeAspect } : { w: side * model.routeAspect, h: side };
    routeBox = { x: bar ? (w - fit.w) / 2 : 0, y: 10 + (side - fit.h) / 2, ...fit };
    statTop = room.h;
  }
  const pts = routeBox && model.route ? model.route.map((p) => `${(routeBox.x + p.x * routeBox.w).toFixed(1)},${(routeBox.y + p.y * routeBox.h).toFixed(1)}`).join(' ') : null;
  const colW = w / n;
  return (
    <>
      {pts ? <Polyline points={pts} fill="none" stroke={color} strokeWidth={t.routeStroke} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {model.stats.map((s, i) => {
        const x = bar ? i * colW : 0;
        const y = statTop + (bar ? 0 : i * 130);
        return (
          <G key={s.key}>
            <SvgText x={x} y={y + 36} fill={color} fillOpacity={t.faint} fontFamily="Geist_500Medium" fontSize={28}>{s.label.toUpperCase()}</SvgText>
            <SvgText x={x} y={y + (bar ? 112 : 104)} fill={color}><Value parts={s.parts} size={bar ? (n > 3 ? 64 : 80) : 72} /></SvgText>
          </G>
        );
      })}
      <G transform={`translate(0, ${logoY}) scale(${logoH / 42})`}>
        {LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={color} />)}
      </G>
    </>
  );
}

/**
 * The part of the share card that lies over the photo: the privacy-trimmed route, the stats and the Myto mark, on a
 * transparent background (no fill, so the saved picture keeps its alpha). Drawn on its own canvas from `overlayBox`
 * and scaled to `width`. The soft shadow is the same drawing once more underneath, offset and translucent.
 */
export const PhotoOverlay = forwardRef<ComponentRef<typeof View>, { model: CardModel; layout: PhotoLayout; ink: OverlayInk; width: number }>(function PhotoOverlay({ model, layout, ink, width }, ref) {
  const box = overlayBox(layout, model);
  const k = width / box.width;
  const sh = t.shadow[ink];
  return (
    <View ref={ref} collapsable={false} style={{ width, height: box.height * k }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${box.width} ${box.height}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <G transform={`translate(${sh.dx}, ${sh.dy})`}>
          <Drawing model={model} layout={layout} color={sh.color} w={box.width} h={box.height} />
        </G>
        <Drawing model={model} layout={layout} color={t.ink[ink]} w={box.width} h={box.height} />
      </Svg>
    </View>
  );
});

