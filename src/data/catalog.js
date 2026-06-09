export const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || 'chlwnsghk123';
export const REPO_NAME = import.meta.env.VITE_REPO_NAME || 'math-pro';
export const REPO_BRANCH = import.meta.env.VITE_REPO_BRANCH || 'main';
export const IMAGE_BASE_PATH = import.meta.env.VITE_IMAGE_BASE_PATH || 'images';

/**
 * Books (문제집) — the top navigation level. Each book owns a set of catalog
 * categories. Add a new book here, tag its categories with `book: <id>`, and
 * the navigation picks it up automatically.
 */
export const BOOKS = [
  { id: 'pungsanja-light', name: '풍산자 라이트유형', subject: '공통수학(상)' },
  { id: 'basic-ssen', name: '베이직 쎈', subject: '공통수학(상)' },
];

/**
 * Catalog — the single source of truth for every category (= one tab,
 * one print chapter, one answer-key section).
 *
 *   book   : which BOOKS entry this category belongs to
 *   kind   : 'legacy'  → flat grade folders  images/<pad2(code)>/<pad3(n)>.png
 *            'lecture' → 단원 → 강 hierarchy  images/<folder>/<prefix><pad2(n)>.png
 *   group  : 단원 label inside the book (null = ungrouped) — drives the unit picker
 *
 * Display ids stay "{code}-{number}" (e.g. "9-30", "20-5", "4G-3"); the code
 * is matched against this catalog by parseProblemId.
 */
export const CATALOG = [
  // ── 풍산자 라이트유형 · 공통수학(상) (flat grade folders) ─────────────
  { code: '7', book: 'pungsanja-light', kind: 'legacy', tab: '7', group: null, unitCode: '07', unitName: '여러 가지 방정식' },
  { code: '8', book: 'pungsanja-light', kind: 'legacy', tab: '8', group: null, unitCode: '08', unitName: '일차부등식과 연립일차부등식' },
  { code: '9', book: 'pungsanja-light', kind: 'legacy', tab: '9', group: null, unitCode: '09', unitName: '이차부등식과 연립이차부등식' },
  { code: '10', book: 'pungsanja-light', kind: 'legacy', tab: '10', group: null, unitCode: '10', unitName: '순열' },
  { code: '11', book: 'pungsanja-light', kind: 'legacy', tab: '11', group: null, unitCode: '11', unitName: '조합' },
  { code: '12', book: 'pungsanja-light', kind: 'legacy', tab: '12', group: null, unitCode: '12', unitName: '행렬' },

  // ── 베이직 쎈 · 공통수학(상) — Ⅳ. 순열과 조합 ───────────────────────
  {
    code: '19', book: 'basic-ssen', kind: 'lecture', tab: '19강 경우의 수', group: 'Ⅳ. 순열과 조합',
    unitCode: '19강', unitName: '경우의 수',
    folder: 'IV_순열과조합/19강_경우의수', filePrefix: '유형',
  },
  {
    code: '20', book: 'basic-ssen', kind: 'lecture', tab: '20강 순열', group: 'Ⅳ. 순열과 조합',
    unitCode: '20강', unitName: '순열',
    folder: 'IV_순열과조합/20강_순열', filePrefix: '유형',
  },
  {
    code: '21', book: 'basic-ssen', kind: 'lecture', tab: '21강 조합', group: 'Ⅳ. 순열과 조합',
    unitCode: '21강', unitName: '조합',
    folder: 'IV_순열과조합/21강_조합', filePrefix: '유형',
  },
  {
    code: '4G', book: 'basic-ssen', kind: 'lecture', tab: 'Ⅳ 실전 기출', group: 'Ⅳ. 순열과 조합',
    unitCode: 'Ⅳ', unitName: '실전감각 UP (기출)',
    folder: 'IV_순열과조합/실전감각UP_기출', filePrefix: '실전',
  },

  // ── 베이직 쎈 · 공통수학(상) — Ⅴ. 행렬 ──────────────────────────────
  {
    code: '22', book: 'basic-ssen', kind: 'lecture', tab: '22강 행렬과 연산', group: 'Ⅴ. 행렬',
    unitCode: '22강', unitName: '행렬의 뜻과 연산',
    folder: 'V_행렬/22강_행렬의뜻과연산', filePrefix: '유형',
  },
  {
    code: '23', book: 'basic-ssen', kind: 'lecture', tab: '23강 행렬의 곱셈', group: 'Ⅴ. 행렬',
    unitCode: '23강', unitName: '행렬의 곱셈',
    folder: 'V_행렬/23강_행렬의곱셈', filePrefix: '유형',
  },
  {
    code: '5G', book: 'basic-ssen', kind: 'lecture', tab: 'Ⅴ 실전 기출', group: 'Ⅴ. 행렬',
    unitCode: 'Ⅴ', unitName: '실전감각 UP (기출)',
    folder: 'V_행렬/실전감각UP_기출', filePrefix: '실전',
  },
];

