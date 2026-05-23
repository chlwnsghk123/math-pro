import { Fragment, useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore.js';
import { buildImageUrl, CHAPTERS, parseProblemId } from '../config.js';
import ANSWERS from '../data/answers.js';
import AnswerText from './AnswerText.jsx';
import { IconBack, IconPrint } from './Icons.jsx';
import { useToastStore } from '../store/toastStore.js';

/* ─────────────────────────────────────────────────────────────────────
 * Page geometry (landscape A4)
 * ───────────────────────────────────────────────────────────────────── */
const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const PAGE_PADDING_MM = 12;
const PROBLEMS_PER_PAGE = 4; // 2×2 quadrants
const QUADRANT_GAP_MM = 6;

/**
 * Image renders at fixed default size; shrinks proportionally if too tall.
 * Sized to take 40% of the quadrant width and at most 80% of its height,
 * leaving the right/bottom whitespace for student work.
 *
 * Quadrant ≈ 133.5mm × 75mm (after page padding, header, gap):
 *   40% × 133.5 ≈ 53mm wide, 80% × 75 ≈ 60mm tall.
 */
const IMAGE_WIDTH_MM = 53;
const IMAGE_MAX_HEIGHT_MM = 60;
const RIGHT_CROP_PX = 40; // hidden by overflow wrapper

/* ─────────────────────────────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────────────────────────────── */
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

  /** Each page contains up to 4 problems from a single chapter. */
  const pages = useMemo(() => annotatePages(chunkByChapter(items, PROBLEMS_PER_PAGE)), [items]);

  /** Answer key list uses the chapter-first annotation per item (not per page). */
  const annotatedItems = useMemo(() => annotateWithChapters(items), [items]);

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
            <div
              className="flex h-72 items-center justify-center rounded-md bg-white text-sm text-slate-500 shadow-card"
              style={{ width: `${PAGE_WIDTH_MM}mm` }}
            >
              선택된 문제가 없습니다.
            </div>
          ) : (
            <>
              {pages.map((page, pageIdx) => (
                <ProblemPage
                  key={pageIdx}
                  title={title}
                  isFirstPage={pageIdx === 0}
                  chapter={page.chapter}
                  items={page.items}
                />
              ))}
              <AnswerKeyPage annotated={annotatedItems} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Pages
 * ───────────────────────────────────────────────────────────────────── */

function ProblemPage({ title, isFirstPage, chapter, items }) {
  return (
    <article data-pdf-page className="bg-white shadow-card" style={pageStyle}>
      <PageHeader isFirstPage={isFirstPage} title={title} chapter={chapter} />
      <QuadrantGrid items={items} />
    </article>
  );
}

const pageStyle = {
  width: `${PAGE_WIDTH_MM}mm`,
  height: `${PAGE_HEIGHT_MM}mm`,
  padding: `${PAGE_PADDING_MM}mm`,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  color: '#0f172a',
  overflow: 'hidden',
};

function PageHeader({ isFirstPage, title, chapter }) {
  return (
    <header
      style={{
        flexShrink: 0,
        marginBottom: '4mm',
        paddingBottom: '2mm',
        borderBottom: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        gap: '2mm',
      }}
    >
      {/* Title row — page 1 only, but the slot is always reserved so the
          quadrant grid below stays at the same height on every page. */}
      <div
        style={{
          height: '14mm',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '8mm',
        }}
      >
        {isFirstPage ? (
          <>
            <div
              style={{
                fontSize: '22pt',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1,
              }}
            >
              {title || '오답 노트'}
            </div>
            <div
              style={{
                fontSize: '10pt',
                textAlign: 'right',
                lineHeight: 1.7,
                color: '#0f172a',
              }}
            >
              <div>
                Name
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: '50mm',
                    borderBottom: '1px solid #475569',
                    marginLeft: '6pt',
                  }}
                />
              </div>
              <div>
                Date
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: '50mm',
                    borderBottom: '1px solid #475569',
                    marginLeft: '6pt',
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
      {/* Chapter row — always reserved; blank when this page continues a
          chapter that already started earlier. */}
      <div
        style={{
          fontSize: '14pt',
          fontWeight: 700,
          color: '#0f172a',
          height: '8mm',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {chapter || ' '}
      </div>
    </header>
  );
}

function QuadrantGrid({ items }) {
  // Always render a 2x2 grid; empty slots stay blank so layout is consistent
  const slots = [0, 1, 2, 3].map((i) => items[i] || null);
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: `${QUADRANT_GAP_MM}mm`,
        minHeight: 0,
      }}
    >
      {slots.map((id, idx) => (
        <Quadrant key={idx} id={id} />
      ))}
    </div>
  );
}

