import type { Difficulty } from './types';

/**
 * Default role distribution table (PRD §2.5).
 * Index by player count; returns counts for a balanced game.
 * Imposters hold ~1/3 of the table; civilians keep a strict majority.
 */
export interface Distribution {
  civilians: number;
  undercover: number;
  white: number;
}

const TABLE: Record<number, Distribution> = {
  3: { civilians: 2, undercover: 1, white: 0 },
  4: { civilians: 3, undercover: 1, white: 0 },
  5: { civilians: 3, undercover: 1, white: 1 },
  6: { civilians: 4, undercover: 1, white: 1 },
  7: { civilians: 4, undercover: 2, white: 1 },
  8: { civilians: 5, undercover: 2, white: 1 },
  9: { civilians: 6, undercover: 2, white: 1 },
  10: { civilians: 6, undercover: 3, white: 1 },
  11: { civilians: 7, undercover: 3, white: 1 },
  12: { civilians: 7, undercover: 3, white: 2 },
  13: { civilians: 8, undercover: 3, white: 2 },
  14: { civilians: 8, undercover: 4, white: 2 },
  15: { civilians: 9, undercover: 4, white: 2 },
  16: { civilians: 10, undercover: 4, white: 2 },
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export function defaultDistribution(playerCount: number): Distribution {
  const clamped = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, playerCount));
  return { ...TABLE[clamped] };
}

/**
 * Validate a custom distribution against the hard constraints (PRD §2.5):
 * - civilians >= undercover + white + 1  (strict majority)
 * - at least 1 civilian and at least 1 imposter
 */
export function validateCounts(
  playerCount: number,
  undercover: number,
  white: number,
): { ok: boolean; reason?: string } {
  if (playerCount < MIN_PLAYERS) return { ok: false, reason: `Need at least ${MIN_PLAYERS} players.` };
  if (playerCount > MAX_PLAYERS) return { ok: false, reason: `Max ${MAX_PLAYERS} players.` };
  if (undercover < 0 || white < 0) return { ok: false, reason: 'Counts cannot be negative.' };

  const imposters = undercover + white;
  const civilians = playerCount - imposters;

  if (imposters < 1) return { ok: false, reason: 'Need at least 1 imposter.' };
  if (civilians < 1) return { ok: false, reason: 'Need at least 1 civilian.' };
  if (civilians < imposters + 1) {
    return { ok: false, reason: 'Civilians must outnumber imposters.' };
  }
  return { ok: true };
}

/** Difficulty options exposed in the UI. */
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
