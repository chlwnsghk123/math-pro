import { useCartStore } from '../store/cartStore.js';
import { IconCart, IconClose, IconEmptyBox, IconPrint, IconTrash } from './Icons.jsx';
import { parseProblemId } from '../data/catalog.js';
import AnswerText, { answerOf } from './AnswerText.jsx';
import ANSWERS from '../data/answers.js';

export default function Cart({ onCreate, className = '', variant = 'panel', onClose }) {
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const hasItems = items.length > 0;

  return (
    <aside
      className={`flex min-h-0 flex-col rounded-2xl bg-white shadow-card ring-1 ring-slate-100 ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <IconCart className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">장바구니</h2>
            <p className="text-xs text-slate-500">{items.length}문제 선택됨</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasItems && (
            <button
              type="button"
              onClick={() => {
                if (confirm('장바구니를 모두 비울까요?')) clear();
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <IconTrash className="h-3.5 w-3.5" /> 전체 비우기
            </button>
          )}
          {variant === 'sheet' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="닫기"
            >
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {hasItems ? (
          <ul className="flex flex-col gap-1">
            {items.map((id) => {
              const parsed = parseProblemId(id);
              return (
                <li
                  key={id}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50"
                >
                  <span className="flex h-9 min-w-[2.5rem] shrink-0 items-center justify-center rounded-lg bg-brand-50 px-1.5 text-xs font-bold text-brand-700">
                    {parsed?.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{id}</p>
                    <p className="truncate text-xs text-slate-500">
                      답: <AnswerText value={answerOf(ANSWERS[id])} />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="rounded-full p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`${id} 제거`}
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState />
        )}
      </div>

      <footer className="border-t border-slate-100 p-3">
        <button
          type="button"
          disabled={!hasItems}
          onClick={onCreate}
          className="btn-primary w-full"
        >
          <IconPrint className="h-4 w-4" /> 오답노트 생성
        </button>
        {!hasItems && (
          <p className="mt-2 text-center text-[11px] text-slate-400">
            최소 1문제 이상 선택해주세요
          </p>
        )}
      </footer>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <IconEmptyBox className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-700">장바구니가 비었어요</p>
        <p className="mt-1 text-xs text-slate-500">
          문제를 탭하거나 검색해서
          <br />
          오답노트에 담아보세요
        </p>
      </div>
    </div>
  );
}
