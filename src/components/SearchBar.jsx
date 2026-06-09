import { useEffect, useRef, useState } from 'react';
import { IconClose, IconPlus, IconSearch } from './Icons.jsx';
import { compareProblemIds, parseProblemId } from '../config.js';
import { useCartStore } from '../store/cartStore.js';
import { useToastStore } from '../store/toastStore.js';
import ANSWERS from '../data/answers.js';

export default function SearchBar({ onJump }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const add = useCartStore((s) => s.add);
  const contains = useCartStore((s) => s.contains);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    function onClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const query = value.trim();
  const suggestions = (() => {
    if (!query) return [];
    return Object.keys(ANSWERS)
      .filter((id) => id.startsWith(query))
      .sort(compareProblemIds)
      .slice(0, 8);
  })();

  function handleAdd(id) {
    const parsed = parseProblemId(id);
    if (!parsed) {
      toast('올바른 문제 번호 형식이 아닙니다 (예: 7-30)', { tone: 'warn' });
      return;
    }
    if (!ANSWERS[id]) {
      toast(`${id} 문제를 찾을 수 없습니다`, { tone: 'warn' });
      return;
    }
    if (contains(id)) {
      toast('이미 담긴 문제입니다', { tone: 'warn' });
    } else {
      add(id);
      toast(`${id} 담음`, { tone: 'success' });
    }
    setValue('');
    setOpen(false);
    onJump?.(parsed);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!query) return;
    handleAdd(query);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft ring-1 ring-slate-200 focus-within:ring-brand-500"
      >
        <IconSearch className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          placeholder="문제 번호 검색 · 예: 7-30, 20-5"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setOpen(false);
            }}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="검색어 지우기"
          >
            <IconClose className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs">
          <IconPlus className="h-4 w-4" /> 담기
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-100">
          <ul className="max-h-72 overflow-auto py-1">
            {suggestions.map((id) => {
              const already = contains(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{id}</span>
                    <span
                      className={`text-xs font-medium ${
                        already ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {already ? '담김' : '담기'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
