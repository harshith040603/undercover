// Pure, framework-agnostic game types. No React, no DOM.

export type Role = 'civilian' | 'undercover' | 'white' | 'revenger' | 'killer';

export type Phase =
  | 'setup'
  | 'reveal'
  | 'clues'
  | 'debate'
  | 'vote'
  | 'elimination'
  | 'whiteGuess'
  | 'revenge'
  | 'night'
  | 'gameOver';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Winner = 'civilians' | 'imposters' | 'white' | 'killer';

export type TieRule = 'revote' | 'suddenDeath' | 'noElim';
export type WhiteMatch = 'exact' | 'lenient' | 'fuzzy';

/** How a player left the game. Only 'vote' triggers Mr. White's guess or the
 *  Revenger's revenge — revenge, murder and heartbreak deaths get no last words. */
export type EliminationCause = 'vote' | 'revenge' | 'heartbreak' | 'murder';

export interface Player {
  id: string;
  name: string;
  role: Role;
  word: string | null; // null for Mr. White
  alive: boolean;
  seat: number; // shuffled order
  /** set when the Lovers variant is on and this player is one of the pair */
  loverId?: string | null;
}

export interface GameRules {
  blindCounts: boolean;
  oneWordMode: boolean;
  debateSeconds: number;
  perTurnSeconds: number | null;
  tieRule: TieRule;
  whiteMatch: WhiteMatch;
  sound: boolean;
  haptics: boolean;
}

export interface GameConfig {
  packId: string;
  difficulty: Difficulty;
  counts: { undercover: number; white: number; revenger?: number; killer?: number }; // civilians derived
  /** Lovers variant: two random players are secretly bound; if one falls, both fall. */
  lovers?: boolean;
  rules: GameRules;
}

export interface EliminationEvent {
  round: number;
  playerId: string;
  role: Role;
  cause: EliminationCause;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  civilianWord: string;
  undercoverWord: string;
  round: number;
  firstSpeakerId: string;
  currentSpeakerId: string | null;
  votes: Record<string, string>; // voterId -> targetId
  lastEliminatedId: string | null;
  /** every death from the last resolution, in order (vote target, heartbreak, …) */
  lastEliminatedIds: string[];
  winner: Winner | null;
  history: EliminationEvent[];
  /** ids tied in the current vote, when a tie is being resolved */
  tiedIds: string[];
  /** true once a revote has already happened this vote (to apply fallback) */
  revoteUsed: boolean;
  /** set when an eliminated Mr. White still owes their one guess */
  awaitingWhiteGuess: boolean;
  /** set when a voted-out Revenger still owes their revenge pick */
  awaitingRevengeBy: string | null;
  /** the round whose night has already been resolved (guards one night per round) */
  lastNightRound: number;
  /** true when the last night passed without a murder */
  quietNight: boolean;
}

export interface WordPair {
  civilian: string;
  undercover: string;
  difficulty: Difficulty;
}

export interface WordPack {
  id: string;
  name: string;
  emoji: string;
  author: string;
  pairs: WordPair[];
}

// ─── Actions the reducer understands ───────────────────────────

export interface NewGameInput {
  names: string[];
  config: GameConfig;
  pair: { civilian: string; undercover: string };
  /** optional injectable RNG for deterministic tests; returns [0,1) */
  rng?: () => number;
}

export type Action =
  | { type: 'NEW_GAME'; input: NewGameInput }
  | { type: 'REVEAL_DONE' } // all cards peeked → go to clues
  | { type: 'NEXT_SPEAKER' } // advance the clue turn marker
  | { type: 'START_DEBATE' }
  | { type: 'OPEN_VOTE' }
  | { type: 'CAST_VOTE'; voterId: string; targetId: string }
  // Tally & eliminate. Pass `counts` (votes per player, counted by hand) to
  // resolve directly; otherwise the stored per-voter `votes` are used.
  | { type: 'RESOLVE_VOTE'; counts?: Record<string, number>; rng?: () => number }
  | { type: 'WHITE_GUESS'; guess: string }
  | { type: 'REVENGE'; targetId: string } // voted-out Revenger picks who falls with them
  // End of the night pass-around: the Serial Killer's pick (null = stayed quiet).
  | { type: 'NIGHT_RESOLVE'; victimId: string | null }
  | { type: 'NEXT_ROUND' } // from elimination → next clues round
  | { type: 'RESET' };