const BY_CODE = Object.fromEntries(CATALOG.map((c) => [c.code, c]));
const ORDER = Object.fromEntries(CATALOG.map((c, i) => [c.code, i]));
const BOOK_BY_ID = Object.fromEntries(BOOKS.map((b) => [b.id, b]));

/** All category codes in canonical order. */
export const CATEGORIES = CATALOG.map((c) => c.code);

/** Chapter label per code — "{unitCode} {unitName}". */
export const CHAPTERS = Object.fromEntries(
  CATALOG.map((c) => [c.code, `${c.unitCode} ${c.unitName}`]),
);

/** Look up the catalog entry for a category code (or null). */
export function getCategory(code) {
  return BY_CODE[code] || null;
}

/** Look up a book by id (or null). */
export function getBook(id) {
  return BOOK_BY_ID[id] || null;
}

/** The book id a category belongs to (or null). */
export function bookIdOf(code) {
  const entry = BY_CODE[code];
  return entry ? entry.book : null;
}

/** Catalog entries belonging to a book, in catalog order. */
export function categoriesForBook(bookId) {
  return CATALOG.filter((c) => c.book === bookId);
}

/**
 * A book's categories grouped by 단원 for the unit picker:
 * `[{ key, group, items: [entry…] }]`. `group` is null for ungrouped units.
 */
export function categoryGroupsForBook(bookId) {
  const groups = [];
  let cur = null;
  for (const c of categoriesForBook(bookId)) {
    const key = c.group || '__ungrouped';
    if (!cur || cur.key !== key) {
      cur = { key, group: c.group, items: [] };
      groups.push(cur);
    }
    cur.items.push(c);
  }
  return groups;
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

/** Percent-encode each path segment (folders contain Korean characters). */
function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function buildImageUrl(category, number) {
  const entry = BY_CODE[category];
  let path;
  if (entry && entry.kind === 'lecture') {
    path = `${IMAGE_BASE_PATH}/${entry.folder}/${entry.filePrefix}${pad(number, 2)}.png`;
  } else {
    // Legacy flat structure: images/<pad2(grade)>/<pad3(number)>.png
    path = `${IMAGE_BASE_PATH}/${pad(category, 2)}/${pad(number, 3)}.png`;
  }
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${encodePath(path)}`;
}

export function parseProblemId(id) {
  if (typeof id !== 'string') return null;
  const s = id.trim();
  const dash = s.lastIndexOf('-');
  if (dash <= 0 || dash === s.length - 1) return null;
  let category = s.slice(0, dash);
  const numStr = s.slice(dash + 1);
  if (!/^\d{1,3}$/.test(numStr)) return null;
  // Numeric codes are normalized ("07" → "7") so disk padding never leaks
  // into the display id; alphanumeric codes (e.g. "4G") pass through.
  if (/^\d+$/.test(category)) category = String(Number(category));
  if (!BY_CODE[category]) return null;
  return { category, number: Number(numStr) };
}

export function formatProblemId(category, number) {
  return `${category}-${number}`;
}

export function compareProblemIds(a, b) {
  const pa = parseProblemId(a);
  const pb = parseProblemId(b);
  if (!pa || !pb) return String(a).localeCompare(String(b));
  if (pa.category !== pb.category) {
    return (ORDER[pa.category] ?? 999) - (ORDER[pb.category] ?? 999);
  }
  return pa.number - pb.number;
}
