import type {
  Action,
  GameState,
  NewGameInput,
  Player,
  Role,
  Winner,
} from './types';
import { shuffle, pick, defaultRng, type Rng } from './rng';
import { matchesCivilianWord } from './whiteMatch';

let _id = 0;
function uid(): string {
  return `p${(_id++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Helpers ───────────────────────────────────────────────────

export function livingPlayers(s: GameState): Player[] {
  return s.players.filter((p) => p.alive);
}

function livingByRole(s: GameState) {
  const alive = livingPlayers(s);
  const imposters = alive.filter((p) => p.role !== 'civilian');
  const civilians = alive.filter((p) => p.role === 'civilian');
  return { alive, imposters, civilians };
}

/**
 * Win check (PRD §2.6), excluding the Mr. White instant-win which is
 * resolved separately in the guess sub-phase.
 *   - civilians win when no imposters remain
 *   - imposters win when living imposters >= living civilians (parity)
 */
export function checkWinner(s: GameState): Winner | null {
  const { imposters, civilians } = livingByRole(s);
  if (imposters.length === 0) return 'civilians';
  if (imposters.length >= civilians.length) return 'imposters';
  return null;
}

/** Living players ordered clockwise starting from `fromId` (inclusive). */
function speakingOrder(s: GameState, fromId: string): Player[] {
  const ring = [...s.players].sort((a, b) => a.seat - b.seat).filter((p) => p.alive);
  const start = ring.findIndex((p) => p.id === fromId);
  if (start < 0) return ring;
  return [...ring.slice(start), ...ring.slice(0, start)];
}

function chooseFirstSpeaker(s: GameState, rng: Rng): string {
  return pick(livingPlayers(s), rng).id;
}

/** The candidate(s) with the most votes from a counts map (0 votes ignored). */
export function topFromCounts(counts: Record<string, number>): string[] {
  let max = 0;
  for (const c of Object.values(counts)) max = Math.max(max, c);
  return max === 0 ? [] : Object.keys(counts).filter((id) => counts[id] === max);
}

/** Tally per-voter ballots → the candidate(s) with the most votes. */
export function tally(votes: Record<string, string>): { top: string[]; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    counts[target] = (counts[target] ?? 0) + 1;
  }
  return { top: topFromCounts(counts), counts };
}

// ─── Game construction ─────────────────────────────────────────

export function createGame(input: NewGameInput): GameState {
  const rng = input.rng ?? defaultRng;
  const { names, config, pair } = input;

  const undercoverN = config.counts.undercover;
  const whiteN = config.counts.white;
  const total = names.length;
  const civilianN = total - undercoverN - whiteN;

  // Build the role bag, then shuffle it across players.
  const roleBag: Role[] = [
    ...Array<Role>(civilianN).fill('civilian'),
    ...Array<Role>(undercoverN).fill('undercover'),
    ...Array<Role>(whiteN).fill('white'),
  ];
  const shuffledRoles = shuffle(roleBag, rng);

  // Shuffle seating so role order isn't guessable from name-entry order.
  const seats = shuffle(
    names.map((_, i) => i),
    rng,
  );

  const players: Player[] = names.map((name, i) => {
    const role = shuffledRoles[i];
    const word =
      role === 'civilian' ? pair.civilian : role === 'undercover' ? pair.undercover : null;
    return {
      id: uid(),
      name: name.trim() || `Player ${i + 1}`,
      role,
      word,
      alive: true,
      seat: seats[i],
    };
  });

  const base: GameState = {
    phase: 'reveal',
    players,
    config,
    civilianWord: pair.civilian,
    undercoverWord: pair.undercover,
    round: 1,
    firstSpeakerId: '',
    currentSpeakerId: null,
    votes: {},
    lastEliminatedId: null,
    winner: null,
    history: [],
    tiedIds: [],
    revoteUsed: false,
    awaitingWhiteGuess: false,
  };
  base.firstSpeakerId = chooseFirstSpeaker(base, rng);
  return base;
}

// ─── Reducer ───────────────────────────────────────────────────

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.input);

    case 'REVEAL_DONE': {
      if (state.phase !== 'reveal') return state;
      return { ...state, phase: 'clues', currentSpeakerId: state.firstSpeakerId };
    }

    case 'NEXT_SPEAKER': {
      if (state.phase !== 'clues' || !state.currentSpeakerId) return state;
      const order = speakingOrder(state, state.firstSpeakerId);
      const idx = order.findIndex((p) => p.id === state.currentSpeakerId);
      const next = order[idx + 1];
      // If we've passed the last speaker, hold on the last one (UI calls START_DEBATE).
      return { ...state, currentSpeakerId: next ? next.id : state.currentSpeakerId };
    }

    case 'START_DEBATE': {
      if (state.phase !== 'clues') return state;
      return { ...state, phase: 'debate' };
    }

    case 'OPEN_VOTE': {
      if (state.phase !== 'debate' && state.phase !== 'clues') return state;
      return { ...state, phase: 'vote', votes: {} };
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'vote') return state;
      const voter = state.players.find((p) => p.id === action.voterId);
      const target = state.players.find((p) => p.id === action.targetId);
      if (!voter?.alive || !target?.alive) return state;
      // During a revote, only tied players are valid targets.
      if (state.tiedIds.length > 0 && !state.tiedIds.includes(action.targetId)) return state;
      return { ...state, votes: { ...state.votes, [action.voterId]: action.targetId } };
    }

    case 'RESOLVE_VOTE': {
      if (state.phase !== 'vote') return state;
      const rng = action.rng ?? defaultRng;
      // Hand-counted votes come in as `counts`; otherwise fall back to the
      // per-voter ballots stored on state.
      const counts = action.counts ?? tally(state.votes).counts;
      const top = topFromCounts(counts);

      // No votes, or a tie → apply the tie rule.
      if (top.length !== 1) {
        return resolveTie(state, top, rng);
      }
      return eliminate(state, top[0], true);
    }

    case 'WHITE_GUESS': {
      if (state.phase !== 'whiteGuess') return state;
      const correct = matchesCivilianWord(
        action.guess,
        state.civilianWord,
        state.config.rules.whiteMatch,
      );
      if (correct) {
        return { ...state, phase: 'gameOver', winner: 'white', awaitingWhiteGuess: false };
      }
      // Wrong guess: White stays eliminated; run the normal win check.
      const cleared = { ...state, awaitingWhiteGuess: false };
      const winner = checkWinner(cleared);
      return { ...cleared, winner, phase: winner ? 'gameOver' : 'elimination' };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'elimination') return state;
      // An eliminated Mr. White owes a guess before anything else.
      if (state.awaitingWhiteGuess) {
        return { ...state, phase: 'whiteGuess' };
      }
      if (state.winner) return { ...state, phase: 'gameOver' };

      const rng = defaultRng;
      const next: GameState = {
        ...state,
        phase: 'clues',
        round: state.round + 1,
        votes: {},
        tiedIds: [],
        revoteUsed: false,
        lastEliminatedId: null,
      };
      next.firstSpeakerId = chooseFirstSpeaker(next, rng);
      next.currentSpeakerId = next.firstSpeakerId;
      return next;
    }

    case 'RESET':
      return state; // store layer handles teardown

    default:
      return state;
  }
}

// ─── Elimination & tie resolution ──────────────────────────────

function eliminate(state: GameState, targetId: string, byVote: boolean): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target) return state;

  const players = state.players.map((p) =>
    p.id === targetId ? { ...p, alive: false } : p,
  );
  const next: GameState = {
    ...state,
    players,
    phase: 'elimination',
    lastEliminatedId: targetId,
    tiedIds: [],
    revoteUsed: false,
    history: [
      ...state.history,
      { round: state.round, playerId: targetId, role: target.role, byVote },
    ],
  };

  // Mr. White earns one guess before any win is declared (PRD §2.6 #1).
  if (target.role === 'white') {
    return { ...next, awaitingWhiteGuess: true, winner: null };
  }

  next.winner = checkWinner(next);
  return next;
}

function resolveTie(state: GameState, top: string[], rng: Rng): GameState {
  const rule = state.config.rules.tieRule;
  const noElimination = (): GameState => ({
    ...state,
    phase: 'elimination',
    lastEliminatedId: null,
    tiedIds: [],
    revoteUsed: false,
    winner: checkWinner(state),
  });

  // No votes cast at all → nothing to revote on; skip elimination.
  if (top.length === 0) return noElimination();

  if (rule === 'noElim') return noElimination();

  // revote / suddenDeath: one more vote among the tied players, then fall back.
  if (!state.revoteUsed) {
    return { ...state, phase: 'vote', votes: {}, tiedIds: top, revoteUsed: true };
  }

  // Still tied after the revote → break it (suddenDeath) or skip (revote).
  if (rule === 'suddenDeath') {
    return eliminate(state, pick(top, rng), true);
  }
  return noElimination();
}
