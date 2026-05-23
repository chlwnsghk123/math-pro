import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore.js';
import { buildImageUrl, parseProblemId } from '../config.js';
import ANSWERS from '../data/answers.js';
import AnswerText from './AnswerText.jsx';
import { IconBack, IconPrint } from './Icons.jsx';

const PROBLEMS_PER_PAGE = 4; // 2 columns x 2 rows on A4 portrait

export default function PrintPreview({ onClose }) {
  const items = useCartStore((s) => s.items);
  const [title, setTitle] = useState(() => {
    return localStorage.getItem('math-pro:last-title') || '오답 노트';
  });

  useEffect(() => {
    localStorage.setItem('math-pro:last-title', title);
  }, [title]);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < items.length; i += PROBLEMS_PER_PAGE) {
      chunks.push(items.slice(i, i + PROBLEMS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  const totalPages = pages.length + (items.length > 0 ? 1 : 0); // +1 for answer key page

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas-muted">
      {/* Top toolbar - hidden when printing */}
      <header className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-soft sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <IconBack className="h-4 w-4" /> 돌아가기
        </button>

        <div className="hidden flex-1 items-center justify-center sm:flex">
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-brand-500">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              제목
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 6월 모의고사 오답노트"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary"
        >
          <IconPrint className="h-4 w-4" /> 인쇄 / PDF 저장
        </button>
      </header>

      {/* Mobile title input */}
      <div className="no-print border-b border-slate-100 bg-white px-4 py-2 sm:hidden">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-brand-500"
        />
      </div>

      {/* Preview canvas */}
      <div className="no-print flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-[820px] space-y-6">
          {pages.length === 0 ? (
            <div className="card flex h-72 items-center justify-center text-sm text-slate-500">
              선택된 문제가 없습니다.
            </div>
          ) : (
            <>
              {pages.map((chunk, pageIdx) => (
                <PreviewPage
                  key={pageIdx}
                  title={title}
                  pageNumber={pageIdx + 1}
                  totalPages={totalPages}
                  problems={chunk}
                />
              ))}
              <AnswerKeyPreview
                title={title}
                items={items}
                pageNumber={totalPages}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </div>

      {/* Hidden actual print output */}
      <PrintRoot title={title} pages={pages} items={items} />
    </div>
  );
}

function PreviewPage({ title, pageNumber, totalPages, problems }) {
  return (
    <div className="bg-white shadow-card ring-1 ring-slate-100" style={pageStyle}>
      <PageInner title={title} problems={problems} pageNumber={pageNumber} totalPages={totalPages} />
    </div>
  );
}

const pageStyle = {
  width: '210mm',
  minHeight: '297mm',
  maxWidth: '100%',
  padding: '10mm',
  margin: '0 auto',
  boxSizing: 'border-box',
};

function PageInner({ title, problems, pageNumber, totalPages }) {
  return (
    <div className="flex h-full min-h-[calc(297mm-20mm)] flex-col">
      <HeaderBlock title={title} />
      <div
        className="mt-2 grid flex-1 grid-cols-2 gap-x-[10mm]"
        style={{ gridAutoRows: 'min-content' }}
      >
        {problems.map((id) => {
          const parsed = parseProblemId(id);
          return (
            <div key={id} className="break-inside-avoid pt-2 pb-3">
              <div className="mb-1 text-[11pt] font-bold text-slate-900">{id}</div>
              <img
                src={buildImageUrl(parsed.category, parsed.number)}
                alt={`${id} 문제`}
                loading="lazy"
                className="block h-auto w-full object-contain"
              />
            </div>
          );
        })}
      </div>
      <FooterBlock pageNumber={pageNumber} totalPages={totalPages} />
    </div>
  );
}

function HeaderBlock({ title }) {
  return (
    <div className="flex items-end justify-between border-b border-slate-900 pb-1.5">
      <div className="text-[16pt] font-bold text-slate-900">{title || '오답 노트'}</div>
      <div className="text-right text-[10pt] leading-6 text-slate-900">
        <div>
          Name <span className="inline-block min-w-[110px] border-b border-slate-900" />
        </div>
        <div>
          Date <span className="inline-block min-w-[110px] border-b border-slate-900" />
        </div>
      </div>
    </div>
  );
}

function FooterBlock({ pageNumber, totalPages }) {
  return (
    <div className="mt-2 text-center text-[9pt] text-slate-500">
      {pageNumber} / {totalPages}
    </div>
  );
}

function AnswerKeyPreview({ title, items, pageNumber, totalPages }) {
  return (
    <div className="bg-white shadow-card ring-1 ring-slate-100" style={pageStyle}>
      <div className="flex h-full min-h-[calc(297mm-20mm)] flex-col">
        <HeaderBlock title={title} />
        <h2 className="my-6 text-center text-[16pt] font-bold text-slate-900">정답지</h2>
        <AnswerKeyTables items={items} />
        <FooterBlock pageNumber={pageNumber} totalPages={totalPages} />
      </div>
    </div>
  );
}

function AnswerKeyTables({ items }) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <div className="grid flex-1 grid-cols-2 gap-x-[10mm]">
      <AnswerTable items={left} />
      <AnswerTable items={right} />
    </div>
  );
}

function AnswerTable({ items }) {
  if (items.length === 0) return <div />;
  return (
    <table className="w-full border-collapse text-[10pt]">
      <thead>
        <tr>
          <th className="w-[40%] border border-slate-900 bg-slate-100 px-2 py-1.5 text-left font-bold">
            문항
          </th>
          <th className="border border-slate-900 bg-slate-100 px-2 py-1.5 text-left font-bold">
            정답
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((id) => (
          <tr key={id}>
            <td className="border border-slate-900 px-2 py-1.5 font-semibold text-slate-900">
              {id}
            </td>
            <td className="border border-slate-900 px-2 py-1.5 text-slate-900">
              <AnswerText value={ANSWERS[id]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* =============================================================
 * Hidden print root - this is what actually prints
 * ============================================================= */
function PrintRoot({ title, pages, items }) {
  if (items.length === 0) return null;
  const totalPages = pages.length + 1;
  return (
    <div id="print-root" className="print-only">
      {pages.map((chunk, idx) => (
        <section key={idx} className="print-page">
          <div className="print-header">
            <div className="print-title">{title || '오답 노트'}</div>
            <div className="print-meta">
              <div>
                Name <span className="line" />
              </div>
              <div>
                Date <span className="line" />
              </div>
            </div>
          </div>

          <div className="print-grid">
            {chunk.map((id) => {
              const parsed = parseProblemId(id);
              return (
                <div key={id} className="print-problem">
                  <div className="num">{id}</div>
                  <img src={buildImageUrl(parsed.category, parsed.number)} alt={id} />
                </div>
              );
            })}
          </div>

          <div className="print-footer">
            {idx + 1} / {totalPages}
          </div>
        </section>
      ))}

      <section className="print-answers print-page">
        <div className="print-header">
          <div className="print-title">{title || '오답 노트'}</div>
          <div className="print-meta">
            <div>
              Name <span className="line" />
            </div>
            <div>
              Date <span className="line" />
            </div>
          </div>
        </div>
        <h2>정답지</h2>
        <PrintAnswerTables items={items} />
        <div className="print-footer">
          {totalPages} / {totalPages}
        </div>
      </section>
    </div>
  );
}

function PrintAnswerTables({ items }) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10mm',
      }}
    >
      <PrintAnswerTable items={left} />
      <PrintAnswerTable items={right} />
    </div>
  );
}

function PrintAnswerTable({ items }) {
  if (items.length === 0) return <div />;
  return (
    <table className="answers-table">
      <thead>
        <tr>
          <th style={{ width: '40%' }}>문항</th>
          <th>정답</th>
        </tr>
      </thead>
      <tbody>
        {items.map((id) => (
          <tr key={id}>
            <td>{id}</td>
            <td>
              <AnswerText value={ANSWERS[id]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
