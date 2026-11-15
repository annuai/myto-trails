import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import type { Instruction } from '@/lib/guidance';
import { deviceLocale } from '@/lib/locale';
import { startVoice, voiceStep } from '@/lib/voiceCue';
import { useRoutePrefs } from '@/store/routePrefs';

/** Speaks the instruction on screen when lib/voiceCue says it is time. A newer sentence cuts off an older one: the latest is the one that matters. */
export function useVoiceGuidance(ins: Instruction | undefined, speedMps: number): void {
  const on = useRoutePrefs((s) => s.voice);
  const state = useRef(startVoice);
  useEffect(() => {
    if (!on || !ins) return;
    const step = voiceStep(state.current, ins, speedMps);
    state.current = step.state;
    if (!step.say) return;
    try {
      Speech.stop();
      Speech.speak(step.say, { language: deviceLocale(), rate: 1.0 });
    } catch { /* no speech engine: the card still shows the turn */ }
  }, [on, ins, speedMps]);
  useEffect(() => () => { try { Speech.stop(); } catch { /* nothing to stop */ } }, []);
}
