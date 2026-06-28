import type { WhiteMatch } from './types';

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
    .replace(/\s+/g, ' ');
}

/** strip a single trailing plural "s" (PRD §2.4: "ignores plural s") */
function depluralize(s: string): string {
  return s.endsWith('s') ? s.slice(0, -1) : s;
}

/** Levenshtein distance (iterative, O(n*m)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Does Mr. White's guess match the civilian word? (PRD §2.4)
 *  - exact:   normalized equality only
 *  - lenient: normalized + plural-insensitive (default)
 *  - fuzzy:   lenient + Levenshtein distance <= 1
 */
export function matchesCivilianWord(
  guess: string,
  civilianWord: string,
  mode: WhiteMatch = 'lenient',
): boolean {
  const g = normalize(guess);
  const w = normalize(civilianWord);
  if (g.length === 0) return false;
  if (g === w) return true;
  if (mode === 'exact') return false;

  // lenient + fuzzy both ignore plural
  if (depluralize(g) === depluralize(w)) return true;
  if (mode === 'lenient') return false;

  // fuzzy
  return levenshtein(depluralize(g), depluralize(w)) <= 1;
}
