import Svg, { Circle, Path, Polygon, Text as SvgText } from 'react-native-svg';
import type { MarkDef } from '@/lib/marks';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { stamp as k } from './Stamp.tokens';

const kmLabel = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));

/**
 * A mark as a flat stamp: two rings and one glyph in ink on a soft wash. Locked marks are a dashed outline and nothing else.
 * Flat on purpose: no tiers, no colours, no shine. It reads the same earned in a year as on the day.
 */
export function Stamp({ def, earned, size = k.size }: { def: Pick<MarkDef, 'title' | 'glyph'>; earned: boolean; size?: number }) {
  const { c } = useTheme();
  const C = k.view / 2;
  const g = def.glyph;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${k.view} ${k.view}`} accessibilityLabel={`${def.title}, ${earned ? 'earned' : 'not yet earned'}`}>
      {earned ? (
        <>
          <Circle cx={C} cy={C} r={k.ring} fill={c.accentSubtle} stroke={c.ink} strokeWidth={k.line} />
          <Circle cx={C} cy={C} r={k.inner} fill="none" stroke={c.ink} strokeWidth={k.hairline} />
          {g === 'route' ? (
            <>
              <Path d="M17 37 C 21 25, 29 39, 34 27 S 38 21, 40 20" fill="none" stroke={c.ink} strokeWidth={k.line} strokeLinecap="round" />
              <Circle cx={17} cy={37} r={3} fill={c.ink} />
            </>
          ) : g === 'moon' ? <Path d="M33 18 A 11 11 0 1 0 38 36 A 9.5 9.5 0 0 1 33 18 Z" fill={c.ink} />
            : g === 'riders' ? (
              <>
                <Circle cx={28} cy={21} r={3.6} fill={c.ink} />
                <Circle cx={20.5} cy={34} r={3.6} fill={c.ink} />
                <Circle cx={35.5} cy={34} r={3.6} fill={c.ink} />
              </>
            ) : g === 'dial' ? (
              <>
                <Circle cx={C} cy={C} r={11} fill="none" stroke={c.ink} strokeWidth={k.line} />
                <Path d="M28 28 L28 20 M28 28 L34 31" fill="none" stroke={c.ink} strokeWidth={k.line} strokeLinecap="round" />
              </>
            ) : g === 'nut' ? (
              <>
                <Polygon points="28,16 38.4,22 38.4,34 28,40 17.6,34 17.6,22" fill="none" stroke={c.ink} strokeWidth={k.line} strokeLinejoin="round" />
                <Circle cx={C} cy={C} r={4} fill="none" stroke={c.ink} strokeWidth={k.line} />
              </>
            ) : (
              <>
                <SvgText x={C} y={k.labelY} textAnchor="middle" fontSize={k.label} fontFamily={font.monoMedium} fill={c.ink}>{kmLabel(g.km)}</SvgText>
                <SvgText x={C} y={k.unitY} textAnchor="middle" fontSize={k.unit} fontFamily={font.mono} fill={c.muted}>km</SvgText>
              </>
            )}
        </>
      ) : (
        <Circle cx={C} cy={C} r={k.ring} fill="none" stroke={c.edge} strokeWidth={k.hairline} strokeDasharray={[...k.dash]} />
      )}
    </Svg>
  );
}
