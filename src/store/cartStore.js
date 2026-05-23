import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compareProblemIds } from '../config.js';

const STORAGE_KEY = 'math-pro:cart-v1';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      contains: (id) => get().items.includes(id),

      add: (id) => {
        const cur = get().items;
        if (cur.includes(id)) return false;
        set({ items: [...cur, id].sort(compareProblemIds) });
        return true;
      },

      remove: (id) => {
        set({ items: get().items.filter((x) => x !== id) });
      },

      toggle: (id) => {
        const cur = get().items;
        if (cur.includes(id)) {
          set({ items: cur.filter((x) => x !== id) });
          return 'removed';
        }
        set({ items: [...cur, id].sort(compareProblemIds) });
        return 'added';
      },

      clear: () => set({ items: [] }),

      addMany: (ids) => {
        const cur = new Set(get().items);
        let added = 0;
        for (const id of ids) {
          if (!cur.has(id)) {
            cur.add(id);
            added++;
          }
        }
        set({ items: Array.from(cur).sort(compareProblemIds) });
        return added;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
