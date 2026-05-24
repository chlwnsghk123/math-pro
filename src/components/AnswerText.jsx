import { Fragment } from 'react';
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
 * `multiline`: when an answer contains multiple sub-parts written as
 * `(1) … (2) … (3) …` (separated by two-or-more spaces), each sub-part
 * is placed on its own line. Use this in places where vertical space is
 * available (the answer-key page); leave it off for single-line slots
 * like the cart sidebar.
 */
const SUBPART_SEPARATOR = /\s{2,}(?=\(\d+\))/g;

export default function AnswerText({ value, className = '', multiline = false }) {
  if (value == null || value === '') {
    return <span className={`text-slate-400 ${className}`}>—</span>;
  }
  const str = String(value);
  const lines = multiline ? splitSubparts(str) : [str];

  return (
    <span className={className}>
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {idx > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </span>
  );
}

function splitSubparts(str) {
  return str.split(SUBPART_SEPARATOR).filter((p) => p.length > 0);
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
  // Force text-style fractions (`\frac`) — `\dfrac` stacks numerator
  // and denominator at full size which spills into adjacent lines on
  // the answer key, especially when multiple fractions appear inline
  // (e.g. "2, 9/2, 1/2"). Text-style fits in normal line-height while
  // still being clearly legible, matching the original textbook style.
  return tex
    .replace(/\\dfrac\b/g, '\\frac')
    .replace(/\\dbinom\b/g, '\\binom');
}
