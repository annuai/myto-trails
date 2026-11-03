import React from 'react';
import { View } from 'react-native';
import { Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { getLength, getPointAtLength } from '@remotion/paths';
// The app's own components and tokens, so these screens are the app's design, not a copy of it.
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';
import { light, radius, space } from '@/theme/tokens';
import { FPS, blob, lin, prog } from './core';

const c = light;

export const ROUTE_FULL = 'M 60 700 C 130 650, 90 560, 170 520 S 300 470, 262 380 S 150 310, 205 240 S 290 210, 320 140';
export const ROUTE_SHORT = 'M 70 560 C 120 530, 100 470, 170 445 S 290 410, 262 340 S 150 290, 205 235 S 285 205, 300 165';
const FULL_LEN = getLength(ROUTE_FULL);
const pointOnFull = (t: number) => getPointAtLength(ROUTE_FULL, t * FULL_LEN)!;

const ROADS = [
  'M -20 300 C 100 280, 180 340, 420 300',
  'M 330 -20 C 300 200, 360 400, 330 860',
  'M -20 760 C 140 740, 260 780, 420 720',
  'M 120 -20 C 160 160, 90 300, 130 520 S 200 700, 190 860',
];

/** The map drawn in the app's own register: paper ground, a lake, contour rings and quiet roads. */
export const MapBase: React.FC<{ viewBox?: string; width?: number; height?: number; children?: React.ReactNode }> = ({
  viewBox = '0 0 390 844',
  width = 390,
  height = 844,
  children,
}) => (
  <svg width={width} height={height} viewBox={viewBox} style={{ display: 'block' }}>
    <rect x={-400} y={-400} width={1200} height={1800} fill={c.field} />
    {[{ x: 300, y: 560, r: 34 }, { x: 70, y: 170, r: 28 }].map((h, hi) =>
      Array.from({ length: 6 }, (_, i) => (
        <path key={`${hi}-${i}`} d={blob(h.x + i, h.y - i, h.r * (0.4 + i * 0.4), hi * 2 + i * 0.15)} fill="none" stroke={c.ink} strokeOpacity={0.1} strokeWidth={1.2} />
      )),
    )}
    <path d={blob(110, 420, 40, 2.1)} fill={c.accentSubtle} stroke={c.accent} strokeOpacity={0.25} strokeWidth={1.2} />
    {ROADS.map((d, i) => (
      <path key={i} d={d} fill="none" stroke={c.ink} strokeOpacity={0.12} strokeWidth={3} strokeLinecap="round" />
    ))}
    {children}
  </svg>
);

/** A route: a faint full line, with the blue part drawn up to `p`. */
const Route: React.FC<{ d: string; p: number; width?: number }> = ({ d, p, width = 6 }) => (
  <>
    <path d={d} fill="none" stroke={c.ink} strokeOpacity={0.14} strokeWidth={width} strokeLinecap="round" />
    <path d={d} pathLength={1} fill="none" stroke={c.accent} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
  </>
);

const Pulse: React.FC<{ x: number; y: number; color: string; f: number; r?: number }> = ({ x, y, color, f, r = 9 }) => {
  const t = (f % 45) / 45;
  return (
    <>
      <circle cx={x} cy={y} r={r + t * 20} fill={color} fillOpacity={0.28 * (1 - t)} />
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={3} />
    </>
  );
};

/** A rider's name tag on the map, in the app's chip shape. */
const NameTag: React.FC<{ x: number; y: number; name: string; side: 'left' | 'right' }> = ({ x, y, name, side }) => (
  <div style={{ position: 'absolute', top: y - 12, [side === 'right' ? 'left' : 'right']: side === 'right' ? x + 16 : 390 - x + 16 }}>
    <div style={{ background: '#fff', borderRadius: radius.chip, padding: '3px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
      <Text variant="caption" style={{ fontFamily: 'Geist_600SemiBold' }}>{name}</Text>
    </div>
  </div>
);

/** Scene 3: search a place, watch the route draw along roads, see the distance. Built from the app's Field, ListCard, Card and Button. */
export const PlanScreen: React.FC = () => {
  const f = useCurrentFrame();
  const word = 'Hesarghatta';
  const typed = word.slice(0, Math.floor(lin(f, 24, 54) * word.length));
  const route = prog(f, 112, 90);
  const sheet = prog(f, 200, 28);
  const count = prog(f, 214, 40);
  const resultIn = prog(f, 84, 10) * (1 - prog(f, 122, 10));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapBase>
        <Route d={ROUTE_SHORT} p={route} />
        <circle cx={70} cy={560} r={9} fill="#fff" stroke={c.ink} strokeWidth={3} opacity={prog(f, 112, 8)} />
        <circle cx={300} cy={165} r={11} fill={c.accent} stroke="#fff" strokeWidth={3} opacity={prog(f, 190, 14)} />
      </MapBase>
      <View style={{ position: 'absolute', left: space[5], right: space[5], top: 60 }}>
        <Field label="Search" value={typed} placeholder="Trail, town or place" editable={false} />
      </View>
      <View style={{ position: 'absolute', left: space[5], right: space[5], top: 168, opacity: resultIn, transform: [{ translateY: (1 - resultIn) * -8 }] }}>
        <ListCard>
          <Row label="Hesarghatta Wetlands" sub="Bengaluru, Karnataka" chevron={false} />
        </ListCard>
      </View>
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
          paddingTop: space[6], paddingHorizontal: space[5], paddingBottom: space[8], gap: space[4],
          boxShadow: '0 -8px 28px rgba(0,0,0,0.12)', transform: [{ translateY: (1 - sheet) * 340 }],
        }}
      >
        <View>
          <Text variant="section">Hesarghatta Wetlands</Text>
          <Text variant="label" tone="muted">Along real roads</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: space[8] }}>
          <View>
            <Text variant="caption" tone="muted">Distance</Text>
            <Text variant="dataLarge">{Math.round(count * 38)} km</Text>
          </View>
          <View style={{ opacity: prog(f, 226, 14) }}>
            <Text variant="caption" tone="muted">Time</Text>
            <Text variant="dataLarge">1 h 05</Text>
          </View>
        </View>
        <Button variant="accent" label="Start ride" />
      </View>
    </div>
  );
};

