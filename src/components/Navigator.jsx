import { useEffect, useRef, useState } from 'react';
import { BOOKS, categoryGroupsForBook, getBook } from '../data/catalog.js';
import { IconBook, IconCheck, IconChevronDown } from './Icons.jsx';

/**
 * Two-level navigation: pick a 문제집 (book) from a styled dropdown, then a
 * 단원/강 (category) from wrapping chips. Chips wrap instead of scrolling
 * sideways, so the bar never forces horizontal scroll.
 */
export default function Navigator({ book, category, counts, onBook, onCategory }) {
  const groups = categoryGroupsForBook(book);
  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-slate-100/80 bg-white/80 px-4 py-3.5 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:border sm:border-slate-100 sm:px-4 sm:shadow-soft">
      {/* 문제집 (book) selector */}
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          문제집
        </span>
        <BookPicker book={book} onBook={onBook} />
      </div>

      {/* 단원/강 (category) picker — one row per 단원, chips wrap */}
      <div role="tablist" className="flex flex-col gap-1.5">
        {groups.map((grp) => (
          <div key={grp.key} className="flex flex-wrap items-center gap-1.5">
            {grp.group && (
              <span className="mr-0.5 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
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
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.97] ${
                    active
                      ? 'bg-brand-500 text-white shadow-soft'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{c.tab}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                      active ? 'bg-white/25 text-white' : 'bg-white text-slate-400'
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

/** Styled 문제집 dropdown: a trigger showing the current book, opening a card
 *  menu listing books (name + subject, checkmark on the active one). */
function BookPicker({ book, onBook }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = getBook(book);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-2.5 pr-2.5 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:w-auto"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <IconBook className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 sm:flex-none">
          <span className="block truncate text-sm font-bold leading-tight text-slate-900">
            {current?.name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-slate-400">
            {current?.subject}
          </span>
        </span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[16rem] rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-slate-100 sm:w-80">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            문제집 선택
          </p>
          {BOOKS.map((b) => {
            const active = b.id === book;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onBook(b.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                  active ? 'bg-brand-50' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <IconBook className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{b.name}</span>
                  <span className="block truncate text-xs text-slate-400">{b.subject}</span>
                </span>
                {active && <IconCheck className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
