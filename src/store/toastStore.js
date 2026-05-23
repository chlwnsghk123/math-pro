import { create } from 'zustand';

let seq = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (message, opts = {}) => {
    const id = ++seq;
    const toast = {
      id,
      message,
      tone: opts.tone || 'default',
      duration: opts.duration ?? 2200,
    };
    set({ toasts: [...get().toasts, toast] });
    if (toast.duration > 0) {
      setTimeout(() => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, toast.duration);
    }
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
