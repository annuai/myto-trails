import { describe, expect, it } from 'vitest';
import type { Instruction } from './guidance';
import { sayDistance, startVoice, voiceStep, type VoiceState } from './voiceCue';

const turn = (distM: number, text = 'Turn left onto MG Road.'): Instruction => ({ kind: 'left', distM, text, eyebrow: 'Navigation', remainingM: 5000, etaMin: 10, off: false, arrived: false });

/** Rides through the distances at one speed and collects what is said. */
function ride(dists: number[], speedMps: number, make = turn): string[] {
  let s: VoiceState = startVoice;
  const said: string[] = [];
  for (const d of dists) { const r = voiceStep(s, make(d), speedMps); s = r.state; if (r.say) said.push(r.say); }
  return said;
}

describe('voiceStep', () => {
  it('says a turn early and again as it comes up, once each', () => {
    expect(ride([1500, 900, 700, 400, 300, 120, 80, 50, 20], 15)).toEqual(['In 400 metres, turn left onto MG Road', 'Turn left onto MG Road']);
  });
  it('says it earlier at motorway speed', () => {
    expect(ride([2500, 700, 300], 30)[0]).toBe('In 700 metres, turn left onto MG Road');
    expect(ride([2500, 700], 10)).toEqual([]);
  });
  it('says only the turn when it is already close', () => {
    expect(ride([40, 20], 10)).toEqual(['Turn left onto MG Road']);
  });
  it('treats the same words further on as the next turn', () => {
    expect(ride([300, 50, 20, 900, 300, 50], 10, (d) => turn(d, 'Turn left'))).toEqual(['In 300 metres, turn left', 'Turn left', 'In 300 metres, turn left', 'Turn left']);
  });
  it('does not speak "carry on" steps', () => {
    expect(ride([300, 50], 10, (d) => ({ ...turn(d), kind: 'straight', text: 'Continue on MG Road' }))).toEqual([]);
  });
  it('says off the route and arrival once', () => {
    let s = startVoice;
    const said: string[] = [];
    for (const ins of [{ ...turn(300), off: true }, { ...turn(300), off: true }, { ...turn(0), arrived: true, text: 'You have arrived' }, { ...turn(0), arrived: true, text: 'You have arrived' }]) {
      const r = voiceStep(s, ins, 10); s = r.state; if (r.say) said.push(r.say);
    }
    expect(said).toEqual(['Off the route. Finding a new way', 'You have arrived']);
  });
});

describe('sayDistance', () => {
  it('rounds to what a rider would say', () => {
    expect(sayDistance(437)).toBe('450 metres');
    expect(sayDistance(83)).toBe('80 metres');
    expect(sayDistance(1234)).toBe('1.2 kilometres');
  });
});
