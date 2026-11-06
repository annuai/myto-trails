import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayISO } from '@/lib/dates';
import { uid } from '@/lib/id';
import { withoutUntouchedExamples, type Todo } from '@/lib/todos';
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

export const useTodos = create<State>()(
  persist(
    (set) => ({
      todos: [],
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
    {
      name: 'myto-todos', storage, version: 1,
      // Phones that had the app before kept three example to-dos. The ones the rider never touched are dropped; the same reminders are one tap away on the To-do list.
      migrate: (saved, version) => {
        const s = saved as { todos?: Todo[] };
        return version < 1 && s.todos ? { ...s, todos: withoutUntouchedExamples(s.todos) } : s;
      },
    },
  ),
);
