import { CATEGORY_GROUPS } from '../config.js';

export default function Tabs({ active, onChange, counts }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-slate-100 bg-white/85 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-100 sm:shadow-soft sm:py-1.5">
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
        {CATEGORY_GROUPS.map((grp, gi) => (
          <div key={grp.key} className="flex shrink-0 items-center gap-1">
            {gi > 0 && <span className="mx-1.5 h-6 w-px shrink-0 bg-slate-200" aria-hidden />}
            {grp.group && (
              <span className="shrink-0 whitespace-nowrap px-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {grp.group}
              </span>
            )}
            {grp.items.map((cat) => {
              const isActive = active === cat.code;
              const count = counts?.[cat.code] ?? 0;
              return (
                <button
                  key={cat.code}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onChange(cat.code)}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-soft'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.tab}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
