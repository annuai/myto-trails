/** How long a ride must stand still, unpaused, before the app asks if the rider is all right. */
export const STOP_PROMPT_MS = 10 * 60_000;

export type PromptState = { /** When the current stop began; null while moving. */ stoppedSince: number | null; /** Asked already during this stop. */ asked: boolean };
export const startPrompt: PromptState = { stoppedSince: null, asked: false };

/**
 * One step of the "Are you OK?" watch. `stopped` is the typing gate's reliable-stop signal. Moving again, pausing or
 * finishing the ride starts the watch over, so a tea break the rider paused never asks, and each stop asks once.
 */
export function stepPrompt(s: PromptState, i: { now: number; running: boolean; paused: boolean; stopped: boolean }): { state: PromptState; ask: boolean } {
  if (!i.running || i.paused || !i.stopped) return { state: startPrompt, ask: false };
  const stoppedSince = s.stoppedSince ?? i.now;
  if (!s.asked && i.now - stoppedSince >= STOP_PROMPT_MS) return { state: { stoppedSince, asked: true }, ask: true };
  return { state: { stoppedSince, asked: s.asked }, ask: false };
}
