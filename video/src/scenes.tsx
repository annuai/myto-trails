import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { c, font, prog, useFormat } from './core';
import { Caption, Phone } from './ui';
import { GroupReal, PlanScreen, SosReal, TrailReal, YouReal } from './screens';

const OVERLAP = 12;

/** A scene that cross-fades with its neighbours. `[from, to)` is its own time; it runs OVERLAP frames longer so the next one can fade in underneath. */
export const Scene: React.FC<{ from: number; to: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ from, to, first, last, children }) => {
  const dur = to - from + (last ? 0 : OVERLAP);
  return (
    <Sequence from={from} durationInFrames={dur} layout="none">
      <Fade dur={dur} first={first} last={last}>{children}</Fade>
    </Sequence>
  );
};

const Fade: React.FC<{ dur: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ dur, first, last, children }) => {
  const f = useCurrentFrame();
  const inn = first ? 1 : prog(f, 0, OVERLAP);
  const out = last ? 1 : 1 - prog(f, dur - OVERLAP, OVERLAP);
  return <AbsoluteFill style={{ opacity: Math.min(inn, out) }}>{children}</AbsoluteFill>;
};

const Lines: React.FC<{ items: [string, number][] }> = ({ items }) => {
  const f = useCurrentFrame();
  return (
    <>
      {items.map(([t, at], i) => (
        <span key={t} style={{ opacity: prog(f, at, 14), color: i === items.length - 1 ? c.ink : c.muted }}>
          {t}{i < items.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
};

/** 1. The hook: a line draws itself across contour lines with a blue dot at its head, and the headline lands. */
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const F = useFormat();
  const { w, h } = F;
  const d = `M ${-0.05 * w} ${0.9 * h} C ${0.2 * w} ${0.8 * h}, ${0.25 * w} ${0.66 * h}, ${0.5 * w} ${0.7 * h} S ${0.8 * w} ${0.74 * h}, ${0.85 * w} ${0.62 * h} S ${0.95 * w} ${0.6 * h}, ${1.1 * w} ${0.66 * h}`;
  const p = prog(f, 0, 120);
  const len = getLength(d);
  const pt = getPointAtLength(d, p * len)!;
  const ev = evolvePath(p, d);
  const size = F.wide ? 116 : 76;
  const pulse = (f % 40) / 40;
  return (
    <AbsoluteFill>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <path d={d} fill="none" stroke={c.accent} strokeWidth={7} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        <circle cx={pt.x} cy={pt.y} r={16 + pulse * 26} fill={c.accent} fillOpacity={0.25 * (1 - pulse)} />
        <circle cx={pt.x} cy={pt.y} r={15} fill={c.accent} stroke={c.paper} strokeWidth={5} />
      </svg>
      <div style={{ position: 'absolute', left: F.side, width: w - F.side * 2, top: F.wide ? h * 0.2 : F.safeTop + 80 }}>
        {['This weekend,', 'ride.'].map((l, i) => {
          const q = prog(f, 4 + i * 9, 22);
          return (
            <div key={l} style={{ overflow: 'hidden', paddingBottom: 10 }}>
              <div style={{ fontFamily: font.display, fontSize: size, lineHeight: 1.16, color: c.ink, transform: `translateY(${(1 - q) * 105}%)` }}>{l}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Trail: React.FC = () => (
  <>
    <Caption eyebrow="Trails" lines={['Know before', 'you go.']} sub={<Lines items={[['Publicly accessible.', 150], ['Open.', 185], ['Community reported.', 215]]} />} />
    <Phone><TrailReal /></Phone>
  </>
);

export const Plan: React.FC = () => (
  <>
    <Caption eyebrow="Plan" lines={['Plan it in', 'a minute.']} sub="Pick a place. Get a route along real roads." />
    <Phone><PlanScreen /></Phone>
  </>
);

export const Group: React.FC = () => (
  <>
    <Caption eyebrow="Groups" lines={['Ride together.', 'Stay together.']} sub="See everyone on the map." />
    <Phone><GroupReal /></Phone>
  </>
);

export const Sos: React.FC = () => (
  <>
    <Caption eyebrow="Safety" lines={['Help is one', 'hold away.']} sub="Call for help. Share your position." />
    <Phone><SosReal /></Phone>
  </>
);

/** 6. The journal and year recap, then the closing still: the rider on the ridge, and the logo. */
export const End: React.FC = () => {
  const f = useCurrentFrame();
  const F = useFormat();
  const out = 1 - prog(f, 128, 16);
  // The closing picture runs along the bottom edge at its own 3:1 shape; the tagline and logo sit in the space above it.
  const imgH = F.w / 3;
  const centerY = (F.h - imgH * 0.6) / 2;
  const pic = prog(f, 146, 36);
  const fadeTop = 'linear-gradient(to bottom, transparent, #000 22%)';
  const tag = prog(f, 170, 22);
  const logo = prog(f, 200, 24);
  return (
    <>
      <AbsoluteFill style={{ opacity: out }}>
        <Caption eyebrow="Journal" lines={['Every ride,', 'remembered.']} sub="Your rides and your year, kept." />
        <Phone><YouReal /></Phone>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: F.w, height: imgH, opacity: pic, transform: `translateY(${(1 - pic) * 36}px) scale(${1 + 0.04 * (f / 150)})`, transformOrigin: 'bottom center' }}>
          <Img src={staticFile('img/ending.webp')} style={{ width: '100%', height: '100%', display: 'block', WebkitMaskImage: fadeTop, maskImage: fadeTop }} />
        </div>
        <div style={{ position: 'absolute', top: centerY - (F.wide ? 160 : 140), overflow: 'hidden', paddingBottom: 8 }}>
          <div style={{ fontFamily: font.display, fontSize: F.wide ? 52 : 46, color: c.ink, transform: `translateY(${(1 - tag) * 105}%)` }}>See you on the trail.</div>
        </div>
        <div
          style={{
            position: 'absolute',
            top: centerY - 60,
            width: 260,
            height: 120,
            background: c.brand,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 16}px)`,
            WebkitMaskImage: `url(${staticFile('img/logo.svg')})`,
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            WebkitMaskSize: 'contain',
          }}
        />
        <div style={{ position: 'absolute', top: centerY + 80, fontFamily: font.text, fontWeight: 500, fontSize: 28, letterSpacing: 6, color: c.muted, opacity: prog(f, 216, 20) }}>
          MYTO MOTO
        </div>
      </AbsoluteFill>
    </>
  );
};
