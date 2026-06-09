import { useMemo } from 'react';
import { buildImageUrl, getCategory, parseProblemId } from '../data/catalog.js';
import ProblemImage from './ProblemImage.jsx';
import { IconCheck, IconPlus } from './Icons.jsx';
import { useCartStore } from '../store/cartStore.js';
import ANSWERS from '../data/answers.js';

export default function ProblemGrid({ category }) {
  const items = useMemo(() => {
    return Object.keys(ANSWERS)
      .map((id) => {
        const parsed = parseProblemId(id);
        return parsed ? { id, ...parsed } : null;
      })
      .filter((x) => x && x.category === category)
      .sort((a, b) => a.number - b.number);
  }, [category]);

  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl bg-white text-center text-sm text-slate-500 shadow-soft ring-1 ring-slate-100">
        <span className="text-base font-semibold text-slate-700">
          {getCategory(category)?.tab || category} · 문제 없음
        </span>
        <span>문제가 추가되면 표시됩니다.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((p) => (
        <ProblemCard key={p.id} id={p.id} category={p.category} number={p.number} />
      ))}
    </div>
  );
}

function ProblemCard({ id, category, number }) {
  const selected = useCartStore((s) => s.items.includes(id));
  const toggle = useCartStore((s) => s.toggle);
  const src = buildImageUrl(category, number);
  // Legacy problems are tall/narrow; lecture problems (단원→강) are wide
  // statement blocks, so give those cards a landscape frame.
  const ratio = getCategory(category)?.kind === 'lecture' ? '4 / 3' : '3 / 4';

  function onClick() {
    // No toast on add/remove — selecting many problems shouldn't spam popups.
    toggle(id);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-2 rounded-2xl bg-white p-2 text-left ring-1 transition duration-200 ${
        selected
          ? 'shadow-card ring-2 ring-brand-500'
          : 'shadow-soft ring-slate-100 hover:-translate-y-0.5 hover:shadow-card hover:ring-slate-200'
      }`}
    >
      <div className="relative">
        <ProblemImage src={src} alt={`${id} 문제 이미지`} ratio={ratio} />
        <span
          className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition ${
            selected
              ? 'bg-brand-500 text-white shadow-soft'
              : 'bg-white/90 text-slate-300 ring-1 ring-slate-200 backdrop-blur group-hover:text-slate-400'
          }`}
          aria-hidden
        >
          {selected ? <IconCheck className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
        </span>
      </div>
      <span className="px-1 pb-0.5 text-sm font-bold tracking-tight text-slate-900">{id}</span>
    </button>
  );
}
