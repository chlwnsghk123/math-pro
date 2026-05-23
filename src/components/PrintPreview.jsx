import { Fragment, useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore.js';
import { buildImageUrl, CHAPTERS, parseProblemId } from '../config.js';
import ANSWERS from '../data/answers.js';
import AnswerText from './AnswerText.jsx';
import { IconBack, IconPrint } from './Icons.jsx';
import { useToastStore } from '../store/toastStore.js';

/** One problem per column, two columns per A4 page. */
const PROBLEMS_PER_PAGE = 2;
const RIGHT_CROP_PX = 10;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 12;

export default function PrintPreview({ onClose }) {
  const items = useCartStore((s) => s.items);
  const [title, setTitle] = useState(
    () => localStorage.getItem('math-pro:last-title') || '오답 노트',
  );
  const [generating, setGenerating] = useState(false);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    localStorage.setItem('math-pro:last-title', title);
  }, [title]);

  /** First problem of each category gets a chapter label. */
  const annotated = useMemo(() => annotateWithChapters(items), [items]);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < annotated.length; i += PROBLEMS_PER_PAGE) {
      chunks.push(annotated.slice(i, i + PROBLEMS_PER_PAGE));
    }
    return chunks;
  }, [annotated]);

  async function handleDownload() {
    if (generating) return;
    setGenerating(true);
    try {
      await generatePdf({ title });
      toast('PDF 저장 완료', { tone: 'success' });
    } catch (err) {
      console.error(err);
      toast('PDF 생성 중 오류가 발생했습니다', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-200">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-soft sm:px-6">
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
          onClick={handleDownload}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <Spinner /> 생성 중…
            </>
          ) : (
            <>
              <IconPrint className="h-4 w-4" /> PDF 저장
            </>
          )}
        </button>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 py-2 sm:hidden">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-brand-500"
        />
      </div>

      <div className="flex-1 overflow-auto py-6">
        <div className="mx-auto flex w-fit flex-col items-center gap-5 px-4">
          {pages.length === 0 ? (
            <div className="flex h-72 w-[210mm] max-w-full items-center justify-center rounded-md bg-white text-sm text-slate-500 shadow-card">
              선택된 문제가 없습니다.
            </div>
          ) : (
            <>
              {pages.map((chunk, pageIdx) => (
                <PreviewPage
                  key={pageIdx}
                  title={title}
                  showHeader={pageIdx === 0}
                  problems={chunk}
                />
              ))}
              <AnswerKeyPage annotated={annotated} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPage({ title, showHeader, problems }) {
  return (
    <article
      data-pdf-page
      className="bg-white shadow-card"
      style={pageStyle}
    >
      {showHeader && <HeaderBlock title={title} />}
      <div
        className="grid grid-cols-2 gap-x-[10mm]"
        style={{
          gridAutoRows: 'min-content',
          marginTop: showHeader ? '4mm' : 0,
          flex: 1,
        }}
      >
        {problems.map(({ id, chapter, category, number }) => (
          <ProblemSlot
            key={id}
            id={id}
            chapter={chapter}
            src={buildImageUrl(category, number)}
          />
        ))}
      </div>
    </article>
  );
}

const pageStyle = {
  width: `${PAGE_WIDTH_MM}mm`,
  minHeight: `${PAGE_HEIGHT_MM}mm`,
  padding: `${PAGE_PADDING_MM}mm`,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  color: '#0f172a',
};

function HeaderBlock({ title }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-slate-900 pb-2">
      <div className="text-[20pt] font-bold leading-tight text-slate-900">
        {title || '오답 노트'}
      </div>
      <div className="shrink-0 text-right text-[10pt] leading-7 text-slate-900">
        <div>
          Name
          <span className="ml-2 inline-block min-w-[42mm] border-b border-slate-700" />
        </div>
        <div>
          Date
          <span className="ml-2 inline-block min-w-[42mm] border-b border-slate-700" />
        </div>
      </div>
    </div>
  );
}

function ProblemSlot({ id, chapter, src }) {
  return (
    <div
      className="flex flex-col break-inside-avoid"
      style={{ paddingTop: '4mm', paddingBottom: '4mm' }}
    >
      {chapter && (
        <div className="mb-2 border-b border-slate-300 pb-1 text-[11pt] font-bold text-slate-900">
          {chapter}
        </div>
      )}
      <CroppedImage src={src} alt={id} cropRight={RIGHT_CROP_PX} />
    </div>
  );
}

function CroppedImage({ src, alt, cropRight }) {
  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        loading="eager"
        decoding="async"
        style={{
          display: 'block',
          width: `calc(100% + ${cropRight}px)`,
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

function AnswerKeyPage({ annotated }) {
  if (annotated.length === 0) return null;
  return (
    <article data-pdf-page className="bg-white shadow-card" style={pageStyle}>
      <div className="mb-4 flex items-end justify-between border-b border-slate-900 pb-2">
        <h2 className="text-[20pt] font-bold leading-tight text-slate-900">정답</h2>
        <div className="text-[10pt] text-slate-500">총 {annotated.length}문항</div>
      </div>
      <div
        style={{
          columnCount: 2,
          columnGap: '12mm',
        }}
      >
        {annotated.map((it, idx) => (
          <Fragment key={it.id}>
            {it.chapter && (
              <div
                style={{
                  fontSize: '12pt',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginTop: idx === 0 ? 0 : '10pt',
                  marginBottom: '5pt',
                  paddingBottom: '3pt',
                  borderBottom: '1.5px solid #0f172a',
                  breakAfter: 'avoid-column',
                  pageBreakAfter: 'avoid',
                }}
              >
                {it.chapter}
              </div>
            )}
            <div
              style={{
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                marginBottom: '4pt',
                fontSize: '11pt',
                lineHeight: 1.55,
                color: '#0f172a',
                display: 'flex',
                gap: '6pt',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: '#1d4ed8',
                  minWidth: '9mm',
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                {it.number}.
              </span>
              <span style={{ flex: 1 }}>
                <AnswerText value={ANSWERS[it.id]} />
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </article>
  );
}

/**
 * Annotate cart items in order. Each entry carries its parsed
 * category/number plus a `chapter` label that is non-null only on the
 * first item of each category (so the chapter heading is shown once
 * per category in both the problem pages and the answer key).
 */
function annotateWithChapters(items) {
  const seen = new Set();
  return items.map((id) => {
    const parsed = parseProblemId(id);
    const cat = parsed?.category;
    const isFirstOfChapter = cat && !seen.has(cat);
    if (isFirstOfChapter) seen.add(cat);
    return {
      id,
      category: cat,
      number: parsed?.number,
      chapter: isFirstOfChapter ? CHAPTERS[cat] || cat : null,
    };
  });
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}

/* =============================================================
 * PDF generation: capture each .pdf-page element via html2canvas
 * and assemble into an A4 PDF via jsPDF.
 * ============================================================= */
async function generatePdf({ title }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const pageEls = Array.from(document.querySelectorAll('[data-pdf-page]'));
  if (pageEls.length === 0) return;

  await waitForImages(pageEls);
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pageEls.length; i++) {
    const canvas = await html2canvas(pageEls[i], {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: pageEls[i].scrollWidth,
      windowHeight: pageEls[i].scrollHeight,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'FAST');
  }

  const safeName = (title || '오답 노트').replace(/[\\/:*?"<>|]/g, '_').trim();
  pdf.save(`${safeName}.pdf`);
}

function waitForImages(roots) {
  const imgs = roots.flatMap((r) => Array.from(r.querySelectorAll('img')));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }),
  );
}
