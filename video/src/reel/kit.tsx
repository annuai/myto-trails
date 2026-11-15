import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { dark, inkSolid, light } from '@/theme/tokens';
import { blob, c, ease, font, prog, useFormat } from '../core';
import { BEAT } from './beats';

/**
 * The Reel's look: the app's two grounds (paper, and the ink fill of its ride bar and banners), the app's typefaces,
 * one idea per shot in very large Michroma. Stage sizes are named here so the shots carry no loose numbers.
 */
export type Ground = 'ink' | 'paper';
export const ground = {
  ink: { bg: inkSolid, text: dark.ink, muted: dark.muted, accent: dark.accent, line: dark.ink, ring: dark.field, shadow: 'rgba(0,0,0,0.55)' },
  paper: { bg: light.paper, text: light.ink, muted: light.muted, accent: light.accent, line: light.ink, ring: light.ink, shadow: 'rgba(26,26,26,0.22)' },
} as const;

/** Headline fill: the ground's text colour drifting into Myto's signature red (marketing only; the app itself stays flat). */
const headFill = (g: Ground) => `linear-gradient(100deg, ${ground[g].text} 20%, ${c.brand} 110%)`;

export const stage = {
  /** Headline size in the 1080 px portrait frame: about 12 Michroma characters fill the safe width. */
  head: 100,
  headLead: 1.14,
  eyebrow: 28,
  /** The plain-language line under a headline. */
  sub: 36,
  subLead: 1.38,
  /** Where the headline block starts and how tall it may be (Instagram keeps the top 250 px for its own bar). */
  textTop: 250,
  /** The phone's screen in app points. */
  screenW: 390,
  screenH: 844,
  bezel: 10,
  corner: 54,
};

/** A full-frame ground with optional contour rings drawing themselves in, like the app's map art. */
export const Bg: React.FC<{ g: Ground; contours?: boolean; children?: React.ReactNode }> = ({ g, contours, children }) => {
  const f = useCurrentFrame();
  const { w, h } = useFormat();
  const t = ground[g];
  return (
    <AbsoluteFill style={{ backgroundColor: t.bg }}>
      {contours ? (
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          {[{ x: 0.78, y: 0.3, r: 0.36 }, { x: 0.12, y: 0.8, r: 0.3 }].map((hill, hi) =>
            Array.from({ length: 12 }, (_, i) => (
              <path
                key={`${hi}-${i}`}
                d={blob(hill.x * w + i * 3, hill.y * h - i * 2, hill.r * w * (0.18 + i * 0.12), hi * 1.9 + i * 0.1)}
                pathLength={1}
                fill="none"
                stroke={t.line}
                strokeOpacity={g === 'ink' ? 0.09 : 0.1}
                strokeWidth={2}
                strokeDasharray={1}
                strokeDashoffset={1 - prog(f, i * 2 + hi * 5, 40)}
              />
            )),
          )}
        </svg>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/** The small mono label over a headline, with a short dash in the signature red. */
export const Eyebrow: React.FC<{ g: Ground; text: string; at?: number; out?: number }> = ({ g, text, at = 0, out }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 14) * (out === undefined ? 1 : 1 - prog(f, out, 12));
  return (
    <div style={{ fontFamily: font.mono, fontSize: stage.eyebrow, color: ground[g].muted, opacity: p, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
      <span style={{ width: 40 * p, height: 3, background: c.brand }} />
      {text}
    </div>
  );
};

/**
 * Lines that rise out of a mask one after another, half a beat apart, filled with the headline gradient.
 * `out` (a frame) slides them up and away again.
 */
export const Words: React.FC<{ g: Ground; lines: string[]; at?: number; size?: number; out?: number; align?: 'left' | 'center' }> = ({
  g, lines, at = 0, size = stage.head, out, align = 'left',
}) => {
  const f = useCurrentFrame();
  const t = ground[g];
  const leave = out === undefined ? 0 : prog(f, out, BEAT * 0.9);
  return (
    <div style={{ textAlign: align }}>
      {lines.map((l, i) => {
        const p = prog(f, at + i * BEAT * 0.6, BEAT * 1.2);
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: size * 0.2, marginBottom: -size * 0.12 }}>
            <div
              style={{
                fontFamily: font.display,
                fontSize: size,
                lineHeight: stage.headLead,
                letterSpacing: -size * 0.01,
                display: 'inline-block',
                color: 'transparent',
                backgroundImage: headFill(g),
                // The gradient paints only inside the box, so the box reaches below Michroma's descenders (g, y).
                paddingBottom: '0.25em',
                marginBottom: '-0.25em',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                transform: `translateY(${((1 - p) + leave) * 110}%)`,
                whiteSpace: 'nowrap',
              }}
            >
              {l}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** What the feature does, in a sentence: Geist, muted, after the headline and leaving with it. */
export const Sub: React.FC<{ g: Ground; text: string; at: number; out?: number; width?: number }> = ({ g, text, at, out, width = 860 }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, BEAT * 1.2) * (out === undefined ? 1 : 1 - prog(f, out, BEAT * 0.6));
  return (
    <div style={{ marginTop: 26, maxWidth: width, textWrap: 'balance', fontFamily: font.text, fontSize: stage.sub, lineHeight: stage.subLead, color: ground[g].muted, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
      {text}
    </div>
  );
};

/** One camera pose for the phone: screen point (fx, fy) lands at frame point (x, y), scaled by s and turned in 3D (degrees). */
export type Pose = { fx: number; fy: number; x: number; y: number; s: number; rx?: number; ry?: number; rz?: number };

/** Eases between poses at the given frames, so a shot can push in, drift and settle. */
export const usePose = (keys: [number, Pose][]): Pose => {
  const f = useCurrentFrame();
  const at = keys.map(([k]) => k);
  const pick = (get: (p: Pose) => number) => interpolate(f, at, keys.map(([, p]) => get(p)), { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return {
    fx: pick((p) => p.fx), fy: pick((p) => p.fy), x: pick((p) => p.x), y: pick((p) => p.y), s: pick((p) => p.s),
    rx: pick((p) => p.rx ?? 0), ry: pick((p) => p.ry ?? 0), rz: pick((p) => p.rz ?? 0),
  };
};

/** The phone, placed by a pose. Children draw on a 390 by 844 screen (the app's own point size). */
export const Device: React.FC<{ g: Ground; pose: Pose; screenBg?: string; children: React.ReactNode }> = ({ g, pose, screenBg = light.paper, children }) => {
  const t = ground[g];
  const { fx, fy, x, y, s, rx = 0, ry = 0, rz = 0 } = pose;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - fx,
        top: y - fy,
        width: stage.screenW,
        height: stage.screenH,
        transformOrigin: `${fx}px ${fy}px`,
        transform: `perspective(1800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: stage.corner,
          overflow: 'hidden',
          background: screenBg,
          boxShadow: `0 0 0 ${stage.bezel}px ${t.ring}, 0 0 0 ${stage.bezel + 1.5}px ${g === 'ink' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.35)'}, 0 60px 120px ${t.shadow}`,
          fontFamily: font.text,
          color: light.ink,
        }}
      >
        {children}
        <div style={{ position: 'absolute', top: 12, left: 133, width: 124, height: 34, borderRadius: 17, background: '#000', zIndex: 5 }} />
      </div>
    </div>
  );
};

/** The headline block at the top of a portrait frame, inside Instagram's safe area. */
export const Head: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = stage.textTop }) => {
  const F = useFormat();
  return <div style={{ position: 'absolute', left: F.side, width: F.w - F.side * 2, top, zIndex: 10 }}>{children}</div>;
};
