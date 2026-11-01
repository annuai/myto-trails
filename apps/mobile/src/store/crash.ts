import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { crashPartialize, crashSlice, type CrashStore } from './crashCore';
import { storage } from './persist';

/** The crash detection switch (kept on the phone) and the live countdown. */
export const useCrash = create<CrashStore>()(persist(crashSlice(), { name: 'myto-crash', storage, partialize: crashPartialize }));
