import { InlineMath } from 'react-katex';

/**
 * Renders an answer string. Supports mixed text + inline LaTeX delimited
 * by `$...$`.
 *
 * Examples:
 *   "4"                       → plain text
 *   "$\\dfrac{1}{2}$"         → single LaTeX span
 *   "x = $\\sqrt{2}$"         → text + LaTeX
 *
 * Normalization: `\frac` (text style) is rewritten to `\dfrac` (display
 * style) so fractions render at a consistent, readable size across all
 * answers. Same for `\binom → \dbinom`.
 *
 * `multiline`: splits the value into stacked blocks so display-style math
 * never overlaps neighbouring lines. Two split points are honoured:
 *   1. explicit newlines (`\n`) — used for step-by-step worked solutions
 *      (수능형 식 중심 풀이).
 *   2. `(1) … (2) …` sub-part markers separated by two-or-more spaces —
 *      the legacy multi-part answer style.
 * Use this in the answer-key page; leave it off for single-line slots
 * like the cart sidebar. `lineGap` (mm) tunes the gap between blocks.
 */
const SUBPART_SEPARATOR = /\s{2,}(?=\(\d+\))/g;

export default function AnswerText({ value, className = '', multiline = false, lineGap = 3 }) {
  if (value == null || value === '') {
    return <span className={`text-slate-400 ${className}`}>—</span>;
  }
  const str = String(value);
  const lines = multiline ? splitLines(str) : [collapseWhitespace(str)];

  if (lines.length <= 1) {
    return <span className={className}>{renderInline(lines[0] ?? str)}</span>;
  }

  // Each line is its own block. Block layout makes the row grow to fit any
  // display-style math inside it (no overlap with the previous or next
  // line); `lineGap` gives a consistent visual gap between steps.
  return (
    <span className={className}>
      {lines.map((line, idx) => (
        <span
          key={idx}
          style={{
            display: 'block',
            marginTop: idx > 0 ? `${lineGap}mm` : 0,
          }}
        >
          {renderInline(line)}
        </span>
      ))}
    </span>
  );
}

function splitLines(str) {
  const out = [];
  for (const raw of str.split('\n')) {
    const parts = raw.split(SUBPART_SEPARATOR);
    for (const p of parts) {
      if (p.trim().length > 0) out.push(p);
    }
  }
  return out.length > 0 ? out : [str];
}

/** Newlines collapse to spaces for single-line (non-multiline) rendering. */
function collapseWhitespace(str) {
  return str.replace(/\s*\n\s*/g, ' ');
}

/**
 * The final answer of a worked solution: the text after the last `∴`,
 * else the last non-empty line, else the value itself. Used where only
 * the conclusion fits (e.g. the cart row).
 */
export function extractFinalAnswer(value) {
  if (value == null || value === '') return value;
  const str = String(value);
  const idx = str.lastIndexOf('∴');
  if (idx >= 0) return str.slice(idx + 1).trim();
  const lines = str
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : str;
}

/**
 * An answer entry is either a plain string (the answer, no worked solution)
 * or `{ a, s }` where `a` is the final answer and `s` the step-by-step
 * solution. `answerOf` returns the answer-only view; `solutionOf` returns
 * the full solution (falling back to the answer when there are no steps).
 */
export function answerOf(value) {
  if (value == null) return value;
  if (typeof value === 'object') return value.a;
  return extractFinalAnswer(value);
}

export function solutionOf(value) {
  if (value == null) return value;
  if (typeof value === 'object') return value.s ?? value.a;
  return value;
}

function renderInline(str) {
  const parts = str.split(/(\$[^$]+\$)/g).filter(Boolean);
  return parts.map((part, idx) => {
    const m = part.match(/^\$([^$]+)\$$/);
    if (m) {
      const tex = normalizeForDisplay(m[1]);
      try {
        return <InlineMath key={idx} math={tex} />;
      } catch {
        return <span key={idx}>{part}</span>;
      }
    }
    return <span key={idx}>{part}</span>;
  });
}

function normalizeForDisplay(tex) {
  // Display-style fractions (`\dfrac`) so fraction sizes stay uniform
  // across the answer key. The vertical room they need is provided by
  // block-level line layout in `AnswerText` and a generous line-height
  // on the answer-key item — see PrintPreview.
  return tex
    .replace(/\\frac\b/g, '\\dfrac')
    .replace(/\\binom\b/g, '\\dbinom');
}
