import React from 'react';
import { AbsoluteFill, Audio, Composition, interpolate, staticFile } from 'remotion';
import { DURATION, FPS, c } from './core';
import { Backdrop, useFonts } from './ui';
import { End, Group, Hook, Plan, Scene, Sos, Trail } from './scenes';

export type PromoProps = { music: boolean; voice: boolean };

/** Scene boundaries in frames at 30 fps (0:05, 0:16, 0:27, 0:40, 0:50, 1:00). */
const T = { trail: 150, plan: 480, group: 810, sos: 1200, end: 1500 };

const Promo: React.FC<PromoProps> = ({ music, voice }) => {
  useFonts();
  const bed = voice ? 0.22 : 0.55;
  return (
    <AbsoluteFill style={{ backgroundColor: c.paper }}>
      <Backdrop />
      <Scene from={0} to={T.trail} first><Hook /></Scene>
      <Scene from={T.trail} to={T.plan}><Trail /></Scene>
      <Scene from={T.plan} to={T.group}><Plan /></Scene>
      <Scene from={T.group} to={T.sos}><Group /></Scene>
      <Scene from={T.sos} to={T.end}><Sos /></Scene>
      <Scene from={T.end} to={DURATION} last><End /></Scene>
      {voice ? <Audio src={staticFile('audio/voiceover.m4a')} /> : null}
      {music ? (
        <Audio
          src={staticFile('audio/music.mp3')}
          volume={(f) =>
            // Fade in and out, and sit lower under the SOS moment (0:39 to 0:51).
            interpolate(f, [0, 45, DURATION - 75, DURATION], [0, bed, bed, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
            interpolate(f / FPS, [39, 41, 49, 51], [1, 0.65, 0.65, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};

const sizes = [
  { id: 'Promo-9x16', width: 1080, height: 1920 },
  { id: 'Promo-4x5', width: 1080, height: 1350 },
  { id: 'Promo-16x9', width: 1920, height: 1080 },
];

export const Root: React.FC = () => (
  <>
    {sizes.map((s) => (
      <Composition key={s.id} id={s.id} component={Promo} durationInFrames={DURATION} fps={FPS} width={s.width} height={s.height} defaultProps={{ music: false, voice: false } satisfies PromoProps} />
    ))}
  </>
);
