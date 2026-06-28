import { describe, it, expect } from 'vitest';
import { createGame, reducer, checkWinner, tally, livingPlayers } from './engine';
import { matchesCivilianWord, levenshtein } from './whiteMatch';
import { defaultDistribution, validateCounts } from './distribution';
import { seeded } from './rng';
import type { GameConfig, GameState } from './types';

function makeConfig(undercover: number, white: number, over: Partial<GameConfig['rules']> = {}): GameConfig {
  return {
    packId: 'test',
    difficulty: 'normal',
    counts: { undercover, white },
    rules: {
      blindCounts: true,
      oneWordMode: false,
      debateSeconds: 60,
      perTurnSeconds: null,
      tieRule: 'revote',
      whiteMatch: 'lenient',
      sound: false,
      haptics: false,
      ...over,
    },
  };
}

function newGame(names: string[], undercover: number, white: number, seed = 1, rules = {}): GameState {
  return createGame({
    names,
    config: makeConfig(undercover, white, rules),
    pair: { civilian: 'Apple', undercover: 'Pear' },
    rng: seeded(seed),
  });
}

describe('role assignment', () => {
  it('assigns exactly the configured counts', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1);
    const civ = s.players.filter((p) => p.role === 'civilian').length;
    const und = s.players.filter((p) => p.role === 'undercover').length;
    const wht = s.players.filter((p) => p.role === 'white').length;
    expect(und).toBe(1);
    expect(wht).toBe(1);
    expect(civ).toBe(3);
  });

  it('gives civilians the civilian word, undercover the other, white nothing', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1);
    for (const p of s.players) {
      if (p.role === 'civilian') expect(p.word).toBe('Apple');
      if (p.role === 'undercover') expect(p.word).toBe('Pear');
      if (p.role === 'white') expect(p.word).toBeNull();
    }
  });

  it('shuffles seats (assigns a full permutation)', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1);
    const seats = s.players.map((p) => p.seat).sort((a, b) => a - b);
    expect(seats).toEqual([0, 1, 2, 3, 4]);
  });

  it('picks a living first speaker', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1);
    expect(s.players.some((p) => p.id === s.firstSpeakerId)).toBe(true);
  });
});

describe('phase flow', () => {
  it('reveal → clues sets current speaker', () => {
    let s = newGame(['A', 'B', 'C'], 1, 0);
    s = reducer(s, { type: 'REVEAL_DONE' });
    expect(s.phase).toBe('clues');
    expect(s.currentSpeakerId).toBe(s.firstSpeakerId);
  });

  it('advances speakers clockwise then holds', () => {
    let s = newGame(['A', 'B', 'C'], 1, 0);
    s = reducer(s, { type: 'REVEAL_DONE' });
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      seen.add(s.currentSpeakerId!);
      s = reducer(s, { type: 'NEXT_SPEAKER' });
    }
    expect(seen.size).toBe(3); // all three spoke
  });

  it('clues → debate → vote', () => {
    let s = newGame(['A', 'B', 'C'], 1, 0);
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'START_DEBATE' });
    expect(s.phase).toBe('debate');
    s = reducer(s, { type: 'OPEN_VOTE' });
    expect(s.phase).toBe('vote');
  });
});

describe('voting & elimination', () => {
  function toVote(names: string[], u: number, w: number, seed = 3): GameState {
    let s = newGame(names, u, w, seed);
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'START_DEBATE' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    return s;
  }

  it('eliminates the most-voted player and records history', () => {
    let s = toVote(['A', 'B', 'C', 'D'], 1, 0);
    const target = s.players[0].id;
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[1].id, targetId: target });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[2].id, targetId: target });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[3].id, targetId: s.players[1].id });
    s = reducer(s, { type: 'RESOLVE_VOTE', rng: seeded(1) });
    expect(s.phase).toBe('elimination');
    expect(s.lastEliminatedId).toBe(target);
    expect(s.players.find((p) => p.id === target)!.alive).toBe(false);
    expect(s.history).toHaveLength(1);
  });

  it('resolves directly from a hand-counted counts map', () => {
    let s = toVote(['A', 'B', 'C', 'D'], 1, 0);
    const target = s.players[2].id;
    // Host counts raised hands: player[2] gets the most.
    s = reducer(s, {
      type: 'RESOLVE_VOTE',
      counts: { [s.players[0].id]: 1, [target]: 3 },
      rng: seeded(1),
    });
    expect(s.phase).toBe('elimination');
    expect(s.lastEliminatedId).toBe(target);
    expect(s.players.find((p) => p.id === target)!.alive).toBe(false);
  });

  it('a counts tie triggers the tie rule', () => {
    let s = toVote(['A', 'B', 'C', 'D'], 1, 0);
    const a = s.players[0].id;
    const b = s.players[1].id;
    s = reducer(s, { type: 'RESOLVE_VOTE', counts: { [a]: 2, [b]: 2 } });
    expect(s.phase).toBe('vote'); // revote (default rule)
    expect(s.tiedIds.sort()).toEqual([a, b].sort());
  });

  it('only living players can be voted for', () => {
    let s = toVote(['A', 'B', 'C', 'D'], 1, 0);
    const dead = s.players[0].id;
    // kill player 0
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[1].id, targetId: dead });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[2].id, targetId: dead });
    s = reducer(s, { type: 'RESOLVE_VOTE' });
    // try to vote dead player next round
    s = reducer(s, { type: 'NEXT_ROUND' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    const before = { ...s.votes };
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[1].id, targetId: dead });
    expect(s.votes).toEqual(before); // rejected
  });
});

