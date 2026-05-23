import { create } from 'zustand';
import { compareProblemIds } from '../config.js';

/**
 * Cart is intentionally in-memory only — a page refresh wipes the
 * selection. Anything the user wants to keep should be saved as a
 * notebook (see notebookStore).
 */
export const useCartStore = create((set, get) => ({
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
}));
