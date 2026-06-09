import { useEffect, useState } from 'react';
import { IconClose, IconPrint } from './Icons.jsx';
import { useCartStore } from '../store/cartStore.js';
import { usePrefsStore } from '../store/prefsStore.js';

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CreateNotebookModal({ open, onClose, onCreate }) {
  const items = useCartStore((s) => s.items);
  // New notebooks inherit the last-used answer-sheet settings (persisted).
  const solutionMode = usePrefsStore((s) => s.solutionMode);
  const handwriting = usePrefsStore((s) => s.handwriting);

  // Title / name are intentionally NOT remembered — both reset to blank every
  // time the modal opens.
  const [title, setTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentDate, setStudentDate] = useState(() => todayIso());

  // Reset the fields every time the modal opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setStudentName('');
      setStudentDate(todayIso());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) return;
    // Build a DRAFT — it is not persisted until the user taps 저장 in the
    // preview. The cart is cleared there, on save (not here), so discarding a
    // draft keeps your selection.
    const now = Date.now();
    onCreate({
      id: `draft_${now.toString(36)}`,
      title,
      studentName,
      studentDate,
      problemIds: [...items],
      solutionMode,
      handwriting,
      createdAt: now,
      updatedAt: now,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-card"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">오답노트 생성</h2>
            <p className="mt-1 text-xs text-slate-500">
              담아둔 {items.length}문항으로 새 오답노트를 만듭니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-3">
          <Field label="제목" hint="비워두면 제목 없이 인쇄됩니다">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 6월 모의고사 오답노트"
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </Field>
          <Field label="이름" hint="비워두면 손글씨 칸으로 인쇄됩니다">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="(공란)"
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </Field>
          <Field label="날짜">
            <input
              type="date"
              value={studentDate}
              onChange={(e) => setStudentDate(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
            />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={items.length === 0}>
            <IconPrint className="h-4 w-4" /> 생성하기
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="flex flex-col gap-1 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-brand-500">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
