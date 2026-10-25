import Svg, { Path, Rect } from 'react-native-svg';
import { tints, type Tint } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { LatLng } from '@/lib/geo';

const SEEDS = [
  'M10 90 C40 90 40 50 70 50 S110 90 140 70 S160 20 190 30',
  'M10 30 C50 10 60 60 90 50 S120 90 150 60 S180 40 190 80',
  'M10 80 L50 30 L80 70 L120 20 L150 60 L190 40',
  'M15 85 C30 40 70 95 100 55 S150 20 185 45',
  'M20 60 C20 20 70 20 70 60 S120 100 120 60 S170 20 180 50',
];

function fromPoints(points: LatLng[]): string {
  const step = Math.max(1, Math.floor(points.length / 80));
  const pts = points.filter((_, i) => i % step === 0);
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const w = Math.max((maxLng - minLng) * k, 1e-6), h = Math.max(maxLat - minLat, 1e-6);
  const s = Math.min(160 / w, 70 / h);
  const ox = (200 - w * s) / 2, oy = (110 - h * s) / 2;
  return pts.map((p, i) => `${i ? 'L' : 'M'}${(ox + (p.lng - minLng) * k * s).toFixed(1)} ${(oy + (maxLat - p.lat) * s).toFixed(1)}`).join(' ');
}

type Props = { seed?: number; points?: LatLng[]; tint?: Tint | 'night'; height: number | string; width?: number | string; radius?: number };

/** The shape of a route on a soft tint. Decorative: the name and stats beside it carry the meaning. */
export function RouteArt({ seed = 0, points, tint = 'sand', height, width = '100%', radius = 0 }: Props) {
  const { mode } = useTheme();
  const night = tint === 'night' || mode === 'dark';
  const bg = tint === 'night' ? '#232321' : night ? '#2b2a27' : tints[tint];
  const d = points && points.length > 1 ? fromPoints(points) : SEEDS[seed % SEEDS.length];
  return (
    <Svg width={width as number} height={height as number} viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" style={{ borderRadius: radius }}>
      <Rect width="200" height="110" fill={bg} />
      <Path d={d} fill="none" stroke={night ? '#8fbbdc' : '#1a1a1a'} strokeOpacity={night ? 1 : 0.55} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
