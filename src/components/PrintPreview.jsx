import { useEffect, useMemo, useRef, useState } from 'react';
import { buildImageUrl, getCategory, parseProblemId } from '../data/catalog.js';
import ANSWERS from '../data/answers.js';
import AnswerText, { answerOf, solutionOf } from './AnswerText.jsx';
import { IconBack, IconChevronDown, IconPrint, IconSettings } from './Icons.jsx';
import { useNotebookStore } from '../store/notebookStore.js';

/* ─────────────────────────────────────────────────────────────────────
 * Design tokens (lifted from the Claude Design handoff bundle).
 * Pure greyscale palette + Pretendard Variable + IBM Plex Mono.
 * ───────────────────────────────────────────────────────────────────── */
const C = {
  paper: '#ffffff',
  ink: '#161616',
  ink2: '#3d3d3d',
  ink3: '#6f6f6f',
  ink4: '#a8a8a8',
  hair: '#cfcfcf',
  hairSoft: '#e2e2e2',
  stage: '#ecebe7',
  pen: '#1b2a63', // deep navy "pen ink" for the 손글씨 풀이 mode
};
const FONT_SANS =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
// Handwriting stack for the optional 손글씨 풀이 mode. Gaegu (a legible Korean
// handwriting font) first; Pretendard catches glyphs Gaegu lacks (∴, →, ①–⑤…)
// so nothing turns into tofu. KaTeX math is handled separately in index.css.
const FONT_HAND = '"Gaegu", "Pretendard Variable", Pretendard, sans-serif';

/* Page geometry */
const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const PROBLEMS_PER_PAGE = 4;

