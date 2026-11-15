import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { recapTokens as T } from '@/lib/recapCard.tokens';
import { distanceKm, durationParts, fromKm, getDistanceUnit, type Quantity } from '@/lib/units';
import type { YearRecap } from '@/lib/yearRecap';
import { TITLES } from '@/lib/story/titles';
import { fixed, font, inkSolid, light, tints } from '@/theme/tokens';
import { ART } from '../../assets/pillion/art';
import { LOGO_PATHS } from './logoPaths';

/** The cards a rider can pick from to share their year. Each makes one point; `title` needs a title, `longest` needs two rides or more. */
export type RecapDesign = 'months' | 'days' | 'distance' | 'longest' | 'title';
export const RECAP_DESIGNS: readonly { id: RecapDesign; name: string }[] = [
  { id: 'months', name: 'Month by month' },
  { id: 'days', name: 'Days ridden' },
  { id: 'distance', name: 'Distance' },
  { id: 'longest', name: 'Longest ride' },
  { id: 'title', name: 'Your title' },
];
export const designsFor = (r: YearRecap) => RECAP_DESIGNS.filter((d) => (d.id === 'title' ? !!r.title : d.id === 'longest' ? !!r.longest && r.rides > 1 : true));

/** A year's riding in hours when it is an hour or more ("112 h"), else minutes. A year of rides is never shown to the minute. */
export const hoursOf = (sec: number): Quantity[] => (sec >= 3600 ? [{ value: String(Math.round(sec / 3600)), unit: 'h' }] : durationParts(sec));

/** A year-sized distance, whole above 100 ("4,812 km"), in the rider's unit. */
const big = (km: number): Quantity => (fromKm(km) >= 100 ? { value: Math.round(fromKm(km)).toLocaleString(), unit: distanceKm(km).unit } : distanceKm(km));
const unitWord = () => (getDistanceUnit() === 'mi' ? 'miles' : 'kilometres');
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_DAYS = (year: number) => MONTHS.map((_, m) => new Date(year, m + 1, 0).getDate());

const W = T.size.width, H = T.size.height, X = T.pad, INNER = W - T.pad * 2;
/** The biggest size, up to `max`, at which `text` in Michroma fits across the card. */
const fit = (text: string, max: number, width = INNER) => {
  const punct = text.replace(/[^.,\s]/g, '').length;
  return Math.min(max, Math.floor(width / ((text.length - punct) * T.displayAdvance + punct * T.displayPunct)));
};

type Look = { bg: string; ink: string };
const LOOKS: Record<RecapDesign, Look> = {
  months: { bg: inkSolid, ink: fixed.white },
  days: { bg: light.paper, ink: light.ink },
  distance: { bg: fixed.track, ink: fixed.white },
  longest: { bg: inkSolid, ink: fixed.white },
  title: { bg: tints.sand, ink: light.ink },
};
/** The one warm highlight on each card, chosen to read on that card's ground. */
const HIGHLIGHT: Record<RecapDesign, string> = { months: fixed.heatNight[2], days: fixed.track, distance: fixed.white, longest: fixed.heatNight[2], title: fixed.heat[2] };

function Txt({ y, size, family = font.semibold, fill, opacity, anchor, x = X, children }: { y: number; size: number; family?: string; fill: string; opacity?: number; anchor?: 'end' | 'middle'; x?: number; children: ReactNode }) {
  return <SvgText x={x} y={y} fontSize={size} fontFamily={family} fill={fill} fillOpacity={opacity} textAnchor={anchor}>{children}</SvgText>;
}

/** The Myto logo top left and the year top right, the same on every card. */
function Brand({ year, ink, quiet }: { year: number; ink: string; quiet: number }) {
  const { logoHeight: h, top } = T.brand;
  return (
    <G>
      <G transform={`translate(${X}, ${top}) scale(${h / 42})`}>{LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={ink} />)}</G>
      <Txt x={W - X} y={top + h * 0.72} size={T.brand.year} family={font.monoMedium} fill={ink} opacity={quiet} anchor="end">{String(year)}</Txt>
    </G>
  );
}

