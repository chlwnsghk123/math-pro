// One-off validator: ensures every $…$ segment in answers.js is valid KaTeX
// and that delimiters are balanced. Mirrors AnswerText's normalize + split.
import katex from 'katex';
import ANSWERS from '../src/data/answers.js';

function normalize(tex) {
  return tex.replace(/\\frac\b/g, '\\dfrac').replace(/\\binom\b/g, '\\dbinom');
}

let errors = 0;
let mathSegments = 0;
for (const [id, value] of Object.entries(ANSWERS)) {
  const str = String(value);
  const dollars = (str.match(/\$/g) || []).length;
  if (dollars % 2 !== 0) {
    console.error(`[${id}] unbalanced $ (count=${dollars})`);
    errors++;
  }
  for (const part of str.split(/(\$[^$]+\$)/g)) {
    const m = part.match(/^\$([^$]+)\$$/);
    if (!m) continue;
    mathSegments++;
    try {
      katex.renderToString(normalize(m[1]), { throwOnError: true });
    } catch (e) {
      console.error(`[${id}] KaTeX error in "${m[1]}": ${e.message.split('\n')[0]}`);
      errors++;
    }
  }
}

console.log(`Checked ${Object.keys(ANSWERS).length} answers, ${mathSegments} math segments.`);
console.log(errors === 0 ? 'OK — all KaTeX valid.' : `FAILED — ${errors} problem(s).`);
process.exit(errors === 0 ? 0 : 1);
