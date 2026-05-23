import { CATEGORIES } from '../config.js';

export default function Tabs({ active, onChange, counts }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-slate-100 bg-white/85 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-100 sm:shadow-soft sm:py-1.5">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto"
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat;
          const count = counts?.[cat] ?? 0;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(cat)}
              className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-brand-500 text-white shadow-soft'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cat}</span>
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
    </div>
  );
}
