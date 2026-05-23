export const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || 'chlwnsghk123';
export const REPO_NAME = import.meta.env.VITE_REPO_NAME || 'math-pro';
export const REPO_BRANCH = import.meta.env.VITE_REPO_BRANCH || 'main';
export const IMAGE_BASE_PATH = import.meta.env.VITE_IMAGE_BASE_PATH || 'images';

export const CATEGORIES = ['F', 'G', 'H', 'I', 'J'];

export function buildImageUrl(category, number) {
  const padded = String(number).padStart(3, '0');
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${IMAGE_BASE_PATH}/${category}/${padded}.png`;
}

export function parseProblemId(id) {
  if (typeof id !== 'string') return null;
  const match = id.trim().toUpperCase().match(/^([F-J])(\d+)$/);
  if (!match) return null;
  return { category: match[1], number: Number(match[2]) };
}

export function compareProblemIds(a, b) {
  const pa = parseProblemId(a);
  const pb = parseProblemId(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa.category !== pb.category) return pa.category.localeCompare(pb.category);
  return pa.number - pb.number;
}
