import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
// The app's own components and tokens: the phone screens are the app, not a copy of it.
import { Button } from '@/ui/Button';
import { light } from '@/theme/tokens';
import { c, font, prog, useFormat } from '../core';
import { RealScreen, Seg } from '../screens';
import { BEAT } from './beats';
import { Bg, Device, Eyebrow, Head, Sub, Words, usePose, type Ground, type Pose } from './kit';

const DARK_SCREEN = '#101010';
const b = (n: number) => Math.round(n * BEAT);

/** Beat 0 to 4: black, then one word. */
export const Open: React.FC = () => {
  const f = useCurrentFrame();
  const { h } = useFormat();
  return (
    <Bg g="ink" contours>
      <div style={{ position: 'absolute', top: h / 2 - 170, left: 0, right: 0 }}>
        <Words g="ink" lines={['Ride']} at={b(1)} size={250} align="center" />
      </div>
    </Bg>
  );
};

/** Beat 4 to 16: the phone rises out of the dark and settles, recording a ride. */
export const Hero: React.FC = () => {
  const pose = usePose([
    [0, { fx: 195, fy: 0, x: 540, y: 2050, s: 1.3, rx: 58, ry: -10, rz: 4 }],
    [b(3), { fx: 195, fy: 422, x: 540, y: 1400, s: 1.5, rx: 12, ry: -14, rz: 0 }],
    [b(12), { fx: 195, fy: 422, x: 540, y: 1370, s: 1.58, rx: 4, ry: -4, rz: 0 }],
  ]);
  return (
    <Bg g="ink">
      <Head>
        <Words g="ink" lines={['Everything', 'for the ride.']} at={b(1)} />
        <Sub g="ink" text="Find trails, plan trips, navigate, and record every ride, with help one hold away." at={b(2.6)} />
      </Head>
      <Device g="ink" pose={pose} screenBg={DARK_SCREEN}>
        <RealScreen bg={DARK_SCREEN}>
          <Seg src="reel/ride" from={0} frames={b(12)} />
        </RealScreen>
      </Device>
    </Bg>
  );
};

/**
 * A feature shot, ten beats, on one of the real iPhone recordings (video/prepare-captures.mjs): the headline and the
 * line saying what it does read over a large phone (beats 0 to 6.5), leave on the beat, and the camera eases in on one
 * detail (6.5 to 8.2), then drifts. Clips play at 0.8x so the detail is on screen when the camera arrives.
 * `wide` keeps the phone under the headline; `close` is the detail, in app points on the 390 by 844 screen.
 */
const Feature: React.FC<{ g: Ground; eyebrow: string; lines: string[]; sub: string; wide: Pose; close: Pose; screenBg: string; children: React.ReactNode }> = ({
  g, eyebrow, lines, sub, wide, close, screenBg, children,
}) => {
  const enter = { ...wide, y: wide.y + 120, s: wide.s * 0.94 };
  const pose = usePose([[0, enter], [b(6.5), wide], [b(8.2), close], [b(10), { ...close, s: close.s * 1.03 }]]);
  return (
    <Bg g={g}>
      <Device g={g} pose={pose} screenBg={screenBg}>{children}</Device>
      <Head>
        <Eyebrow g={g} text={eyebrow} out={b(6.5)} />
        <Words g={g} lines={lines} at={2} out={b(6.5)} />
        <Sub g={g} text={sub} at={b(1.6)} out={b(6.3)} />
      </Head>
    </Bg>
  );
};

type FeatureSpec = { g: Ground; eyebrow: string; lines: string[]; sub: string; clip: string; from?: number; rate?: number; dark?: boolean; close: Omit<Pose, 'x' | 'y'> & { y?: number } };

/** The phone sits under the headline at this pose; each shot turns it a little differently so the run does not repeat. */
const wide = (ry: number, rx = 8): Pose => ({ fx: 195, fy: 0, x: 540, y: 730, s: 1.75, rx, ry });

