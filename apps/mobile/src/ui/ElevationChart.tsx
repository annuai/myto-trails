import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { asText, distanceKm, elevationM, spoken } from '@/lib/units';
import { Text } from './Text';
import { space } from '@/theme/tokens';

/** Height against distance along a route: a filled line, with the lowest and highest point and the length written under it. */
export function ElevationChart({ samples, height = 96 }: { samples: { d: number; e: number }[]; height?: number }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  if (samples.length < 2) return null;
  const minE = Math.min(...samples.map((s) => s.e)), maxE = Math.max(...samples.map((s) => s.e));
  const lastD = samples[samples.length - 1]!.d || 1;
  const span = maxE - minE || 1;
  const x = (d: number) => (d / lastD) * w;
  const y = (e: number) => height - ((e - minE) / span) * (height - 8) - 4;
  const line = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.d).toFixed(1)},${y(s.e).toFixed(1)}`).join(' ');
  return (
    <View style={{ gap: space[2] }} accessibilityRole="image" accessibilityLabel={`Elevation from ${spoken(elevationM(minE))} to ${spoken(elevationM(maxE))} over ${spoken(distanceKm(lastD))}`}>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            <Path d={`${line} L${w},${height} L0,${height} Z`} fill={c.accent} fillOpacity={0.18} />
            <Path d={line} fill="none" stroke={c.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">Low {asText(elevationM(minE))}</Text>
        <Text variant="caption" tone="muted">{asText(distanceKm(lastD))}</Text>
        <Text variant="caption" tone="muted">High {asText(elevationM(maxE))}</Text>
      </View>
    </View>
  );
}
