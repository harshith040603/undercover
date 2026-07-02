import type {
  Action,
  EliminationCause,
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
  const killer = alive.filter((p) => p.role === 'killer');
  const imposters = alive.filter((p) => p.role !== 'civilian' && p.role !== 'killer');
  const civilians = alive.filter((p) => p.role === 'civilian');
  return { alive, killer, imposters, civilians };
}

/**
 * Win check (PRD §2.6), excluding the Mr. White instant-win which is
 * resolved separately in the guess sub-phase.
 *   - the Serial Killer (solo faction) wins by outlasting: alive at the final 2
 *   - while the Killer lives, no team can close the game — find them first
 *   - civilians win when no imposters (and no killer) remain
 *   - imposters win when living imposters >= living civilians (parity)
 * The Revenger counts as an imposter; the Killer counts for neither team.
 */
export function checkWinner(s: GameState): Winner | null {
  const { alive, killer, imposters, civilians } = livingByRole(s);
  if (killer.length > 0) {
    return alive.length <= 2 ? 'killer' : null;
  }
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
  const revengerN = config.counts.revenger ?? 0;
  const killerN = config.counts.killer ?? 0;
  const total = names.length;
  const civilianN = total - undercoverN - whiteN - revengerN - killerN;

  // Build the role bag, then shuffle it across players.
  // The Revenger plays with the undercover word — a second-word imposter
  // who additionally knows their role (revenge is an active power).
  // The Serial Killer holds the real civilian word: undetectable by clues,
  // hunted only by behavior.
  const roleBag: Role[] = [
    ...Array<Role>(civilianN).fill('civilian'),
    ...Array<Role>(undercoverN).fill('undercover'),
    ...Array<Role>(whiteN).fill('white'),
    ...Array<Role>(revengerN).fill('revenger'),
    ...Array<Role>(killerN).fill('killer'),
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
      role === 'civilian' || role === 'killer'
        ? pair.civilian
        : role === 'white'
          ? null
          : pair.undercover;
    return {
      id: uid(),
      name: name.trim() || `Player ${i + 1}`,
      role,
      word,
      alive: true,
      seat: seats[i],
      loverId: null,
    };
  });

  // Lovers variant: bind two random players (any roles, cross-team allowed).
  if (config.lovers && players.length >= 2) {
    const [a, b] = shuffle(players, rng);
    a.loverId = b.id;
    b.loverId = a.id;
  }

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
    lastEliminatedIds: [],
    winner: null,
    history: [],
    tiedIds: [],
    revoteUsed: false,
    awaitingWhiteGuess: false,
    awaitingRevengeBy: null,
    lastNightRound: 0,
    quietNight: false,
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
      return eliminate(state, top[0], 'vote');
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

    case 'REVENGE': {
      if (state.phase !== 'revenge') return state;
      const target = state.players.find((p) => p.id === action.targetId);
      if (!target?.alive) return state;
      // Revenge is not a vote: a dragged-down Mr. White gets no guess, and
      // there is at most one Revenger, so revenge can never chain.
      return eliminate({ ...state, awaitingRevengeBy: null }, action.targetId, 'revenge');
    }

    case 'NIGHT_RESOLVE': {
      if (state.phase !== 'night') return state;
      const marked = { ...state, lastNightRound: state.round };
      // The Killer stayed quiet: dawn breaks with no body.
      if (!action.victimId) {
        return {
          ...marked,
          phase: 'elimination',
          quietNight: true,
          lastEliminatedId: null,
          lastEliminatedIds: [],
        };
      }
      const victim = state.players.find((p) => p.id === action.victimId);
      if (!victim?.alive) return state;
      return eliminate(marked, action.victimId, 'murder');
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'elimination') return state;
      // An eliminated Mr. White owes a guess before anything else…
      if (state.awaitingWhiteGuess) {
        return { ...state, phase: 'whiteGuess' };
      }
      // …and a voted-out Revenger owes their revenge.
      if (state.awaitingRevengeBy) {
        return { ...state, phase: 'revenge' };
      }
      if (state.winner) return { ...state, phase: 'gameOver' };

      // A living Serial Killer hunts once per round, after the vote resolves.
      const killerAlive = state.players.some((p) => p.alive && p.role === 'killer');
      if (killerAlive && (state.lastNightRound ?? 0) < state.round) {
        return { ...state, phase: 'night', quietNight: false };
      }

      const rng = defaultRng;
      const next: GameState = {
        ...state,
        phase: 'clues',
        round: state.round + 1,
        votes: {},
        tiedIds: [],
        revoteUsed: false,
        lastEliminatedId: null,
        lastEliminatedIds: [],
        quietNight: false,
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

/**
 * Kill `targetId` (and their heartbroken lover, if any), then decide what the
 * table owes before a winner can be declared:
 *   - voted-out Mr. White → one guess (PRD §2.6 #1)
 *   - voted-out Revenger  → one revenge pick
 * Heartbreak, revenge and murder deaths trigger neither — no last words.
 */
function eliminate(
  state: GameState,
  targetId: string,
  cause: 'vote' | 'revenge' | 'murder',
): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target?.alive) return state;

  const deaths: { player: Player; cause: EliminationCause }[] = [{ player: target, cause }];
  const lover = target.loverId ? state.players.find((p) => p.id === target.loverId) : undefined;
  if (lover?.alive) deaths.push({ player: lover, cause: 'heartbreak' });

  const deadIds = new Set(deaths.map((d) => d.player.id));
  const players = state.players.map((p) => (deadIds.has(p.id) ? { ...p, alive: false } : p));

  const next: GameState = {
    ...state,
    players,
    phase: 'elimination',
    lastEliminatedId: targetId,
    lastEliminatedIds: deaths.map((d) => d.player.id),
    tiedIds: [],
    revoteUsed: false,
    quietNight: false,
    history: [
      ...state.history,
      ...deaths.map((d) => ({
        round: state.round,
        playerId: d.player.id,
        role: d.player.role,
        cause: d.cause,
      })),
    ],
  };

  if (cause === 'vote' && target.role === 'white') {
    return { ...next, awaitingWhiteGuess: true, winner: null };
  }
  if (cause === 'vote' && target.role === 'revenger') {
    return { ...next, awaitingRevengeBy: targetId, winner: null };
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
    lastEliminatedIds: [],
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
    return eliminate(state, pick(top, rng), 'vote');
  }
  return noElimination();
}