export default function PrintPreview({ notebook, onClose }) {
  const updateNotebook = useNotebookStore((s) => s.update);

  // Edits to the cover fields are written straight back to the notebook
  // so the saved snapshot stays in sync. The notebook prop drives all
  // local values — there is no separate cart-derived state here anymore.
  const items = notebook.problemIds;
  const title = notebook.title;
  const studentName = notebook.studentName;
  const studentDate = notebook.studentDate;

  // The answer-sheet style — chosen per notebook from the 세부 설정 menu:
  //   'none'     → no answer sheet (problems only)
  //   'answer'   → final answers only
  //   'solution' → full 식 중심 풀이
  const solutionMode = ['none', 'answer', 'solution'].includes(notebook.solutionMode)
    ? notebook.solutionMode
    : 'solution';
  const handwriting = !!notebook.handwriting;
  // Layout mode for the answer pages (none has no pages).
  const answerMode = solutionMode === 'answer' ? 'answer' : 'solution';

  const setTitle = (v) => updateNotebook(notebook.id, { title: v });
  const setStudentName = (v) => updateNotebook(notebook.id, { studentName: v });
  const setStudentDate = (v) => updateNotebook(notebook.id, { studentDate: v });
  const setSolutionMode = (v) => updateNotebook(notebook.id, { solutionMode: v });
  const setHandwriting = (v) => updateNotebook(notebook.id, { handwriting: v });

  // Keep `body.is-printing` set for the WHOLE time the preview is open, not
  // just during window.print(). The @media print rules are scoped to that
  // class, so this has zero effect on the screen — but it means EVERY print
  // path (our button, Ctrl/Cmd+P, the mobile browser's own print/share menu)
  // produces the clean A4-landscape output instead of the raw app chrome.
  // On mobile the old toggle-at-click approach failed: the browser menu skips
  // our button, and the 6 s auto-restore fired before the OS finished
  // rendering — both leaked the app menus onto the page.
  useEffect(() => {
    const prevTitle = document.title;
    document.body.classList.add('is-printing');
    return () => {
      document.body.classList.remove('is-printing');
      document.title = prevTitle;
    };
  }, []);

  // The browser uses document.title as the default "Save as PDF" filename.
  // Keep it in sync with the cover fields so any print path names the file.
  useEffect(() => {
    document.title = buildFilename({ title, studentName, studentDate });
  }, [title, studentName, studentDate]);

  /** Problem pages: chunk by chapter, then split into pages of 4. */
  const pages = useMemo(() => annotatePages(chunkByChapter(items, PROBLEMS_PER_PAGE)), [items]);

  /** Answer key: one group per chapter, in cart order. */
  const answerGroups = useMemo(() => groupAnswerEntriesByChapter(items), [items]);

  // The string actually rendered for each id depends on the mode:
  // answers-only vs full worked solution.
  const valueFor = (id) =>
    answerMode === 'solution' ? solutionOf(ANSWERS[id]) : answerOf(ANSWERS[id]);

  /** Answer / solution pages, paginated so nothing clips off a sheet.
   *  Empty when the notebook is set to 답 없음 (problems only). */
  const answerPages = useMemo(
    () => (solutionMode === 'none' ? [] : paginateAnswerGroups(answerGroups, answerMode, valueFor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answerGroups, answerMode, solutionMode],
  );

  // The answer section must begin on an ODD page so that, when printed
  // double-sided, it lands on the front face of a fresh sheet. If the
  // problem pages end on an odd page (so the answer would start on an even
  // page), slip one intentionally-blank page in between.
  const needBlank = answerPages.length > 0 && pages.length % 2 === 1;
  const answerStart = pages.length + (needBlank ? 1 : 0);

  // Page numbering: problem pages + (optional blank) + answer/solution pages.
  const totalPages = answerStart + answerPages.length;

  function handleDownload() {
    // `body.is-printing` + document.title are already managed by the effects
    // above, so just open the browser's print dialog.
    window.print();
  }

  return (
    <div
      className="print-preview-root fixed inset-0 z-40 flex flex-col"
      style={{ background: C.stage, fontFamily: FONT_SANS }}
    >
      <header className="print-chrome sticky top-0 z-10 border-b border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <IconBack className="h-4 w-4" /> 돌아가기
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <SettingsMenu
              solutionMode={solutionMode}
              handwriting={handwriting}
              onSolutionMode={setSolutionMode}
              onHandwriting={setHandwriting}
            />
            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary"
            >
              <IconPrint className="h-4 w-4" /> 인쇄 / PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 px-4 pb-3 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
          <ToolbarField
            label="제목"
            value={title}
            onChange={setTitle}
            placeholder="예: 6월 모의고사 오답노트"
          />
          <ToolbarField
            label="이름"
            value={studentName}
            onChange={setStudentName}
            placeholder="비워두면 손글씨 칸"
          />
          <ToolbarField
            label="날짜"
            type="date"
            value={studentDate}
            onChange={setStudentDate}
          />
        </div>
        {/* Mobile browsers (esp. iOS) can't be forced into landscape from CSS,
            so nudge the user to pick it in the print sheet. */}
        <div className="px-4 pb-2.5 sm:hidden">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium leading-snug text-amber-700 ring-1 ring-amber-100">
            📄 인쇄 화면에서 용지 방향을 <b>가로</b>로 선택하세요. (모바일은 자동
            가로 설정이 안 될 수 있어요)
          </p>
        </div>
      </header>

      <div
        className="print-scroll flex-1 overflow-auto"
        style={{ padding: '40px 0 64px' }}
      >
        <div
          className="print-pages mx-auto flex w-fit flex-col items-center"
          style={{ gap: '40px' }}
        >
          {pages.length === 0 ? (
            <div
              style={{
                width: `${PAGE_WIDTH_MM}mm`,
                height: '160mm',
                background: C.paper,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11pt',
                color: C.ink3,
                boxShadow:
                  '0 1px 0 rgba(0,0,0,.04), 0 12px 32px -12px rgba(0,0,0,.18), 0 2px 6px -2px rgba(0,0,0,.06)',
              }}
            >
              선택된 문제가 없습니다.
            </div>
          ) : (
            <>
              {pages.map((page, pageIdx) => (
                <ProblemPage
                  key={pageIdx}
                  title={title}
                  studentName={studentName}
                  studentDate={studentDate}
                  isFirstPage={pageIdx === 0}
                  unitCode={page.unitCode}
                  unitName={page.unitName}
                  unitNameForFooter={page.unitNameForFooter}
                  items={page.items}
                  pageNumber={pageIdx + 1}
                  totalPages={totalPages}
                />
              ))}
              {needBlank && <BlankPage />}
              {answerPages.map((blocks, idx) => (
                <AnswerKeyPage
                  key={`ans-${idx}`}
                  blocks={blocks}
                  mode={answerMode}
                  handwriting={handwriting}
                  isFirst={idx === 0}
                  pageNumber={answerStart + idx + 1}
                  totalPages={totalPages}
                />
              ))}
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

const pageStyle = {
  width: `${PAGE_WIDTH_MM}mm`,
  height: `${PAGE_HEIGHT_MM}mm`,
  background: C.paper,
  position: 'relative',
  padding: '12mm 14mm 10mm',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  color: C.ink,
  fontFamily: FONT_SANS,
  fontFeatureSettings: '"ss01" on, "ss02" on, "calt" on',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  boxShadow:
    '0 1px 0 rgba(0,0,0,.04), 0 12px 32px -12px rgba(0,0,0,.18), 0 2px 6px -2px rgba(0,0,0,.06)',
};

/**
 * Intentionally-blank filler sheet so the answer section starts on an odd
 * page (front face) when printed double-sided. Carries the same
 * `[data-pdf-page]` tag so it occupies exactly one A4 sheet, and a faint
 * centred note that only reads as a watermark on screen / paper.
 */
function BlankPage() {
  return (
    <article
      data-pdf-page
      style={{
        ...pageStyle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '8pt',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: C.ink4,
        }}
      >
        이 페이지는 비워 둠
      </span>
    </article>
  );
}

function ProblemPage({
  title,
  studentName,
  studentDate,
  isFirstPage,
  unitCode,
  unitName,
  unitNameForFooter,
  items,
  pageNumber,
  totalPages,
}) {
  return (
    <article data-pdf-page style={pageStyle}>
      <PageHeader
        isFirstPage={isFirstPage}
        title={title}
        studentName={studentName}
        studentDate={studentDate}
        unitCode={unitCode}
        unitName={unitName}
      />
      <QuadrantGrid items={items} />
      <PageFooter
        unitCode={unitCode || ''}
        unitName={unitNameForFooter}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </article>
  );
}

function PageHeader({ isFirstPage, title, studentName, studentDate, unitCode, unitName }) {
  return (
    <header style={{ marginBottom: '4mm', flexShrink: 0 }}>
      {isFirstPage && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            // align-items: end so h1 + field-groups all bottom-align with
            // the row's border-bottom — the field underlines and the
            // container line collapse into one continuous horizontal rule
            // instead of three offset lines.
            alignItems: 'end',
            gap: '14mm',
            paddingBottom: 0,
            marginBottom: '4mm',
            borderBottom: `1px solid ${C.ink}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '22pt',
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 1.1,
              color: C.ink,
              paddingBottom: '1.5mm',
            }}
          >
            {title || '오답 노트'}
          </h1>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'end',
              gap: '12mm',
            }}
          >
            <FieldGroup label="Name" value={studentName} />
            <FieldGroup label="Date" value={formatKoreanDate(studentDate)} />
          </div>
        </div>
      )}

      {/* Unit row — fixed height on every page (blank when continuing) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5mm',
          height: '8mm',
        }}
      >
        {unitCode && (
          <>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: '8pt',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: C.ink4,
              }}
            >
              Unit
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: '11pt',
                fontWeight: 500,
                color: C.ink,
                letterSpacing: '-0.01em',
              }}
            >
              {unitCode}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '3mm',
                height: '1px',
                background: C.ink4,
                transform: 'translateY(-2px)',
              }}
            />
            <span
              style={{
                fontSize: '12pt',
                fontWeight: 700,
                color: C.ink,
                letterSpacing: '-0.015em',
              }}
            >
              {unitName}
            </span>
          </>
        )}
      </div>
    </header>
  );
}

function FieldGroup({ label, value }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'end',
        gap: '4mm',
        minWidth: '70mm',
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '8pt',
          textTransform: 'uppercase',
          letterSpacing: '0.28em',
          color: C.ink3,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          height: '6mm',
          borderBottom: `1px solid ${C.ink}`,
          display: 'flex',
          alignItems: 'flex-end',
          paddingLeft: '1mm',
          paddingBottom: '1mm',
          fontSize: '11pt',
          fontWeight: 500,
          color: C.ink,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {value || ''}
      </span>
    </div>
  );
}

function ToolbarField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-brand-500">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * 세부 설정 — a gear button that opens a popover with the answer-sheet
 * options (답 없음 / 답만 / 풀이) and the 손글씨 풀이 toggle.
 * ───────────────────────────────────────────────────────────────────── */
function SettingsMenu({ solutionMode, handwriting, onSolutionMode, onHandwriting }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const sheetOpts = [
    ['none', '답 없음'],
    ['answer', '답만'],
    ['solution', '풀이'],
  ];
  const hwDisabled = solutionMode === 'none';

  return (
    <div ref={ref} className="no-print relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="btn-ghost !px-3 !py-2 text-xs sm:text-sm"
      >
        <IconSettings className="h-4 w-4" />
        <span className="hidden sm:inline">세부 설정</span>
        <IconChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100">
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                답지
              </p>
              <div className="inline-flex w-full items-center rounded-xl bg-slate-100 p-0.5">
                {sheetOpts.map(([key, label]) => {
                  const active = solutionMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSolutionMode(key)}
                      aria-pressed={active}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                        active ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label
              className={`flex items-center justify-between gap-2 ${
                hwDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
              }`}
            >
              <span className="text-sm font-semibold text-slate-700">손글씨 풀이</span>
              <button
                type="button"
                role="switch"
                aria-checked={handwriting}
                disabled={hwDisabled}
                onClick={() => onHandwriting(!handwriting)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  handwriting && !hwDisabled ? 'bg-brand-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    handwriting ? 'left-[1.375rem]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
            <p className="text-[11px] leading-snug text-slate-400">
              손글씨 풀이는 답지(답만·풀이)를 손으로 쓴 듯한 글씨체로 인쇄합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** "2026-05-23" → "2026. 05. 23." Empty / invalid → empty string. */
function formatKoreanDate(iso) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[1]}. ${m[2]}. ${m[3]}.`;
}

function QuadrantGrid({ items }) {
  const slots = [0, 1, 2, 3].map((i) => items[i] || null);
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        borderTop: `1px solid ${C.ink}`,
        borderBottom: `1px solid ${C.hair}`,
        position: 'relative',
      }}
    >
      {slots.map((id, idx) => (
        <Cell key={idx} id={id} idx={idx} />
      ))}
    </div>
  );
}

function Cell({ id, idx }) {
  // 2×2 grid: cells 0,1 are top row; 0,2 are left column.
  const isLeftCol = idx % 2 === 0;
  const isTopRow = idx < 2;
  return (
    <div
      style={{
        position: 'relative',
        padding: '7mm 8mm 8mm 7mm',
        overflow: 'hidden',
        background: C.paper,
        display: 'flex',
        flexDirection: 'column',
        // Dashed cell outline drawn only on right/bottom of cells that
        // have a neighbour, so internal lines never double up.
        borderRight: isLeftCol ? `1px dashed ${C.hairSoft}` : 'none',
        borderBottom: isTopRow ? `1px dashed ${C.hairSoft}` : 'none',
      }}
    >
      {id && <ProblemImage id={id} />}
    </div>
  );
}

function ProblemImage({ id }) {
  const parsed = parseProblemId(id);
  if (!parsed) return null;
  const src = buildImageUrl(parsed.category, parsed.number);
  return (
    <img
      src={src}
      alt={id}
      crossOrigin="anonymous"
      loading="eager"
      decoding="async"
      style={{
        display: 'block',
        alignSelf: 'flex-start',
        maxWidth: '60%',
        maxHeight: '80%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        imageRendering: 'crisp-edges',
      }}
    />
  );
}

function PageFooter({ unitName, pageNumber, totalPages }) {
  // Bottom-left shows the unit name only (no "오답 노트" prefix).
  const left = unitName || '';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '6mm',
        left: '14mm',
        right: '14mm',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: FONT_MONO,
        fontSize: '7.5pt',
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: C.ink4,
      }}
    >
      <span>{left}</span>
      <span style={{ color: C.ink2, letterSpacing: '0.16em' }}>
        <b style={{ color: C.ink, fontWeight: 500 }}>{pad2(pageNumber)}</b>
        &nbsp;/&nbsp;{pad2(totalPages)}
      </span>
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/* ─────────────────────────────────────────────────────────────────────
 * Answer key (last page) — column-count: 2, one section per chapter
 * ───────────────────────────────────────────────────────────────────── */

/**
 * One answer/solution sheet. `blocks` is the pre-paginated list of header
 * / item blocks for this page (see paginateAnswerGroups). Consecutive
 * items under the same header are regrouped into a chunk so a chapter that
 * spills onto the next page just re-emits its header.
 */
function AnswerKeyPage({ blocks, mode, handwriting, isFirst, pageNumber, totalPages }) {
  const solution = mode === 'solution';
  const sectionTitle = solution ? '정답 및 풀이' : '정답';
  return (
    <article data-pdf-page style={pageStyle}>
      <header style={{ marginBottom: '4mm', flexShrink: 0 }}>
        <div style={{ paddingBottom: '5mm', borderBottom: `1px solid ${C.ink}` }}>
          <h1
            style={{
              margin: 0,
              fontSize: '22pt',
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: C.ink,
            }}
          >
            {sectionTitle}{isFirst ? '' : ' (계속)'}
          </h1>
        </div>
      </header>

      {/* Fixed-height column-count flow fills column-major, so item-height
          variance can't overflow a row the way a 2-col grid would. Pagination
          guarantees the page's content fits two columns. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '3mm 0',
          columnCount: 2,
          columnGap: solution ? '8mm' : '12mm',
        }}
      >
        {blocks.map((b, i) =>
          b.type === 'header' ? (
            <AnswerHeaderBlock key={`h${i}`} header={b} solution={solution} />
          ) : (
            <AnswerItemBlock key={b.id} item={b} solution={solution} handwriting={handwriting} />
          ),
        )}
      </div>

      <PageFooter
        unitCode={null}
        unitName={sectionTitle}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </article>
  );
}

/** Chapter header inside the answer/solution column flow. */
function AnswerHeaderBlock({ header, solution }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '4mm',
        borderBottom: `1.5px solid ${C.ink}`,
        paddingBottom: '1.5mm',
        marginBottom: '3mm',
        breakInside: 'avoid',
        breakAfter: 'avoid-column',
        pageBreakInside: 'avoid',
        wordBreak: 'keep-all',
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: solution ? '10pt' : '11pt',
          fontWeight: 600,
          color: C.ink,
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        {header.unitCode}
      </span>
      <span
        style={{
          fontSize: solution ? '10.5pt' : '11.5pt',
          fontWeight: 700,
          color: C.ink,
          letterSpacing: '-0.015em',
          wordBreak: 'keep-all',
        }}
      >
        {header.unitName}
      </span>
    </div>
  );
}

/** One answer / worked-solution entry inside the column flow. */
function AnswerItemBlock({ item, solution, handwriting }) {
  // Handwriting fonts read a touch smaller, so bump the size and open up the
  // line-height for legibility (the "손글씨" review). A deep pen-blue ink
  // evokes a handwritten key (and still prints dark on a B&W printer).
  const bodyPt = solution ? (handwriting ? '11.5pt' : '9pt') : handwriting ? '13pt' : '11pt';
  const numPt = solution ? (handwriting ? '11pt' : '8.5pt') : handwriting ? '12.5pt' : '10.5pt';
  const lineHeight = solution ? (handwriting ? 1.5 : 1.4) : handwriting ? 1.95 : 2.1;
  const lineGap = solution ? (handwriting ? 1.7 : 1.3) : 3;
  const ink = handwriting ? C.pen : C.ink;
  return (
    <div
      className={handwriting ? 'hw-ans' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: solution ? '7mm 1fr' : '9mm 1fr',
        alignItems: 'baseline',
        gap: '2mm',
        fontSize: bodyPt,
        color: ink,
        lineHeight,
        minWidth: 0,
        marginBottom: solution ? '3mm' : '4mm',
        paddingBottom: solution ? '3mm' : '4mm',
        borderBottom: `1px dashed ${C.hairSoft}`,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <span
        style={{
          fontFamily: handwriting ? FONT_HAND : FONT_MONO,
          fontWeight: handwriting ? 700 : 600,
          fontSize: numPt,
          color: ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {item.displayNumber}.
      </span>
      <span
        style={{
          fontFamily: handwriting ? FONT_HAND : undefined,
          fontWeight: handwriting ? 400 : 500,
          color: ink,
          letterSpacing: handwriting ? 0 : '-0.01em',
          minWidth: 0,
          wordBreak: 'keep-all',
          overflowWrap: 'anywhere',
        }}
      >
        <AnswerText value={item.value} multiline lineGap={lineGap} />
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Pagination + chapter helpers
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

/**
 * For each page, attach the unit header that should appear on it.
 * Only the FIRST page of a unit gets `unitCode`/`unitName` populated;
 * subsequent pages of the same unit show blank (but reserved) header.
 * `unitNameForFooter` is the unit name for the page footer (always set).
 */
function annotatePages(pages) {
  const seen = new Set();
  return pages.map((items) => {
    const parsed = parseProblemId(items[0]);
    const cat = parsed?.category;
    const entry = cat ? getCategory(cat) : null;
    const unitName = entry ? entry.unitName : null;
    const unitCode = entry ? entry.unitCode : null;
    const isFirstOfChapter = cat && !seen.has(cat);
    if (isFirstOfChapter) seen.add(cat);
    return {
      items,
      unitCode: isFirstOfChapter ? unitCode : null,
      unitName: isFirstOfChapter ? unitName : null,
      unitNameForFooter: unitName,
    };
  });
}

/**
 * Group answer-key entries by chapter, in cart order. Each entry's
 * `displayNumber` is the actual problem number from the ID
 * (e.g. `9-15` → 15), so the answer key matches the textbook's
 * original numbering instead of being re-indexed.
 */
function groupAnswerEntriesByChapter(items) {
  const groups = [];
  let current = null;
  for (const id of items) {
    const parsed = parseProblemId(id);
    if (!parsed) continue;
    if (!current || current.category !== parsed.category) {
      const entry = getCategory(parsed.category);
      current = {
        category: parsed.category,
        unitCode: entry ? entry.unitCode : parsed.category,
        unitName: entry ? entry.unitName : '',
        items: [],
      };
      groups.push(current);
    }
    current.items.push({ id, displayNumber: parsed.number });
  }
  return groups;
}

/* ─────────────────────────────────────────────────────────────────────
 * Answer / solution pagination
 *
 * The answer sheet used to be a single fixed page, which clipped once the
 * content (now multi-line 수능형 풀이) overran one sheet. We instead pack
 * header/item blocks into pages by an estimated height so each [data-pdf-
 * page] holds only what fits. Estimates are deliberately conservative —
 * over-estimating just wastes a little paper, while under-estimating would
 * clip a solution.
 * ───────────────────────────────────────────────────────────────────── */

// Usable height (mm) of ONE column on an answer sheet; two columns per page.
// The page budget is "both columns" minus a margin for the worst case where a
// tall item is pushed to the second column (column-major fill +
// break-inside: avoid). `used` below is the total mm stacked across columns.
const ANSWER_COLUMN_MM = 156;
const ANSWER_BUDGET_MM = ANSWER_COLUMN_MM * 2 - 54; // ≈ 258
const ANSWER_HEADER_MM = 12;

function paginateAnswerGroups(groups, mode, valueFor) {
  const pages = [];
  let page = [];
  let used = 0;
  const flush = () => {
    if (page.length) {
      pages.push(page);
      page = [];
      used = 0;
    }
  };
  for (const group of groups) {
    let needHeader = true;
    for (const it of group.items) {
      const value = valueFor(it.id);
      const itemMm = estimateItemMm(value, mode);
      const inc = (needHeader ? ANSWER_HEADER_MM : 0) + itemMm;
      if (used > 0 && used + inc > ANSWER_BUDGET_MM) {
        flush();
        needHeader = true;
      }
      if (needHeader) {
        page.push({ type: 'header', unitCode: group.unitCode, unitName: group.unitName });
        used += ANSWER_HEADER_MM;
        needHeader = false;
      }
      page.push({ type: 'item', id: it.id, displayNumber: it.displayNumber, value });
      used += itemMm;
    }
  }
  flush();
  return pages;
}

/**
 * Estimated FULL vertical height (mm) of one answer item. Pagination sums
 * these across all items + headers and compares to the two-column budget;
 * the column flow then fills column-major. Solution mode is 9 pt (smaller
 * per-line); fractions, roots and matrices add height.
 */
function estimateItemMm(value, mode) {
  const solution = mode === 'solution';
  const lines = estimateLines(value);
  const perLine = solution ? 4 : 6.5;
  let h = 3; // number row baseline
  for (const ln of lines) {
    let lh = perLine;
    if (/\\[dt]?frac|\\sqrt|\\[dt]?binom/.test(ln)) lh += solution ? 1.5 : 3;
    const rows = matrixRows(ln);
    if (rows) lh += rows * (solution ? 3.5 : 5);
    h += lh;
  }
  return h + 5; // bottom margin + padding + border
}

function estimateLines(value) {
  const str = String(value ?? '');
  if (!str) return ['—'];
  const out = [];
  for (const raw of str.split('\n')) {
    for (const part of raw.split(/\s{2,}(?=\(\d+\))/g)) {
      if (part.trim().length > 0) out.push(part);
    }
  }
  return out.length ? out : ['—'];
}

/** Total matrix rows referenced in a line (pmatrix/bmatrix), for height. */
function matrixRows(line) {
  let rows = 0;
  const re = /\\begin\{[bp]matrix\}([\s\S]*?)\\end\{[bp]matrix\}/g;
  let m;
  while ((m = re.exec(line))) {
    rows += (m[1].match(/\\\\/g) || []).length + 1;
  }
  return rows;
}

/* ─────────────────────────────────────────────────────────────────────
 * Print path — defer to the browser's native print pipeline.
 *
 * Capturing the DOM through html2canvas had two persistent problems:
 *   (1) hairlines on the page header were drawn at slightly offset y
 *       coordinates (sub-pixel rounding in the raster pipeline), and
 *   (2) KaTeX glyphs (esp. the minus sign and fraction bar) sometimes
 *       came out as blurry blobs in the resulting PNG.
 *
 * Letting the browser print straight from the DOM avoids both — the
 * lines and math are vector-rendered onto paper / the PDF backend.
 * `@media print` styles in src/styles/index.css hide the chrome and
 * make each `[data-pdf-page]` fill one A4 landscape sheet.
 *
 * We tweak `document.title` so the browser's "Save as PDF" dialog
 * pre-fills the filename as "제목-이름-날짜".
 * ───────────────────────────────────────────────────────────────────── */
/** "제목-이름-날짜" with each segment file-system-safe. Empty name leaves
 *  an empty middle segment, per spec. */
function buildFilename({ title, studentName, studentDate }) {
  const safe = (s) =>
    String(s || '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
  return `${safe(title) || '오답 노트'}-${safe(studentName)}-${safe(studentDate)}`;
}
