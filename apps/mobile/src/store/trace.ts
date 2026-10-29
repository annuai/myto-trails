import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

/** Whether rides save a motion trace (GPS and shake evidence, and what the detector made of it) for tuning stop detection. Off until the rider turns it on. */
export const useTraceSetting = create<{ on: boolean; set: (on: boolean) => void }>()(
  persist((set) => ({ on: false, set: (on) => set({ on }) }), { name: 'myto-trace', storage }),
);