/** The explainer, in the order a ride happens. Grounds alternate, and a dark app screen always sits on paper. */
export const FEATURES = {
  trail: { g: 'ink', eyebrow: '01  Trails', lines: ['Know if you', 'can ride it.'], sub: 'Every trail shows access, condition and who checked it, reported by riders.', clip: 'reel/trail', close: { fx: 195, fy: 170, s: 2.6 } },
  plan: { g: 'paper', eyebrow: '02  Trips', lines: ['Plan a trip', 'in a minute.'], sub: 'Name it, pick a day and a trail. Pillion lays the route out with you.', clip: 'reel/plan', close: { fx: 195, fy: 380, s: 2.3, y: 1020 } },
  pack: { g: 'ink', eyebrow: '03  Pack list', lines: ['Pack once.', 'Forget nothing.'], sub: 'Gear, documents and tools, ticked off before you leave.', clip: 'reel/pack', close: { fx: 195, fy: 230, s: 2.5 } },
  navigate: { g: 'paper', eyebrow: '04  Navigate', lines: ['Turn-by-turn', 'to the trail.'], sub: 'Directions from where you are to where the trail begins.', clip: 'reel/navigate', dark: true, close: { fx: 175, fy: 190, s: 2.9, y: 960 } },
  journal: { g: 'ink', eyebrow: '05  Journal', lines: ['A journal for', 'every ride.'], sub: 'Notes, voice and photos from the road, kept on your phone.', clip: 'reel/journal', close: { fx: 195, fy: 640, s: 2.3 } },
  sos: { g: 'paper', eyebrow: '06  SOS', lines: ['Help is one', 'hold away.'], sub: 'Hold SOS to call 112 or share exactly where you are.', clip: 'sos', from: 3.4, rate: 0.6, dark: true, close: { fx: 195, fy: 300, s: 2.6, y: 960 } },
  year: { g: 'ink', eyebrow: '07  Your year', lines: ['Your year,', 'in numbers.'], sub: 'Kilometres, rides and your best days, on a card made to share.', clip: 'reel/year', close: { fx: 195, fy: 540, s: 2.2 } },
} satisfies Record<string, FeatureSpec>;

export const featureShot = (spec: FeatureSpec, turn: number): React.FC => {
  const Shot: React.FC = () => {
    const bg = spec.dark ? DARK_SCREEN : light.paper;
    return (
      <Feature g={spec.g} eyebrow={spec.eyebrow} lines={spec.lines} sub={spec.sub} screenBg={bg} wide={wide(turn)} close={{ x: 540, y: 1000, ...spec.close }}>
        <RealScreen bg={bg}>
          <Seg src={spec.clip} from={spec.from ?? 0} frames={b(10)} rate={spec.rate ?? 0.8} />
        </RealScreen>
      </Feature>
    );
  };
  return Shot;
};

/** After the features, ten beats: the closing line over contour rings, and the rider on the ridge rising under it. */
export const Horizon: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h } = useFormat();
  const pic = prog(f, b(3.5), b(2.5));
  const imgH = w / 3;
  return (
    <Bg g="paper" contours>
      <Head>
        <Words g="paper" lines={['Built for', 'the road', 'ahead.']} at={b(0.5)} size={118} />
      </Head>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: w, height: imgH * 1.35, opacity: pic,
          transform: `translateY(${(1 - pic) * 60}px) scale(${1.35 + 0.05 * (f / b(10))})`, transformOrigin: 'bottom left',
        }}
      >
        <Img src={staticFile('img/ending.webp')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 25%)' }} />
      </div>
    </Bg>
  );
};

/** The last twelve beats: the logo and the call to action, using the app's own Button. */
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const logo = prog(f, b(0.5), b(1.5));
  const cta = prog(f, b(2), b(1.5));
  const bio = prog(f, b(3.5), b(1.5));
  const k = 1.75;
  const rise = (p: number, by: number) => ({ opacity: p, transform: `translateY(${(1 - p) * by}px)` });
  // One centred column: every item is centred on the frame's middle line, and the group on its middle height.
  return (
    <Bg g="paper">
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 420, height: 194, background: c.brand, ...rise(logo, 24),
            WebkitMaskImage: `url(${staticFile('img/logo.svg')})`, WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', WebkitMaskSize: 'contain',
          }}
        />
        <div style={{ marginTop: 96, height: 56 * k, display: 'flex', justifyContent: 'center', ...rise(cta, 30) }}>
          <div style={{ transform: `scale(${k})`, transformOrigin: 'top center' }}>
            <Button label="Join the beta" arrow />
          </div>
        </div>
        <div style={{ marginTop: 48, fontFamily: font.text, fontWeight: 500, fontSize: 38, color: light.ink, ...rise(bio, 12) }}>myto-moto.com</div>
        <div style={{ marginTop: 14, fontFamily: font.mono, fontSize: 26, color: light.muted, ...rise(bio, 12) }}>Link in bio</div>
      </AbsoluteFill>
    </Bg>
  );
};