function Months({ r, ink, hi }: { r: YearRecap; ink: string; hi: string }) {
  const O = T.odometer, q = big(r.distanceKm), max = Math.max(...r.monthKm, 1);
  const top = r.monthKm.indexOf(Math.max(...r.monthKm));
  const barW = (INNER - O.barGap * 11) / 12;
  const figures: [string, string][] = [[r.rides.toLocaleString(), r.rides === 1 ? 'ride' : 'rides'], [r.daysRidden.toLocaleString(), r.daysRidden === 1 ? 'day' : 'days'], [hoursOf(r.durationSec).map((p) => `${p.value} ${p.unit}`).join(' '), 'riding']];
  return (
    <G>
      <Txt y={O.number} size={fit(q.value, T.font.hero)} family={font.display} fill={ink}>{q.value}</Txt>
      <Txt y={O.unit} size={T.font.body} family={font.medium} fill={ink} opacity={T.faint}>{`${unitWord()} ridden`}</Txt>
      {r.monthKm.map((km, m) => {
        const h = Math.max(T.single.barHeight / 3, (km / max) * O.barsHeight);
        return <Rect key={m} x={X + m * (barW + O.barGap)} y={O.barsTop + O.barsHeight - h} width={barW} height={h} rx={4} fill={m === top && km > 0 ? hi : ink} fillOpacity={m === top && km > 0 ? 1 : km > 0 ? T.faint / 2 : T.ghost} />;
      })}
      {MONTHS.map((name, m) => <Txt key={name} x={X + m * (barW + O.barGap) + barW / 2} y={O.axis} size={T.font.axis} family={font.mono} fill={ink} opacity={T.faint} anchor="middle">{name[0]}</Txt>)}
      {r.busiestMonth ? <Txt y={O.note} size={T.font.body} family={font.medium} fill={hi}>{`${r.busiestMonth.name} was your month`}</Txt> : null}
      <Line x1={X} x2={W - X} y1={O.rule} y2={O.rule} stroke={ink} strokeOpacity={T.ghost} strokeWidth={2} />
      {figures.map(([value, label], i) => (
        <G key={label}>
          <Txt x={X + (i * INNER) / 3} y={O.figure} size={T.font.figure} fill={ink}>{value}</Txt>
          <Txt x={X + (i * INNER) / 3} y={O.figureLabel} size={T.font.small} family={font.medium} fill={ink} opacity={T.faint}>{label}</Txt>
        </G>
      ))}
    </G>
  );
}

function Days({ r, ink, hi }: { r: YearRecap; ink: string; hi: string }) {
  const D = T.days, lengths = MONTH_DAYS(r.year), pitch = (INNER - D.labelWidth) / 31;
  const title = r.title ? TITLES.find((t) => t.id === r.title)?.name : undefined;
  return (
    <G>
      <Txt y={D.line1} size={T.font.headline} fill={ink}>{plural(r.daysRidden, 'day', 'days')}</Txt>
      <Txt y={D.line2} size={T.font.headline} fill={ink}>on the road</Txt>
      {MONTHS.map((name, m) => {
        const y = D.gridTop + m * D.rowPitch, ridden = new Set(r.daysByMonth[m]);
        return (
          <G key={name}>
            <Txt y={y + D.dot} size={T.font.axis} family={font.mono} fill={ink} opacity={T.faint}>{name[0]}</Txt>
            {Array.from({ length: lengths[m]! }, (_, d) => <Circle key={d} cx={X + D.labelWidth + d * pitch + pitch / 2} cy={y} r={D.dot} fill={ridden.has(d + 1) ? hi : ink} fillOpacity={ridden.has(d + 1) ? 1 : T.ghost} />)}
          </G>
        );
      })}
      <Txt y={D.total} size={T.font.body} fill={ink}>{`${big(r.distanceKm).value} ${big(r.distanceKm).unit} across ${plural(r.rides, 'ride', 'rides')}`}</Txt>
      {r.busiestMonth ? <Txt y={D.sub} size={T.font.small} family={font.medium} fill={ink} opacity={T.faint}>{`Most riding in ${r.busiestMonth.name}`}</Txt> : null}
      {title ? <Txt y={D.title} size={T.font.small} fill={fixed.heat[2]}>{title}</Txt> : null}
    </G>
  );
}

