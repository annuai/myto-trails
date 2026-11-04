import { create } from 'zustand';
import { watchLocation, type Fix } from '@/lib/location';

type State = {
  fix?: Fix;
  /** When the phone's clock last saw a fix arrive (not the fix's own time, which can be old). */
  fixAt?: number;
  error?: string;
  /** The error cannot fix itself (permission blocked). */
  blocked: boolean;
  watchers: number;
  /** Start watching the position; every caller must release. The watch runs while anyone holds it. */
  acquire: () => () => void;
};

let stop: (() => void) | undefined;

/** One shared GPS watch: the ready screen and the recorder both read it, so the position is there the moment a ride starts. */
export const useLocation = create<State>((set, get) => ({
  blocked: false, watchers: 0,
  acquire: () => {
    const n = get().watchers + 1;
    set({ watchers: n });
    if (n === 1) {
      set({ error: undefined, blocked: false });
      stop = watchLocation((fix) => set({ fix, fixAt: Date.now(), error: undefined, blocked: false }), (error, fatal) => set({ error, blocked: fatal }));
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = Math.max(0, get().watchers - 1);
      set({ watchers: left });
      if (left === 0) { stop?.(); stop = undefined; }
    };
  },
}));
