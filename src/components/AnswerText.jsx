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
 * is placed in its own block so display-style fractions never spill
 * into adjacent sub-parts. Use this in the answer-key page; leave it
 * off for single-line slots like the cart sidebar.
 */
const SUBPART_SEPARATOR = /\s{2,}(?=\(\d+\))/g;

export default function AnswerText({ value, className = '', multiline = false }) {
  if (value == null || value === '') {
    return <span className={`text-slate-400 ${className}`}>—</span>;
  }
  const str = String(value);
  const lines = multiline ? splitSubparts(str) : [str];

  if (lines.length <= 1) {
    return <span className={className}>{renderInline(lines[0] ?? str)}</span>;
  }

  // Each sub-part is its own block. Block layout makes the row grow to
  // fit any display-style math inside it (no overlap with the previous
  // or next sub-part), and the margin gives a consistent visual gap.
  return (
    <span className={className}>
      {lines.map((line, idx) => (
        <span
          key={idx}
          style={{
            display: 'block',
            marginTop: idx > 0 ? '3mm' : 0,
          }}
        >
          {renderInline(line)}
        </span>
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
  // Display-style fractions (`\dfrac`) so fraction sizes stay uniform
  // across the answer key. The vertical room they need is provided by
  // block-level sub-part layout in `AnswerText` and a generous
  // line-height on the answer-key item — see PrintPreview.
  return tex
    .replace(/\\frac\b/g, '\\dfrac')
    .replace(/\\binom\b/g, '\\dbinom');
}
