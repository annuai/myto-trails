import React, { useEffect, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { blob, c, font, prog, useFormat } from './core';

const face = (family: string, file: string, weight: string) => loadFont({ family, url: staticFile(`fonts/${file}`), weight });
const fontsReady = Promise.all([
  face('Michroma', 'Michroma-400.ttf', '400'),
  face('Geist', 'Geist-400.ttf', '400'),
  face('Geist', 'Geist-500.ttf', '500'),
  face('Geist', 'Geist-600.ttf', '600'),
  face('Geist Mono', 'GeistMono-400.ttf', '400'),
  face('Geist Mono', 'GeistMono-500.ttf', '500'),
  // The names the app's own components ask for (apps/mobile/src/theme/tokens.ts).
  face('Geist_400Regular', 'Geist-400.ttf', '400'),
  face('Geist_500Medium', 'Geist-500.ttf', '500'),
  face('Geist_600SemiBold', 'Geist-600.ttf', '600'),
  face('Michroma_400Regular', 'Michroma-400.ttf', '400'),
  face('GeistMono_400Regular', 'GeistMono-400.ttf', '400'),
  face('GeistMono_500Medium', 'GeistMono-500.ttf', '500'),
]);

/** Holds rendering until the fonts are in. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle]);
};

const HILLS = [
  { x: 0.2, y: 0.22, r: 0.09 },
  { x: 0.82, y: 0.62, r: 0.12 },
  { x: 0.3, y: 0.86, r: 0.08 },
  { x: 0.88, y: 0.12, r: 0.06 },
];

/** Contour lines across the whole frame that draw themselves in at the start and then rest behind everything. */
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h } = useFormat();
  const m = Math.min(w, h);
  return (
    <AbsoluteFill>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        {HILLS.map((hill, hi) =>
          Array.from({ length: 10 }, (_, i) => {
            const p = prog(f, 2 + i * 3 + hi * 4, 36);
            return (
              <path
                key={`${hi}-${i}`}
                d={blob(hill.x * w + i * 2, hill.y * h - i * 1.5, hill.r * m * (0.3 + i * 0.26), hi * 1.7 + i * 0.12)}
                pathLength={1}
                fill="none"
                stroke={c.ink}
                strokeOpacity={0.1}
                strokeWidth={1.5}
                strokeDasharray={1}
                strokeDashoffset={1 - p}
              />
            );
          }),
        )}
      </svg>
    </AbsoluteFill>
  );
};

/** The words of a scene: a small mono eyebrow, the headline revealed line by line, and an optional line under it. */
export const Caption: React.FC<{ eyebrow: string; lines: string[]; sub?: React.ReactNode; start?: number }> = ({ eyebrow, lines, sub, start = 4 }) => {
  const f = useCurrentFrame();
  const F = useFormat();
  const pe = prog(f, start, 16);
  return (
    <div
      style={{
        position: 'absolute',
        left: F.side,
        width: F.captionW,
        top: F.wide ? 0 : F.safeTop,
        height: F.wide ? F.h : F.captionH,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: F.wide ? 'center' : 'flex-start',
        gap: 20,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: 26, color: c.muted, opacity: pe, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 36 * pe, height: 2, background: c.accent }} />
        {eyebrow}
      </div>
      <div>
        {lines.map((l, i) => {
          const p = prog(f, start + 6 + i * 7, 20);
          return (
            <div key={i} style={{ overflow: 'hidden', paddingBottom: 6 }}>
              <div style={{ fontFamily: font.display, fontSize: F.headSize, lineHeight: 1.18, color: c.ink, transform: `translateY(${(1 - p) * 105}%)` }}>{l}</div>
            </div>
          );
        })}
      </div>
      {sub ? <div style={{ fontFamily: font.text, fontSize: F.subSize, color: c.muted, opacity: prog(f, start + 24, 18), lineHeight: 1.35 }}>{sub}</div> : null}
    </div>
  );
};

/** A phone. Children are laid out on a 390 by 844 screen and scaled to fit the format. */
export const Phone: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 6 }) => {
  const f = useCurrentFrame();
  const F = useFormat();
  const p = prog(f, delay, 26);
  return (
    <div style={{ position: 'absolute', left: F.phoneX, top: F.phoneTop + (1 - p) * 70, width: F.phoneW, height: F.phoneH, opacity: p }}>
      <div
        style={{
          width: 390,
          height: 844,
          transform: `scale(${F.scale})`,
          transformOrigin: 'top left',
          borderRadius: 46,
          overflow: 'hidden',
          background: c.paper,
          boxShadow: `0 0 0 8px ${c.ink}, 0 40px 80px rgba(26,26,26,0.20)`,
          position: 'relative',
          fontFamily: font.text,
          color: c.ink,
        }}
      >
        <div style={{ position: 'absolute', top: 14, left: 135, width: 120, height: 30, borderRadius: 15, background: c.ink, zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
};