describe('tie handling', () => {
  it('revote rule: first tie triggers a revote among tied players', () => {
    let s = newGame(['A', 'B', 'C', 'D'], 1, 0, 5, { tieRule: 'revote' });
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    const a = s.players[0].id;
    const b = s.players[1].id;
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[2].id, targetId: a });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[3].id, targetId: b });
    s = reducer(s, { type: 'RESOLVE_VOTE' });
    expect(s.phase).toBe('vote');
    expect(s.revoteUsed).toBe(true);
    expect(s.tiedIds.sort()).toEqual([a, b].sort());
  });

  it('revote rule: still tied → no elimination', () => {
    let s = newGame(['A', 'B', 'C', 'D'], 1, 0, 5, { tieRule: 'revote' });
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    const a = s.players[0].id;
    const b = s.players[1].id;
    const tieVotes = (st: GameState) => {
      st = reducer(st, { type: 'CAST_VOTE', voterId: st.players[2].id, targetId: a });
      st = reducer(st, { type: 'CAST_VOTE', voterId: st.players[3].id, targetId: b });
      return reducer(st, { type: 'RESOLVE_VOTE' });
    };
    s = tieVotes(s); // revote
    s = tieVotes(s); // still tied
    expect(s.phase).toBe('elimination');
    expect(s.lastEliminatedId).toBeNull();
    expect(livingPlayers(s)).toHaveLength(4);
  });

  it('noElim rule: tie skips elimination immediately', () => {
    let s = newGame(['A', 'B', 'C', 'D'], 1, 0, 5, { tieRule: 'noElim' });
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[2].id, targetId: s.players[0].id });
    s = reducer(s, { type: 'CAST_VOTE', voterId: s.players[3].id, targetId: s.players[1].id });
    s = reducer(s, { type: 'RESOLVE_VOTE' });
    expect(s.lastEliminatedId).toBeNull();
  });
});

describe('win conditions', () => {
  function killById(s: GameState, pid: string): GameState {
    return {
      ...s,
      players: s.players.map((p) => (p.id === pid ? { ...p, alive: false } : p)),
    };
  }

  it('civilians win when all imposters are out', () => {
    let s = newGame(['A', 'B', 'C', 'D'], 1, 0);
    const imposter = s.players.find((p) => p.role !== 'civilian')!;
    s = killById(s, imposter.id);
    expect(checkWinner(s)).toBe('civilians');
  });

  it('imposters win at parity', () => {
    // 4 players, 1 undercover. Remove 2 civilians → 1 imp vs 1 civ → parity.
    let s = newGame(['A', 'B', 'C', 'D'], 1, 0);
    const civs = s.players.filter((p) => p.role === 'civilian');
    s = killById(s, civs[0].id);
    s = killById(s, civs[1].id);
    expect(checkWinner(s)).toBe('imposters');
  });

  it('no winner mid-game', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1);
    expect(checkWinner(s)).toBeNull();
  });
});

