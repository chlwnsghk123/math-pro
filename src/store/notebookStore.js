import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compareProblemIds } from '../data/catalog.js';

const STORAGE_KEY = 'math-pro:notebooks-v1';

/**
 * A notebook is an immutable-ish snapshot of a cart selection plus its
 * cover info (title / student name / date). The problemIds array is
 * fixed at creation time. Title/name/date can be edited later.
 *
 * Shape:
 *   {
 *     id: string (uuid-like),
 *     title: string,
 *     studentName: string,    // may be ''
 *     studentDate: string,    // 'YYYY-MM-DD'
 *     problemIds: string[],   // sorted by compareProblemIds
 *     solutionMode: 'answer' | 'solution',  // answer-key style for printing
 *     createdAt: number,      // ms epoch
 *     updatedAt: number,
 *   }
 */
function makeId() {
  return `nb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotebookStore = create(
  persist(
    (set, get) => ({
      notebooks: [],

      create: ({ title, studentName, studentDate, problemIds, solutionMode }) => {
        const id = makeId();
        const now = Date.now();
        const nb = {
          id,
          title: (title || '').trim() || '오답 노트',
          studentName: (studentName || '').trim(),
          studentDate: studentDate || '',
          problemIds: [...problemIds].sort(compareProblemIds),
          solutionMode: solutionMode || 'solution',
          createdAt: now,
          updatedAt: now,
        };
        set({ notebooks: [nb, ...get().notebooks] });
        return id;
      },

      update: (id, patch) => {
        const now = Date.now();
        set({
          notebooks: get().notebooks.map((nb) =>
            nb.id === id ? { ...nb, ...patch, updatedAt: now } : nb,
          ),
        });
      },

      remove: (id) => {
        set({ notebooks: get().notebooks.filter((nb) => nb.id !== id) });
      },

      clear: () => set({ notebooks: [] }),

      get: (id) => get().notebooks.find((nb) => nb.id === id),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ notebooks: state.notebooks }),
    },
  ),
);

/** "오답 노트-유하정-2026-05-23" — used for display + filename. */
export function notebookDisplayName(nb) {
  const title = nb.title || '오답 노트';
  const name = nb.studentName || '';
  const date = nb.studentDate || '';
  return [title, name, date].join('-');
}
