import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { crashSlice, type CrashStore } from './crashCore';
import { storage } from './persist';

/** The crash detection switch (kept on the phone) and the live countdown. */
export const useCrash = create<CrashStore>()(persist(crashSlice(), { name: 'myto-crash', storage, partialize: (s) => ({ enabled: s.enabled }) as CrashStore }));