describe('Mr. White guess sub-phase', () => {
  function eliminateWhite(seed: number): GameState {
    let s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1, seed);
    const white = s.players.find((p) => p.role === 'white')!;
    s = reducer(s, { type: 'REVEAL_DONE' });
    s = reducer(s, { type: 'OPEN_VOTE' });
    for (const v of s.players.filter((p) => p.id !== white.id)) {
      s = reducer(s, { type: 'CAST_VOTE', voterId: v.id, targetId: white.id });
    }
    s = reducer(s, { type: 'RESOLVE_VOTE' });
    return s;
  }

  it('eliminating White sets awaitingWhiteGuess and routes to whiteGuess', () => {
    let s = eliminateWhite(7);
    expect(s.awaitingWhiteGuess).toBe(true);
    expect(s.winner).toBeNull(); // no win declared yet
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('whiteGuess');
  });

  it('correct guess → White wins instantly (overrides everything)', () => {
    let s = eliminateWhite(7);
    s = reducer(s, { type: 'NEXT_ROUND' });
    s = reducer(s, { type: 'WHITE_GUESS', guess: 'apple' });
    expect(s.winner).toBe('white');
    expect(s.phase).toBe('gameOver');
  });

  it('wrong guess → White eliminated, normal win check runs', () => {
    let s = eliminateWhite(7);
    s = reducer(s, { type: 'NEXT_ROUND' });
    s = reducer(s, { type: 'WHITE_GUESS', guess: 'banana' });
    expect(s.winner).not.toBe('white');
    expect(s.awaitingWhiteGuess).toBe(false);
  });
});

describe('whiteMatch', () => {
  it('exact mode is strict but case/space insensitive', () => {
    expect(matchesCivilianWord('  Apple ', 'apple', 'exact')).toBe(true);
    expect(matchesCivilianWord('apples', 'apple', 'exact')).toBe(false);
  });
  it('lenient ignores plurals', () => {
    expect(matchesCivilianWord('apples', 'apple', 'lenient')).toBe(true);
    expect(matchesCivilianWord('aple', 'apple', 'lenient')).toBe(false);
  });
  it('fuzzy allows distance <= 1', () => {
    expect(matchesCivilianWord('aple', 'apple', 'fuzzy')).toBe(true);
    expect(matchesCivilianWord('xpqle', 'apple', 'fuzzy')).toBe(false);
  });
  it('empty guess never matches', () => {
    expect(matchesCivilianWord('', 'apple', 'fuzzy')).toBe(false);
  });
  it('levenshtein basics', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });
});

describe('tally', () => {
  it('finds the top candidate', () => {
    const { top } = tally({ v1: 'x', v2: 'x', v3: 'y' });
    expect(top).toEqual(['x']);
  });
  it('returns multiple on a tie', () => {
    const { top } = tally({ v1: 'x', v2: 'y' });
    expect(top.sort()).toEqual(['x', 'y']);
  });
  it('empty votes → no top', () => {
    expect(tally({}).top).toEqual([]);
  });
});

describe('distribution table', () => {
  it('matches the PRD for sampled counts', () => {
    expect(defaultDistribution(5)).toEqual({ civilians: 3, undercover: 1, white: 1 });
    expect(defaultDistribution(8)).toEqual({ civilians: 5, undercover: 2, white: 1 });
    expect(defaultDistribution(16)).toEqual({ civilians: 10, undercover: 4, white: 2 });
  });
  it('enforces the strict-majority constraint', () => {
    expect(validateCounts(4, 2, 0).ok).toBe(false); // 2 civ vs 2 imp, not strict
    expect(validateCounts(4, 1, 0).ok).toBe(true);
    expect(validateCounts(5, 1, 1).ok).toBe(true);
    expect(validateCounts(3, 0, 0).ok).toBe(false); // no imposter
  });
});

describe('full game playthrough (civilians win)', () => {
  it('runs a 3-player game to a winner without throwing', () => {
    let s = newGame(['A', 'B', 'C'], 1, 0, 42);
    s = reducer(s, { type: 'REVEAL_DONE' });
    let guard = 0;
    while (s.phase !== 'gameOver' && guard++ < 20) {
      if (s.phase === 'clues') s = reducer(s, { type: 'START_DEBATE' });
      else if (s.phase === 'debate') s = reducer(s, { type: 'OPEN_VOTE' });
      else if (s.phase === 'vote') {
        // everyone votes the undercover out
        const imp = livingPlayers(s).find((p) => p.role !== 'civilian');
        const target = imp ?? livingPlayers(s)[0];
        for (const v of livingPlayers(s)) {
          if (v.id !== target.id) s = reducer(s, { type: 'CAST_VOTE', voterId: v.id, targetId: target.id });
        }
        s = reducer(s, { type: 'RESOLVE_VOTE', rng: seeded(1) });
      } else if (s.phase === 'elimination') s = reducer(s, { type: 'NEXT_ROUND' });
      else if (s.phase === 'whiteGuess') s = reducer(s, { type: 'WHITE_GUESS', guess: 'zzz' });
    }
    expect(s.phase).toBe('gameOver');
    expect(s.winner).not.toBeNull();
  });
});
