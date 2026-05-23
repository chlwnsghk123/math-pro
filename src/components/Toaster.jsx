import { useToastStore } from '../store/toastStore.js';

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 print:hidden">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl px-4 py-2.5 text-sm font-medium shadow-card ring-1 transition ${
            t.tone === 'warn'
              ? 'bg-amber-50 text-amber-900 ring-amber-200'
              : t.tone === 'error'
                ? 'bg-rose-50 text-rose-900 ring-rose-200'
                : t.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : 'bg-slate-900/95 text-white ring-slate-900/10'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
