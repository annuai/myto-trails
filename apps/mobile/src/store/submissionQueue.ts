import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubmissionQueue } from '@/lib/submissionQueue';
import { storage } from './persist';

/** Trail submissions waiting for a signal. Kept on the phone so closing the app does not lose them. */
type State = { items: SubmissionQueue; setItems: (items: SubmissionQueue) => void };

export const useSubmissionQueue = create<State>()(persist((set) => ({ items: [], setItems: (items) => set({ items }) }), { name: 'myto-submission-queue', storage }));
