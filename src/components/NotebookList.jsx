import { useNotebookStore, notebookDisplayName } from '../store/notebookStore.js';
import { useToastStore } from '../store/toastStore.js';
import { IconBack, IconEmptyBox, IconPrint, IconTrash } from './Icons.jsx';
import { getCategory, parseProblemId } from '../data/catalog.js';

export default function NotebookList({ onClose, onOpen }) {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const remove = useNotebookStore((s) => s.remove);
  const toast = useToastStore((s) => s.show);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas-muted">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-soft sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <IconBack className="h-4 w-4" /> 돌아가기
        </button>
        <div className="text-sm font-semibold text-slate-900">
          내 오답노트{' '}
          <span className="ml-1 text-slate-400">({notebooks.length})</span>
        </div>
        <div />
      </header>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {notebooks.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="flex flex-col gap-3">
              {notebooks.map((nb) => (
                <NotebookCard
                  key={nb.id}
                  notebook={nb}
                  onOpen={() => onOpen(nb.id)}
                  onDelete={() => {
                    if (confirm(`"${notebookDisplayName(nb)}" 오답노트를 삭제할까요?`)) {
                      remove(nb.id);
                      toast('삭제되었습니다');
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NotebookCard({ notebook, onOpen, onDelete }) {
  const chapterSummary = summarizeChapters(notebook.problemIds);
  return (
    <li className="card flex items-stretch gap-3 p-3 sm:p-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconPrint className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {notebookDisplayName(notebook)}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {notebook.problemIds.length}문항 · {chapterSummary}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="btn-subtle"
          title="열기"
        >
          열기
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
          aria-label="삭제"
          title="삭제"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <IconEmptyBox className="h-8 w-8" />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-700">아직 생성한 오답노트가 없어요</p>
        <p className="mt-1 text-xs text-slate-500">
          문제를 담은 뒤 장바구니에서 '오답노트 생성'을 눌러주세요
        </p>
      </div>
    </div>
  );
}

function summarizeChapters(ids) {
  const seen = [];
  const set = new Set();
  for (const id of ids) {
    const p = parseProblemId(id);
    if (p && !set.has(p.category)) {
      set.add(p.category);
      seen.push(p.category);
    }
  }
  const names = seen.map((c) => getCategory(c)?.unitName).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 2) return names.join(', ');
  return `${names[0]} 외 ${names.length - 1}개`;
}
