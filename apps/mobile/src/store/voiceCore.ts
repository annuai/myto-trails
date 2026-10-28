import { create } from 'zustand';
import { uid } from '@/lib/id';
import type { JournalEntry } from '@/lib/journalEntries';

/** An error whose message is fit to show the rider as it is. */
export class UserFacingError extends Error {}

export type VoiceAdapter = { start: () => Promise<void>; stop: () => Promise<string | undefined> };
export type VoiceDeps = { add: (e: JournalEntry) => void; save: (uri: string, id: string) => Promise<void>; now: () => number };

type State = {
  recording: boolean;
  /** When the current recording started, for a timer. */
  startedAt: number;
  /** The ride the current recording belongs to, kept even if the screen that started it is gone. */
  rideKey: number;
  error?: string;
  attach: (a: VoiceAdapter | undefined) => void;
  /** Tap to start, tap to stop and save. Ignored while a start or a stop is still in progress. */
  toggle: (rideKey: number) => Promise<void>;
};

/**
 * The voice recorder lives with the app, not with a screen, so leaving the screen while recording cannot lose the note.
 * `VoiceHost` attaches the real recorder.
 */
export function createVoice(deps: VoiceDeps) {
  let adapter: VoiceAdapter | undefined;
  let busy = false;
  return create<State>((set, get) => ({
    recording: false, startedAt: 0, rideKey: 0,
    attach: (a) => { adapter = a; },
    toggle: async (rideKey) => {
      if (busy) return;
      busy = true;
      try {
        if (!get().recording) {
          set({ error: undefined });
          try {
            if (!adapter) throw new Error('no recorder');
            await adapter.start();
            set({ recording: true, startedAt: deps.now(), rideKey });
          } catch (e) {
            set({ error: e instanceof UserFacingError ? e.message : 'Could not start recording.' });
          }
          return;
        }
        const { startedAt, rideKey: key } = get();
        set({ recording: false });
        try {
          const uri = await adapter?.stop();
          if (!uri) return;
          const id = uid();
          await deps.save(uri, id);
          deps.add({ id, rideKey: key, at: deps.now(), kind: 'voice', durationSec: Math.max(1, Math.round((deps.now() - startedAt) / 1000)) });
        } catch {
          set({ error: 'Could not save the voice note.' });
        }
      } finally {
        busy = false;
      }
    },
  }));
}
