import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState, type SyncState } from '@/lib/sync/syncCore';
import { storage } from './persist';

const newDeviceId = () => `phone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** The phone's sync bookkeeping (what the server last had, what is waiting). The rides, trips and to-dos themselves stay in their own stores. */
export const useSync = create<SyncState>()(
  persist(() => initialState(newDeviceId()), { name: 'myto-sync', storage, version: 1 }),
);

/** Back to a clean, switched-off state; the device id stays so the server still knows this phone. */
export const resetSync = () => useSync.setState({ ...initialState(useSync.getState().deviceId) });
export const waitingCount = (s: SyncState) => Object.keys(s.dirty).length + s.tracksPending.length;
