import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { prog } from '../core';
import { useFonts } from '../ui';
import { REEL_DURATION, SHOTS, beat } from './beats';
import { EndCard, FEATURES, Hero, Horizon, Open, featureShot } from './shots';

export type ReelProps = { music: boolean };

const TURNS = [8, -8, 10, -6, 6, -10, 8];
const CUT: [keyof typeof SHOTS, React.FC][] = [
  ['open', Open],
  ['hero', Hero],
  ...(Object.keys(FEATURES) as (keyof typeof FEATURES)[]).map((id, i): [keyof typeof SHOTS, React.FC] => [id, featureShot(FEATURES[id], TURNS[i])]),
  ['horizon', Horizon],
  ['end', EndCard],
];

/** Frames each shot runs past its end while the next dissolves in over it (a third of a second). */
const DISSOLVE = 10;

const FadeIn: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: on ? prog(f, 0, DISSOLVE) : 1 }}>{children}</AbsoluteFill>;
};

/** The Instagram Reel and Story: cuts on the beat with a short dissolve, one idea per shot, no voice-over. */
export const Reel: React.FC<ReelProps> = ({ music }) => {
  useFonts();
  return (
    <AbsoluteFill>
      {CUT.map(([id, Shot], i) => {
        const [a, z] = SHOTS[id];
        const last = i === CUT.length - 1;
        return (
          <Sequence key={id} from={beat(a)} durationInFrames={beat(z) - beat(a) + (last ? 0 : DISSOLVE)}>
            <FadeIn on={i > 0}><Shot /></FadeIn>
          </Sequence>
        );
      })}
      {music ? (
        <Audio
          src={staticFile('audio/music.mp3')}
          volume={(f) => interpolate(f, [0, 6, REEL_DURATION - 45, REEL_DURATION], [0, 0.9, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}
    </AbsoluteFill>
  );
};
