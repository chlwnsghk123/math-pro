import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cross-session UI preferences (persisted to localStorage). These carry over
 * between notebooks and page reloads:
 *   - book          : last selected 문제집 (교재) id
 *   - solutionMode  : default answer-sheet style for NEW notebooks
 *   - handwriting   : default 손글씨 풀이 for NEW notebooks
 *
 * Title / student name are intentionally NOT here — they reset every time the
 * create modal opens.
 */
export const usePrefsStore = create(
  persist(
    (set) => ({
      book: null,
      solutionMode: 'solution',
      handwriting: false,
      setBook: (book) => set({ book }),
      setSolutionMode: (solutionMode) => set({ solutionMode }),
      setHandwriting: (handwriting) => set({ handwriting }),
    }),
    { name: 'math-pro:prefs-v1' },
  ),
);