function Single({ lead, km, note, share, ink, hi, quiet }: { lead: string; km: number; note: string; share?: number; ink: string; hi: string; quiet: number }) {
  const S = T.single, q = big(km);
  return (
    <G>
      <Txt y={S.lead} size={T.font.lead} fill={ink}>{lead}</Txt>
      <Txt y={S.number} size={fit(q.value, T.font.hero)} family={font.display} fill={ink}>{q.value}</Txt>
      <Txt y={S.unit} size={T.font.lead} fill={ink} opacity={quiet}>{q.unit === 'mi' ? 'miles' : unitWord()}</Txt>
      {share !== undefined ? (
        <G>
          <Rect x={X} y={S.barTop} width={INNER} height={S.barHeight} rx={S.barHeight / 2} fill={ink} fillOpacity={T.ghost} />
          <Rect x={X} y={S.barTop} width={Math.max(S.barHeight, INNER * share)} height={S.barHeight} rx={S.barHeight / 2} fill={hi} />
        </G>
      ) : null}
      <Txt y={share !== undefined ? S.note : S.barTop} size={T.font.body} family={font.medium} fill={ink} opacity={share !== undefined ? 1 : quiet}>{note}</Txt>
    </G>
  );
}

function Title({ r, ink, hi }: { r: YearRecap; ink: string; hi: string }) {
  const name = TITLES.find((t) => t.id === r.title)?.name ?? '';
  const P = T.title;
  return (
    <G>
      <Txt y={P.lead} size={T.font.body} family={font.medium} fill={ink} opacity={T.faint}>{`${r.year} made you a`}</Txt>
      <Txt y={P.name} size={fit(name, T.font.title)} family={font.display} fill={hi}>{name}</Txt>
      <Txt y={P.sub} size={T.font.body} family={font.medium} fill={ink} opacity={T.faint}>{`${plural(r.rides, 'ride', 'rides')} across ${plural(r.monthsRidden, 'month', 'months')}`}</Txt>
    </G>
  );
}

/**
 * One shareable picture of a rider's year, in the design they picked. No card has a map or a ride name, so none shows where the rider
 * lives or goes. Drawn on its own fixed canvas and scaled to `width`, so the preview and the picture that is saved are the same drawing.
 */
export const RecapCard = forwardRef<ComponentRef<typeof View>, { recap: YearRecap; design: RecapDesign; width: number }>(function RecapCard({ recap: r, design, width }, ref) {
  const { bg, ink } = LOOKS[design], hi = HIGHLIGHT[design], scale = width / W;
  // Faded white is too faint on the orange card, so its quieter text stays full white.
  const quiet = design === 'distance' ? 1 : T.faint;
  const P = T.title;
  return (
    <View ref={ref} collapsable={false} style={{ width, height: (width * H) / W, backgroundColor: bg, overflow: 'hidden' }}>
      {design === 'title' ? <Image source={ART.campfire} resizeMode="cover" style={{ position: 'absolute', left: X * scale, top: P.artTop * scale, width: INNER * scale, height: INNER * scale, borderRadius: P.artRadius * scale }} /> : null}
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Brand year={r.year} ink={ink} quiet={quiet} />
        {design === 'months' ? <Months r={r} ink={ink} hi={hi} /> : null}
        {design === 'days' ? <Days r={r} ink={ink} hi={hi} /> : null}
        {design === 'distance' ? <Single lead={`In ${r.year} you rode`} km={r.distanceKm} note={`${plural(r.rides, 'ride', 'rides')}, ${hoursOf(r.durationSec).map((p) => `${p.value} ${p.unit}`).join(' ')} in the saddle`} ink={ink} hi={hi} quiet={quiet} /> : null}
        {design === 'longest' && r.longest ? <Single lead="Your longest ride" km={r.longest.distanceKm} share={r.distanceKm > 0 ? r.longest.distanceKm / r.distanceKm : 0} note={`${Math.round((r.longest.distanceKm / Math.max(r.distanceKm, 1)) * 100)}% of your year in one go`} ink={ink} hi={hi} quiet={quiet} /> : null}
        {design === 'title' ? <Title r={r} ink={ink} hi={hi} /> : null}
      </Svg>
    </View>
  );
});
