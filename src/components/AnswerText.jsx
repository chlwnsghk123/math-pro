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
 * answers. Same for `\binom → \dbinom`. This keeps the answer key tidy
 * even when the source data mixes both styles.
 */
export default function AnswerText({ value, className = '' }) {
  if (value == null || value === '') {
    return <span className={`text-slate-400 ${className}`}>—</span>;
  }
  const str = String(value);
  const parts = str.split(/(\$[^$]+\$)/g).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
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
      })}
    </span>
  );
}

function normalizeForDisplay(tex) {
  return tex
    .replace(/\\frac\b/g, '\\dfrac')
    .replace(/\\binom\b/g, '\\dbinom');
}