function Quadrant({ id }) {
  if (!id) {
    return <div />;
  }
  const parsed = parseProblemId(id);
  if (!parsed) return <div />;
  const src = buildImageUrl(parsed.category, parsed.number);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        overflow: 'hidden',
      }}
    >
      <ProblemImageBox src={src} alt={id} />
    </div>
  );
}

/**
 * Image renders at fixed width IMAGE_WIDTH_MM; if its natural aspect would
 * exceed IMAGE_MAX_HEIGHT_MM, it shrinks uniformly so the height fits.
 * The right RIGHT_CROP_PX is hidden by an overflow wrapper.
 */
function ProblemImageBox({ src, alt }) {
  return (
    <div
      style={{
        width: `${IMAGE_WIDTH_MM}mm`,
        maxHeight: `${IMAGE_MAX_HEIGHT_MM}mm`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        loading="eager"
        decoding="async"
        style={{
          display: 'block',
          maxWidth: `calc(${IMAGE_WIDTH_MM}mm + ${RIGHT_CROP_PX}px)`,
          maxHeight: `${IMAGE_MAX_HEIGHT_MM}mm`,
          width: 'auto',
          height: 'auto',
          flexShrink: 0,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Answer key (landscape, 3 columns)
 * ───────────────────────────────────────────────────────────────────── */

function AnswerKeyPage({ annotated }) {
  if (annotated.length === 0) return null;
  return (
    <article data-pdf-page className="bg-white shadow-card" style={pageStyle}>
      <div
        style={{
          flexShrink: 0,
          marginBottom: '4mm',
          paddingBottom: '3mm',
          borderBottom: '1.5px solid #0f172a',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <h2 className="text-[20pt] font-bold leading-tight text-slate-900">정답</h2>
        <div className="text-[10pt] text-slate-500">총 {annotated.length}문항</div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          columnCount: 3,
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
                  marginTop: idx === 0 ? 0 : '8pt',
                  marginBottom: '4pt',
                  paddingBottom: '2pt',
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
                fontSize: '10.5pt',
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
                  minWidth: '8mm',
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

/* ─────────────────────────────────────────────────────────────────────
 * Helpers: chunk by chapter, then annotate page-level chapter heading
 * ───────────────────────────────────────────────────────────────────── */

function chunkByChapter(items, perPage) {
  const pages = [];
  let currentCategory = null;
  let chunk = [];
  for (const id of items) {
    const parsed = parseProblemId(id);
    const cat = parsed?.category;
    const needsNewPage = cat !== currentCategory || chunk.length >= perPage;
    if (needsNewPage && chunk.length > 0) {
      pages.push(chunk);
      chunk = [];
    }
    currentCategory = cat;
    chunk.push(id);
  }
  if (chunk.length > 0) pages.push(chunk);
  return pages;
}

function annotatePages(pages) {
  const seen = new Set();
  return pages.map((items) => {
    const cat = parseProblemId(items[0])?.category;
    const isFirstOfChapter = cat && !seen.has(cat);
    if (isFirstOfChapter) seen.add(cat);
    return {
      items,
      chapter: isFirstOfChapter ? CHAPTERS[cat] || cat : null,
    };
  });
}

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

/* ─────────────────────────────────────────────────────────────────────
 * PDF generation
 * ───────────────────────────────────────────────────────────────────── */

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
    orientation: 'landscape',
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
    if (i > 0) pdf.addPage('a4', 'landscape');
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
