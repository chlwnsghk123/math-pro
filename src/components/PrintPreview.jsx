import { useMemo } from 'react';
import { buildImageUrl, getCategory, parseProblemId } from '../data/catalog.js';
import ANSWERS from '../data/answers.js';
import AnswerText, { answerOf, solutionOf } from './AnswerText.jsx';
import { IconBack, IconPrint } from './Icons.jsx';
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
};
const FONT_SANS =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

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

  // The answer-key style: 'answer' (final answers only) or 'solution' (full
  // 식 중심 풀이). Chosen per notebook, editable from the toolbar below.
  const answerMode = notebook.solutionMode === 'answer' ? 'answer' : 'solution';

  const setTitle = (v) => updateNotebook(notebook.id, { title: v });
  const setStudentName = (v) => updateNotebook(notebook.id, { studentName: v });
  const setStudentDate = (v) => updateNotebook(notebook.id, { studentDate: v });
  const setAnswerMode = (v) => updateNotebook(notebook.id, { solutionMode: v });

  /** Problem pages: chunk by chapter, then split into pages of 4. */
  const pages = useMemo(() => annotatePages(chunkByChapter(items, PROBLEMS_PER_PAGE)), [items]);

  /** Answer key: one group per chapter, in cart order. */
  const answerGroups = useMemo(() => groupAnswerEntriesByChapter(items), [items]);

  // The string actually rendered for each id depends on the mode:
  // answers-only vs full worked solution.
  const valueFor = (id) =>
    answerMode === 'solution' ? solutionOf(ANSWERS[id]) : answerOf(ANSWERS[id]);

  /** Answer / solution pages, paginated so nothing clips off a sheet. */
  const answerPages = useMemo(
    () => paginateAnswerGroups(answerGroups, answerMode, valueFor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answerGroups, answerMode],
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
    handleBrowserPrint({ title, studentName, studentDate });
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
            <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
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

/** Segmented toggle: 답만 (answers only) vs 풀이 (full worked solutions). */
function AnswerModeToggle({ value, onChange }) {
  const opts = [
    ['answer', '답만'],
    ['solution', '풀이'],
  ];
  return (
    <div
      className="no-print inline-flex items-center rounded-xl bg-slate-100 p-0.5"
      role="group"
      aria-label="답지 유형"
    >
      {opts.map(([key, label]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              active ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        );
      })}
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
function AnswerKeyPage({ blocks, mode, isFirst, pageNumber, totalPages }) {
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
            <AnswerItemBlock key={b.id} item={b} solution={solution} />
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
function AnswerItemBlock({ item, solution }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: solution ? '7mm 1fr' : '9mm 1fr',
        alignItems: 'baseline',
        gap: '2mm',
        fontSize: solution ? '9pt' : '11pt',
        color: C.ink,
        // Compact rows hold inline display-fractions and need a tall
        // line-height; solution rows stack each step as its own block, so a
        // tight line-height packs more in.
        lineHeight: solution ? 1.4 : 2.1,
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
          fontFamily: FONT_MONO,
          fontWeight: 600,
          fontSize: solution ? '8.5pt' : '10.5pt',
          color: C.ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {item.displayNumber}.
      </span>
      <span
        style={{
          fontWeight: 500,
          color: C.ink,
          letterSpacing: '-0.01em',
          minWidth: 0,
          wordBreak: 'keep-all',
          overflowWrap: 'anywhere',
        }}
      >
        <AnswerText value={item.value} multiline lineGap={solution ? 1.3 : 3} />
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
function handleBrowserPrint({ title, studentName, studentDate }) {
  const desiredName = buildFilename({ title, studentName, studentDate });
  const prevTitle = document.title;
  document.title = desiredName;
  document.body.classList.add('is-printing');

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = prevTitle;
    document.body.classList.remove('is-printing');
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);

  // Some browsers don't reliably fire `afterprint`. Hard-restore after a
  // few seconds so the modified title/body class never leaks.
  setTimeout(restore, 6000);

  window.print();
}

/** "제목-이름-날짜" with each segment file-system-safe. Empty name leaves
 *  an empty middle segment, per spec. */
function buildFilename({ title, studentName, studentDate }) {
  const safe = (s) =>
    String(s || '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
  return `${safe(title) || '오답 노트'}-${safe(studentName)}-${safe(studentDate)}`;
}
