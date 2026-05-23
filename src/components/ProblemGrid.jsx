import { useMemo } from 'react';
import { buildImageUrl, parseProblemId } from '../config.js';
import ProblemImage from './ProblemImage.jsx';
import { IconCheck, IconPlus } from './Icons.jsx';
import { useCartStore } from '../store/cartStore.js';
import { useToastStore } from '../store/toastStore.js';
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
          {category} 카테고리 문제 없음
        </span>
        <span>JSON 데이터에 문제가 추가되면 표시됩니다.</span>
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
  const toast = useToastStore((s) => s.show);
  const src = buildImageUrl(category, number);

  function onClick() {
    const result = toggle(id);
    if (result === 'added') toast(`${id} 담음`, { tone: 'success' });
    else toast(`${id} 제거됨`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-2 rounded-2xl bg-white p-2 text-left shadow-soft ring-1 transition ${
        selected
          ? 'ring-2 ring-brand-500'
          : 'ring-slate-100 hover:ring-slate-200'
      }`}
    >
      <ProblemImage src={src} alt={`${id} 문제 이미지`} ratio="3 / 4" />
      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className="text-sm font-semibold text-slate-900">{id}</span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
            selected
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
          }`}
          aria-hidden
        >
          {selected ? <IconCheck className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
        </span>
      </div>
    </button>
  );
}
