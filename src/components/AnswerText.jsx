import { InlineMath } from 'react-katex';

/**
 * Renders an answer string. Supports mixed text + inline LaTeX delimited by `$...$`.
 * Examples:
 *   "4"                       → plain text
 *   "$\\dfrac{1}{2}$"         → single LaTeX span
 *   "x = $\\sqrt{2}$"         → text + LaTeX
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
          try {
            return <InlineMath key={idx} math={m[1]} />;
          } catch {
            return <span key={idx}>{part}</span>;
          }
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
