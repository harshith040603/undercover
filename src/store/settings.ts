import type { GameRules } from '@/engine/types';

const SETTINGS_KEY = 'undercover.settings';

/** Persisted, app-wide default rules (PRD §3.2 localStorage). */
export const DEFAULT_RULES: GameRules = {
  blindCounts: true, // PRD §2.8: max paranoia, default ON
  oneWordMode: false,
  debateSeconds: 75,
  perTurnSeconds: null,
  tieRule: 'revote',
  whiteMatch: 'lenient',
  sound: false, // off by default for quiet rooms
  haptics: true,
};

export function loadRules(): GameRules {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_RULES };
    return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export function saveRules(rules: GameRules): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(rules));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
