import { useEffect, useMemo, useState } from 'react';
import {
  buildImageUrl,
  buildSolutionUrl,
  CHAPTERS,
  parseProblemId,
  REPO_BRANCH,
  REPO_NAME,
  REPO_OWNER,
} from '../config.js';
import ANSWERS from '../data/answers.js';
import AnswerText from './AnswerText.jsx';
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

  const setTitle = (v) => updateNotebook(notebook.id, { title: v });
  const setStudentName = (v) => updateNotebook(notebook.id, { studentName: v });
  const setStudentDate = (v) => updateNotebook(notebook.id, { studentDate: v });


  /** Problem pages: chunk by chapter, then split into pages of 4. */
  const pages = useMemo(() => annotatePages(chunkByChapter(items, PROBLEMS_PER_PAGE)), [items]);

  /** Answer key: one group per chapter, in cart order. */
  const answerGroups = useMemo(() => groupAnswerEntriesByChapter(items), [items]);

  /** Auto-detected solution availability per category. `null` = loading. */
  const [solutionMap, setSolutionMap] = useState(null);
  useEffect(() => {
    const cats = new Set();
    for (const id of items) {
      const p = parseProblemId(id);
      if (p) cats.add(p.category);
    }
    fetchAvailableSolutions(Array.from(cats)).then(setSolutionMap);
  }, [items]);

  /** Problems that have a solution image — in cart order. */
  const itemsWithSolutions = useMemo(() => {
    if (!solutionMap) return [];
    return items.filter((id) => {
      const p = parseProblemId(id);
      return p && solutionMap[p.category]?.has(p.number);
    });
  }, [items, solutionMap]);

  /** Solution pages: same chunking as problems (≤4 per page, single-chapter). */
  const solutionPages = useMemo(
    () => annotateSolutionPages(chunkByChapter(itemsWithSolutions, PROBLEMS_PER_PAGE)),
    [itemsWithSolutions],
  );
  const hasSolutionSection = solutionPages.length > 0;

  // Page numbering: problem pages
  //                 + 1 풀이 divider page (if any solutions)
  //                 + solution pages
  //                 + 1 answer page (if any)
  const totalPages =
    pages.length +
    (hasSolutionSection ? 1 + solutionPages.length : 0) +
    (answerGroups.length > 0 ? 1 : 0);

  async function handleDownload() {
    await handleBrowserPrint({ title, studentName, studentDate });
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
          <button
            type="button"
            onClick={handleDownload}
            className="btn-primary"
          >
            <IconPrint className="h-4 w-4" /> 인쇄 / PDF
          </button>
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
                  key={`p-${pageIdx}`}
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
              {hasSolutionSection && (
                <SolutionDividerPage
                  pageNumber={pages.length + 1}
                  totalPages={totalPages}
                />
              )}
              {hasSolutionSection &&
                solutionPages.map((sp, idx) => (
                  <SolutionPage
                    key={`s-${idx}`}
                    items={sp.items}
                    unitCode={sp.unitCode}
                    unitName={sp.unitName}
                    pageNumber={pages.length + 2 + idx}
                    totalPages={totalPages}
                  />
                ))}
              {answerGroups.length > 0 && (
                <AnswerKeyPage
                  groups={answerGroups}
                  pageNumber={totalPages}
                  totalPages={totalPages}
                />
              )}
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

/* ─────────────────────────────────────────────────────────────────────
 * Solutions section — separate pages after the problem pages.
 * Each cell pairs a problem image with its hand-written solution
 * image (side by side). Only problems that actually have a solution
 * file uploaded under `solutions/<grade>/<number>.png` appear here.
 * ───────────────────────────────────────────────────────────────────── */

function SolutionPage({ items, unitCode, unitName, pageNumber, totalPages }) {
  return (
    <article data-pdf-page style={pageStyle}>
      <SolutionPageHeader unitCode={unitCode} unitName={unitName} />
      <SolutionGrid items={items} />
      <PageFooter
        unitCode={unitCode || ''}
        unitName="풀이"
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </article>
  );
}

function SolutionPageHeader({ unitCode, unitName }) {
  return (
    <header style={{ marginBottom: '4mm', flexShrink: 0 }}>
      {/* Reserved title row, blank — solution pages never carry the
          top-of-document title slot, only the unit row.  Keeping the
          slot reserved means the grid below sits at the same y as on
          problem pages. */}
      <div style={{ height: '14mm' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5mm',
          height: '8mm',
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
          풀이
        </span>
        {unitCode && (
          <>
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

function SolutionGrid({ items }) {
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
        <SolutionCell key={idx} id={id} idx={idx} />
      ))}
    </div>
  );
}

function SolutionCell({ id, idx }) {
  const isLeftCol = idx % 2 === 0;
  const isTopRow = idx < 2;
  if (!id) {
    return (
      <div
        style={{
          borderRight: isLeftCol ? `1px dashed ${C.hairSoft}` : 'none',
          borderBottom: isTopRow ? `1px dashed ${C.hairSoft}` : 'none',
        }}
      />
    );
  }
  const parsed = parseProblemId(id);
  if (!parsed) return <div />;
  const problemSrc = buildImageUrl(parsed.category, parsed.number);
  const solutionSrc = buildSolutionUrl(parsed.category, parsed.number);
  return (
    <div
      style={{
        position: 'relative',
        padding: '7mm 8mm 8mm 7mm',
        overflow: 'hidden',
        background: C.paper,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '5mm',
        borderRight: isLeftCol ? `1px dashed ${C.hairSoft}` : 'none',
        borderBottom: isTopRow ? `1px dashed ${C.hairSoft}` : 'none',
      }}
    >
      <img
        src={problemSrc}
        alt={id}
        crossOrigin="anonymous"
        loading="eager"
        decoding="async"
        style={{
          display: 'block',
          flexShrink: 0,
          maxWidth: '38%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          imageRendering: 'crisp-edges',
        }}
      />
      <img
        src={solutionSrc}
        alt={`${id} 풀이`}
        crossOrigin="anonymous"
        loading="eager"
        decoding="async"
        style={{
          display: 'block',
          flex: 1,
          minWidth: 0,
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          objectPosition: 'left top',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
}

function SolutionDividerPage({ pageNumber, totalPages }) {
  return (
    <article data-pdf-page style={pageStyle}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6mm',
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: '10pt',
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            color: C.ink4,
          }}
        >
          Solutions
        </div>
        <div
          style={{
            fontSize: '64pt',
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: C.ink,
            lineHeight: 1,
          }}
        >
          풀이
        </div>
        <div
          style={{
            width: '40mm',
            height: '1.5px',
            background: C.ink,
          }}
        />
      </div>
      <PageFooter
        unitCode={null}
        unitName="풀이"
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </article>
  );
}

function PageFooter({ unitCode, unitName, pageNumber, totalPages }) {
  const left = unitCode
    ? `오답 노트 · Unit ${unitCode}`
    : unitName
      ? `오답 노트 · ${unitName}`
      : '오답 노트';
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

function AnswerKeyPage({ groups, pageNumber, totalPages }) {
  return (
    <article data-pdf-page style={pageStyle}>
      <header style={{ marginBottom: '4mm', flexShrink: 0 }}>
        <div
          style={{
            paddingBottom: '6mm',
            borderBottom: `1px solid ${C.ink}`,
          }}
        >
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
            정답
          </h1>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          columnCount: 2,
          columnGap: '14mm',
          padding: '4mm 0',
          minHeight: 0,
        }}
      >
        {groups.map((group, idx) => (
          <AnswerGroup
            key={group.category}
            unitCode={group.unitCode}
            unitName={group.unitName}
            entries={group.items}
            isLast={idx === groups.length - 1}
          />
        ))}
      </div>

      <PageFooter
        unitCode={null}
        unitName="정답지"
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </article>
  );
}

function AnswerGroup({ unitCode, unitName, entries, isLast }) {
  return (
    <section
      style={{
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        marginBottom: isLast ? 0 : '10pt',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4mm',
          borderBottom: `1.5px solid ${C.ink}`,
          paddingBottom: '2mm',
          marginBottom: '4mm',
          breakAfter: 'avoid-column',
          pageBreakAfter: 'avoid',
          wordBreak: 'keep-all',
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: '11pt',
            fontWeight: 600,
            color: C.ink,
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
        >
          {unitCode}
        </span>
        <span
          style={{
            fontSize: '11.5pt',
            fontWeight: 700,
            color: C.ink,
            letterSpacing: '-0.015em',
            wordBreak: 'keep-all',
            flex: 1,
          }}
        >
          {unitName}
        </span>
      </header>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '10mm',
          rowGap: '5mm',
        }}
      >
        {entries.map(({ id, displayNumber }) => (
          <li
            key={id}
            style={{
              display: 'grid',
              gridTemplateColumns: '9mm 1fr',
              alignItems: 'baseline',
              gap: '3mm',
              fontSize: '11pt',
              color: C.ink,
              // Display-style fractions inline take ~2× normal line
              // height, so set lineHeight high enough that adjacent
              // inline math glyphs never crowd each other.
              lineHeight: 2.1,
              minWidth: 0,
              paddingBottom: '4mm',
              borderBottom: `1px dashed ${C.hairSoft}`,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontWeight: 600,
                fontSize: '10.5pt',
                color: C.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {displayNumber}.
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
              <AnswerText value={ANSWERS[id]} multiline />
            </span>
          </li>
        ))}
      </ol>
    </section>
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
    const unitName = CHAPTERS[cat] ? extractUnitName(CHAPTERS[cat]) : null;
    const unitCode = CHAPTERS[cat] ? extractUnitCode(CHAPTERS[cat]) : null;
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
 * For solution pages, every page shows the unit header (since the
 * solutions section is a self-contained block — the reader benefits
 * from seeing the unit at a glance on any sheet, not just the first).
 */
function annotateSolutionPages(pages) {
  return pages.map((items) => {
    const parsed = parseProblemId(items[0]);
    const cat = parsed?.category;
    const chapter = CHAPTERS[cat];
    return {
      items,
      unitCode: chapter ? extractUnitCode(chapter) : null,
      unitName: chapter ? extractUnitName(chapter) : '',
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
      const chapter = CHAPTERS[parsed.category] || parsed.category;
      current = {
        category: parsed.category,
        unitCode: extractUnitCode(chapter) || parsed.category,
        unitName: extractUnitName(chapter) || '',
        items: [],
      };
      groups.push(current);
    }
    current.items.push({ id, displayNumber: parsed.number });
  }
  return groups;
}

/** "09 이차부등식과 연립이차부등식" → "09" */
function extractUnitCode(chapter) {
  const m = chapter.match(/^(\d+)/);
  return m ? m[1] : null;
}
/** "09 이차부등식과 연립이차부등식" → "이차부등식과 연립이차부등식" */
function extractUnitName(chapter) {
  return chapter.replace(/^\d+\s+/, '');
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
async function handleBrowserPrint({ title, studentName, studentDate }) {
  const desiredName = buildFilename({ title, studentName, studentDate });

  // Wait for fonts + every preview image to be on screen before opening
  // the print dialog. Mobile browsers (Safari iOS, Chrome Android) often
  // snapshot the DOM the moment `window.print()` returns; if a font or
  // image hasn't loaded yet, that sheet prints with a fallback font or
  // a broken-image placeholder.
  await waitForFontsAndImages();

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

  // Allow one tick for `body.is-printing` styles to apply before the
  // browser snapshots the DOM for its print dialog.
  await new Promise((resolve) => setTimeout(resolve, 30));

  window.print();
}

async function waitForFontsAndImages() {
  const fontsReady =
    typeof document !== 'undefined' && document.fonts?.ready
      ? document.fonts.ready
      : Promise.resolve();

  const imgs = Array.from(document.querySelectorAll('[data-pdf-page] img'));
  const imageReady = Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          // Hard timeout — never block print for more than 5s on a
          // single slow image (e.g. a 404 on a hand-written solution).
          setTimeout(resolve, 5000);
        }),
    ),
  );

  await Promise.all([fontsReady, imageReady]);
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

/* ─────────────────────────────────────────────────────────────────────
 * Solution availability — GitHub Contents API
 *
 * Replaces the old `src/data/solutions.js` manifest. For each grade
 * present in the notebook, hit
 *   GET /repos/{owner}/{repo}/contents/solutions/{grade}?ref={branch}
 * once, parse `NNN.png` file names into a Set of numbers. Results are
 * cached in memory for the session.
 *
 * Rate limit note: unauthenticated GitHub API gives 60 requests / hour
 * per IP. With one request per grade per notebook open, a typical user
 * stays well under that.
 * ───────────────────────────────────────────────────────────────────── */
const _solutionCache = new Map(); // category → Promise<Set<number>>

function fetchAvailableSolutions(categories) {
  const result = {};
  return Promise.all(
    categories.map(async (cat) => {
      if (!_solutionCache.has(cat)) {
        _solutionCache.set(cat, loadSolutionsForCategory(cat));
      }
      result[cat] = await _solutionCache.get(cat);
    }),
  ).then(() => result);
}

async function loadSolutionsForCategory(cat) {
  const folder = String(cat).padStart(2, '0');
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/solutions/${folder}?ref=${REPO_BRANCH}`;
  const numbers = new Set();
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return numbers;
    const files = await res.json();
    if (!Array.isArray(files)) return numbers;
    for (const f of files) {
      const m = typeof f?.name === 'string' && f.name.match(/^(\d{3})\.png$/i);
      if (m) numbers.add(Number(m[1]));
    }
  } catch {
    // Network / CORS / quota — silently treat as "no solutions known".
  }
  return numbers;
}
