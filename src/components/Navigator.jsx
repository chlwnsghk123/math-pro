import { BOOKS, categoryGroupsForBook } from '../data/catalog.js';
import { IconChevronDown } from './Icons.jsx';

/**
 * Two-level navigation: pick a 문제집 (book) from a dropdown, then a 단원/강
 * (category) from wrapping chips. Chips wrap instead of scrolling sideways, so
 * the bar never forces horizontal scroll however many units a book has.
 */
export default function Navigator({ book, category, counts, onBook, onCategory }) {
  const groups = categoryGroupsForBook(book);
  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2.5 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-100 sm:px-3 sm:shadow-soft">
      {/* 문제집 (book) selector */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          문제집
        </span>
        <div className="relative w-full sm:w-auto">
          <select
            value={book}
            onChange={(e) => onBook(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm font-semibold text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-auto"
          >
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.subject}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* 단원/강 (category) picker — one row per 단원, chips wrap */}
      <div role="tablist" className="flex flex-col gap-1.5">
        {groups.map((grp) => (
          <div key={grp.key} className="flex flex-wrap items-center gap-1.5">
            {grp.group && (
              <span className="mr-0.5 shrink-0 text-[11px] font-bold text-slate-400">
                {grp.group}
              </span>
            )}
            {grp.items.map((c) => {
              const active = category === c.code;
              const count = counts?.[c.code] ?? 0;
              return (
                <button
                  key={c.code}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onCategory(c.code)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand-500 text-white shadow-soft'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.tab}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
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
