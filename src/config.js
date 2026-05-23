export const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || 'chlwnsghk123';
export const REPO_NAME = import.meta.env.VITE_REPO_NAME || 'math-pro';
export const REPO_BRANCH = import.meta.env.VITE_REPO_BRANCH || 'main';
export const IMAGE_BASE_PATH = import.meta.env.VITE_IMAGE_BASE_PATH || 'images';

/**
 * Display category labels (no zero padding).
 * Folders on disk are zero-padded to 2 digits (e.g. "07"); see buildImageUrl.
 */
export const CATEGORIES = ['7', '8', '9', '10', '11', '12'];

/**
 * Chapter title shown on the first problem of each category in the print
 * output. Key is the display category (`CATEGORIES`).
 */
export const CHAPTERS = {
  '7': '07 여러 가지 방정식',
  '8': '08 일차부등식과 연립일차부등식',
  '9': '09 이차부등식과 연립이차부등식',
  '10': '10 순열',
  '11': '11 조합',
  '12': '12 행렬',
};

function padCategory(category) {
  return String(category).padStart(2, '0');
}

export function buildImageUrl(category, number) {
  const folder = padCategory(category);
  const filename = String(number).padStart(3, '0');
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${IMAGE_BASE_PATH}/${folder}/${filename}.png`;
}

export function parseProblemId(id) {
  if (typeof id !== 'string') return null;
  const match = id.trim().match(/^(\d{1,2})-(\d{1,3})$/);
  if (!match) return null;
  const category = String(Number(match[1]));
  const number = Number(match[2]);
  if (!CATEGORIES.includes(category)) return null;
  return { category, number };
}

export function formatProblemId(category, number) {
  return `${category}-${number}`;
}

export function compareProblemIds(a, b) {
  const pa = parseProblemId(a);
  const pb = parseProblemId(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa.category !== pb.category) return Number(pa.category) - Number(pb.category);
  return pa.number - pb.number;
}
