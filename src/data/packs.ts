import seed from './words.seed.json';
import type { Difficulty, WordPack, WordPair } from '@/engine/types';
import { pick, type Rng } from '@/engine/rng';

interface SeedPack {
  id: string;
  name: string;
  emoji: string;
  author: string;
  pairs: { civilian: string; undercover: string; difficulty?: string }[];
}

function asDifficulty(d: string | undefined): Difficulty {
  return d === 'easy' || d === 'hard' ? d : 'normal';
}

/** Bundled, read-only seed packs (PRD §3.6 Layer 1). */
export const BUNDLED_PACKS: WordPack[] = (seed.packs as SeedPack[]).map((p) => ({
  id: p.id,
  name: p.name,
  emoji: p.emoji,
  author: p.author,
  pairs: p.pairs.map((pair) => ({
    civilian: pair.civilian,
    undercover: pair.undercover,
    difficulty: asDifficulty(pair.difficulty),
  })),
}));

export function getPack(id: string, extra: WordPack[] = []): WordPack | undefined {
  return [...BUNDLED_PACKS, ...extra].find((p) => p.id === id);
}

/** All pairs across all bundled packs — used by the "Random" pack option. */
export function allPairs(): WordPair[] {
  return BUNDLED_PACKS.flatMap((p) => p.pairs);
}

/**
 * Draw a pair from a pack matching the chosen difficulty.
 * Falls back gracefully when a pack has no pairs at that difficulty.
 */
export function drawPair(
  pool: WordPair[],
  difficulty: Difficulty,
  rng: Rng = Math.random,
): WordPair {
  const matching = pool.filter((p) => p.difficulty === difficulty);
  const usable = matching.length > 0 ? matching : pool;
  return pick(usable, rng);
}