const RIDERS = [
  { name: 'Asha', from: 0.5, to: 0.67, at: 30 },
  { name: 'Ravi', from: 0.4, to: 0.63, at: 56 },
  { name: 'Meera', from: 0.34, to: 0.59, at: 82 },
  { name: 'Neha', from: 0.28, to: 0.55, at: 108 },
  { name: 'Kabir', from: 0.1, to: 0.51, at: 134 },
];
const DEST = 0.74;

/** Scene 4, second half: a group fills the map one rider at a time and the last rider closes the gap. Uses the app's Banner, Card and StatusChip. */
export const GroupScreen: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const f = useCurrentFrame() * speed;
  const move = prog(f, 150, 190);
  const dest = pointOnFull(DEST);
  const together = f > 300;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapBase>
        <Route d={ROUTE_FULL} p={prog(f, 4, 30)} />
        <g opacity={prog(f, 20, 16)}>
          <circle cx={dest.x} cy={dest.y} r={15} fill="none" stroke={c.accent} strokeWidth={3} />
          <circle cx={dest.x} cy={dest.y} r={5} fill={c.accent} />
        </g>
        {RIDERS.map((r, i) => {
          const pt = pointOnFull(r.from + (r.to - r.from) * move);
          const pop = prog(f, r.at, 14);
          return (
            <g key={r.name} opacity={pop} transform={`translate(${pt.x} ${pt.y}) scale(${0.5 + 0.5 * pop}) translate(${-pt.x} ${-pt.y})`}>
              {i === 0 ? <circle cx={pt.x} cy={pt.y} r={17} fill="none" stroke={c.riders[i]} strokeWidth={2.5} /> : null}
              <Pulse x={pt.x} y={pt.y} color={c.riders[i]} f={f + i * 9} />
            </g>
          );
        })}
      </MapBase>
      {RIDERS.map((r, i) => {
        const pt = pointOnFull(r.from + (r.to - r.from) * move);
        return (
          <div key={r.name} style={{ opacity: prog(f, r.at, 14) }}>
            <NameTag x={pt.x} y={pt.y + (i - 2) * 6} name={r.name} side={i % 2 === 0 ? 'right' : 'left'} />
          </div>
        );
      })}
      <View style={{ position: 'absolute', left: space[5], right: space[5], top: 60, opacity: prog(f, 20, 16), transform: [{ translateY: (1 - prog(f, 20, 16)) * -14 }] }}>
        <Banner eyebrow="Group destination" title="Chai stop · 2.4 km" />
      </View>
      <View style={{ position: 'absolute', left: space[5], right: space[5], bottom: space[8], opacity: prog(f, 150, 16) }}>
        <Card>
          <View style={{ gap: space[2] }}>
            <Text variant="label" tone="muted">5 riders</Text>
            {together ? <StatusChip status="good" label="Everyone is here" /> : <StatusChip status="caution" label="Kabir is catching up" />}
          </View>
        </Card>
      </View>
    </div>
  );
};

