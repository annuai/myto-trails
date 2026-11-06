import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Outbox } from '@/lib/photoOutbox';
import { storage } from './persist';

/** Club posts of photos waiting to be sent. Kept on the phone, with the copies they will send, so closing the app does not lose them. */
type State = { items: Outbox; setItems: (items: Outbox) => void };

export const usePhotoOutbox = create<State>()(persist((set) => ({ items: [], setItems: (items) => set({ items }) }), { name: 'myto-photo-outbox', storage }));
