import { create } from 'zustand';
import type {
  Action,
  Difficulty,
  GameConfig,
  GameRules,
  GameState,
} from '@/engine/types';
import { reducer } from '@/engine/engine';
import { BUNDLED_PACKS, drawPair, getPack, allPairs } from '@/data/packs';
import { DEFAULT_RULES, loadRules, saveRules } from './settings';

const ACTIVE_KEY = 'undercover.activeGame';

function persist(game: GameState | null) {
  try {
    if (game) localStorage.setItem(ACTIVE_KEY, JSON.stringify(game));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

function loadActive(): GameState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    // Don't resume a finished game.
    return g.phase === 'gameOver' ? null : g;
  } catch {
    return null;
  }
}

export interface SetupDraft {
  names: string[];
  packId: string; // 'random' or a pack id
  difficulty: Difficulty;
  undercover: number;
  white: number;
  /** player count the undercover/white counts were derived for (auto-sync guard) */
  countFor: number;
}

interface Store {
  game: GameState | null;
  rules: GameRules;
  draft: SetupDraft;

  // setup
  setDraft: (patch: Partial<SetupDraft>) => void;
  setRules: (patch: Partial<GameRules>) => void;
  resetDraft: () => void;

  // engine
  dispatch: (action: Action) => void;
  startGame: () => void;
  playAgainSameCrew: () => void;
  quit: () => void;
}

const DEFAULT_DRAFT: SetupDraft = {
  names: ['', '', ''],
  packId: 'random',
  difficulty: 'normal',
  undercover: 1,
  white: 0,
  countFor: 0, // 0 forces a re-sync on first visit to the roles screen
};

function buildConfig(draft: SetupDraft, rules: GameRules): GameConfig {
  return {
    packId: draft.packId,
    difficulty: draft.difficulty,
    counts: { undercover: draft.undercover, white: draft.white },
    rules,
  };
}

function pairPool(packId: string) {
  if (packId === 'random') return allPairs();
  const pack = getPack(packId, BUNDLED_PACKS) ?? BUNDLED_PACKS[0];
  return pack.pairs;
}

export const useGame = create<Store>((set, get) => ({
  game: loadActive(),
  rules: loadRules(),
  draft: { ...DEFAULT_DRAFT },

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  setRules: (patch) =>
    set((s) => {
      const rules = { ...s.rules, ...patch };
      saveRules(rules);
      return { rules };
    }),

  resetDraft: () => set({ draft: { ...DEFAULT_DRAFT } }),

  dispatch: (action) =>
    set((s) => {
      if (!s.game) return s;
      const game = reducer(s.game, action);
      persist(game);
      return { game };
    }),

  startGame: () => {
    const { draft, rules } = get();
    const names = draft.names.map((n, i) => n.trim() || `Player ${i + 1}`);
    const pair = drawPair(pairPool(draft.packId), draft.difficulty);
    const config = buildConfig(draft, rules);
    const game = reducer({} as GameState, {
      type: 'NEW_GAME',
      input: { names, config, pair },
    });
    persist(game);
    set({ game });
  },

  playAgainSameCrew: () => {
    const prev = get().game;
    const { draft, rules } = get();
    if (!prev) return;
    const names = prev.players.map((p) => p.name);
    const pair = drawPair(pairPool(draft.packId), draft.difficulty);
    const config = buildConfig({ ...draft, names }, rules);
    const game = reducer({} as GameState, {
      type: 'NEW_GAME',
      input: { names, config, pair },
    });
    persist(game);
    set({ game });
  },

  quit: () => {
    persist(null);
    set({ game: null });
  },
}));

export { DEFAULT_RULES };