/** Real screen recordings (video/public/capture, status bar already cropped). The screen's own top strip is the app's background colour. */
const RealScreen: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <div style={{ position: 'absolute', inset: 0, background: bg }}>
    <div style={{ position: 'absolute', left: 0, top: 56, width: 390, height: 788, overflow: 'hidden' }}>{children}</div>
    <div style={{ position: 'absolute', left: 0, top: 56, width: 390, height: 14, background: `linear-gradient(${bg}, transparent)` }} />
  </div>
);

/** One stretch of a recording: `from` seconds into the clip, shown for `frames` frames starting at scene frame `at`, then held on its last frame. */
const Seg: React.FC<{ src: string; from: number; frames: number; at?: number; rate?: number }> = ({ src, from, frames, at = 0, rate = 1 }) => {
  const video = (startSec: number) => (
    <OffthreadVideo src={staticFile(`capture/${src}.mp4`)} muted playbackRate={rate} startFrom={Math.round(startSec * FPS)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  );
  return (
    <>
      {at > 0 ? <Sequence from={0} durationInFrames={at}><Freeze frame={0}>{video(from)}</Freeze></Sequence> : null}
      <Sequence from={at} durationInFrames={frames}>{video(from)}</Sequence>
      <Sequence from={at + frames}><Freeze frame={0}>{video(from + ((frames - 1) * rate) / FPS)}</Freeze></Sequence>
    </>
  );
};

const PAPER_SCREEN = c.paper;
const DARK_SCREEN = '#101010';

/** Scene 2: the trail list, then the Manchanabele Dam page with its access, condition and safety notes. */
export const TrailReal: React.FC = () => (
  <RealScreen bg={PAPER_SCREEN}>
    <Seg src="trails" from={2.3} at={20} frames={81} />
    <Seg src="trails" from={7.8} at={101} frames={260} rate={1.1} />
  </RealScreen>
);

/** Scene 4: the real group-ride sheet, then my animated map as the riders join. */
export const GroupReal: React.FC = () => {
  const f = useCurrentFrame();
  const x = prog(f, 148, 18);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - x }}>
        <RealScreen bg={PAPER_SCREEN}>
          <Seg src="group" from={12.5} at={20} frames={135} />
        </RealScreen>
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: x }}>
        <Sequence from={148}><GroupScreen speed={1.45} /></Sequence>
      </div>
    </div>
  );
};

/** Scene 5: the live ride screen, SOS held, and the real help sheet. */
export const SosReal: React.FC = () => (
  <RealScreen bg={DARK_SCREEN}>
    <Seg src="sos" from={2.6} at={20} frames={162} />
  </RealScreen>
);

/** Scene 6: Your bike and your year, from the You tab. */
export const YouReal: React.FC = () => (
  <RealScreen bg={PAPER_SCREEN}>
    <Seg src="you" from={0.4} at={10} frames={125} />
  </RealScreen>
);
