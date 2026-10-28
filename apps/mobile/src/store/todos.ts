import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, addMonths, todayISO } from '@/lib/dates';
import { uid } from '@/lib/id';
import type { Todo } from '@/lib/todos';
import { storage } from './persist';

type State = {
  todos: Todo[];
  add: (t: Omit<Todo, 'id' | 'done'>) => string;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  /** Chain lube and similar: restart the clock from today and the kilometres recorded so far. */
  markServiceDone: (id: string, appKm: number) => void;
  /** Keep one reminder per source (licence, insurance, PUC, RC): create, move or drop it with the document date. */
  syncSource: (source: string, title: string, due: string | undefined) => void;
};

const seed = (): Todo[] => [
  { id: 'seed-camera', title: 'Charge action camera', category: 'pack', kind: 'date', due: addDays(todayISO(), 1), done: false },
  { id: 'seed-lube', title: 'Chain lube', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1, lastDate: addDays(todayISO(), -18), lastKm: 0, done: false },
  { id: 'seed-puc', title: 'PUC certificate', category: 'document', kind: 'date', due: addMonths(todayISO(), 3), done: false },
];

export const useTodos = create<State>()(
  persist(
    (set) => ({
      todos: seed(),
      add: (t) => { const id = uid(); set((s) => ({ todos: [...s.todos, { ...t, id, done: false, updatedAt: Date.now() }] })); return id; },
      remove: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      toggle: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t)) })),
      markServiceDone: (id, appKm) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, lastDate: todayISO(), lastKm: appKm, done: false, updatedAt: Date.now() } : t)) })),
      syncSource: (source, title, due) => set((s) => {
        const rest = s.todos.filter((t) => t.source !== source);
        if (!due) return { todos: rest };
        const old = s.todos.find((t) => t.source === source);
        return { todos: [...rest, { id: old?.id ?? uid(), title, category: 'document', kind: 'date', due, source, done: false, updatedAt: Date.now() }] };
      }),
    }),
    { name: 'myto-todos', storage },
  ),
);
