import { describe, it, expect } from 'vitest';
import { createGame, reducer, checkWinner, tally, livingPlayers } from './engine';
import { matchesCivilianWord, levenshtein } from './whiteMatch';
import { defaultDistribution, validateCounts } from './distribution';
import { seeded } from './rng';
import type { GameConfig, GameState } from './types';

interface Specials {
  revenger?: number;
  killer?: number;
  lovers?: boolean;
}

function makeConfig(
  undercover: number,
  white: number,
  over: Partial<GameConfig['rules']> = {},
  specials: Specials = {},
): GameConfig {
  return {
    packId: 'test',
    difficulty: 'normal',
    counts: {
      undercover,
      white,
      revenger: specials.revenger ?? 0,
      killer: specials.killer ?? 0,
    },
    lovers: specials.lovers ?? false,
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

function newGame(
  names: string[],
  undercover: number,
  white: number,
  seed = 1,
  rules = {},
  specials: Specials = {},
): GameState {
  return createGame({
    names,
    config: makeConfig(undercover, white, rules, specials),
    pair: { civilian: 'Apple', undercover: 'Pear' },
    rng: seeded(seed),
  });
}

/** Vote out one specific player: everyone else piles onto them. */
function voteOut(s: GameState, targetId: string): GameState {
  s = reducer(s, { type: 'OPEN_VOTE' });
  for (const v of livingPlayers(s)) {
    if (v.id !== targetId) s = reducer(s, { type: 'CAST_VOTE', voterId: v.id, targetId });
  }
  return reducer(s, { type: 'RESOLVE_VOTE', rng: seeded(1) });
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

describe('special role: Revenger', () => {
  // 7 players, 1 undercover + 1 revenger + 1 white = 3 imposters vs 4 civilians.
  function withRevenger(seed = 11): GameState {
    let s = newGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 1, 1, seed, {}, { revenger: 1 });
    s = reducer(s, { type: 'REVEAL_DONE' });
    return s;
  }

  it('assigns exactly one revenger with the undercover word', () => {
    const s = withRevenger();
    const revs = s.players.filter((p) => p.role === 'revenger');
    expect(revs).toHaveLength(1);
    expect(revs[0].word).toBe('Pear');
  });

  it('counts as an imposter for the win check', () => {
    let s = withRevenger();
    // Kill the undercover and the white: revenger alone keeps the game alive.
    s = {
      ...s,
      players: s.players.map((p) =>
        p.role === 'undercover' || p.role === 'white' ? { ...p, alive: false } : p,
      ),
    };
    expect(checkWinner(s)).toBeNull();
  });

  it('voted out → owes revenge; picks a target who falls with them', () => {
    let s = withRevenger();
    const rev = s.players.find((p) => p.role === 'revenger')!;
    s = voteOut(s, rev.id);
    expect(s.phase).toBe('elimination');
    expect(s.awaitingRevengeBy).toBe(rev.id);
    expect(s.winner).toBeNull(); // deferred until revenge resolves

    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('revenge');

    const victim = livingPlayers(s).find((p) => p.role === 'civilian')!;
    s = reducer(s, { type: 'REVENGE', targetId: victim.id });
    expect(s.players.find((p) => p.id === victim.id)!.alive).toBe(false);
    expect(s.phase).toBe('elimination');
    expect(s.awaitingRevengeBy).toBeNull();
    expect(s.history.at(-1)).toMatchObject({ playerId: victim.id, cause: 'revenge' });
  });

  it('a Mr. White dragged down by revenge gets no guess', () => {
    let s = withRevenger();
    const rev = s.players.find((p) => p.role === 'revenger')!;
    const white = s.players.find((p) => p.role === 'white')!;
    s = voteOut(s, rev.id);
    s = reducer(s, { type: 'NEXT_ROUND' });
    s = reducer(s, { type: 'REVENGE', targetId: white.id });
    expect(s.players.find((p) => p.id === white.id)!.alive).toBe(false);
    expect(s.awaitingWhiteGuess).toBe(false);
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).not.toBe('whiteGuess');
  });

  it('dying by revenge does not trigger a dead revenger twice', () => {
    let s = withRevenger();
    const civ = livingPlayers(s).find((p) => p.role === 'civilian')!;
    s = voteOut(s, civ.id); // normal elimination, no revenge owed
    expect(s.awaitingRevengeBy).toBeNull();
  });

  it('validateCounts caps the revenger at 1', () => {
    expect(validateCounts(8, 1, 0, 1).ok).toBe(true);
    expect(validateCounts(8, 1, 0, 2).ok).toBe(false);
  });
});

describe('special variant: Lovers', () => {
  it('binds exactly two players to each other', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1, 3, {}, { lovers: true });
    const lovers = s.players.filter((p) => p.loverId);
    expect(lovers).toHaveLength(2);
    expect(lovers[0].loverId).toBe(lovers[1].id);
    expect(lovers[1].loverId).toBe(lovers[0].id);
  });

  it('no lovers when the variant is off', () => {
    const s = newGame(['A', 'B', 'C', 'D', 'E'], 1, 1, 3);
    expect(s.players.every((p) => !p.loverId)).toBe(true);
  });

  it('eliminating one lover kills both (heartbreak)', () => {
    let s = newGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 1, 0, 9, {}, { lovers: true });
    s = reducer(s, { type: 'REVEAL_DONE' });
    const [a, b] = s.players.filter((p) => p.loverId);
    s = voteOut(s, a.id);
    expect(s.players.find((p) => p.id === a.id)!.alive).toBe(false);
    expect(s.players.find((p) => p.id === b.id)!.alive).toBe(false);
    expect(s.lastEliminatedIds).toEqual([a.id, b.id]);
    expect(s.history.at(-1)).toMatchObject({ playerId: b.id, cause: 'heartbreak' });
  });

  it('a Mr. White who dies of heartbreak gets no guess', () => {
    // Find a seed where Mr. White is one of the lovers.
    let s: GameState | null = null;
    let white: ReturnType<typeof livingPlayers>[number] | undefined;
    for (let seed = 1; seed < 200; seed++) {
      const g = newGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 1, 1, seed, {}, { lovers: true });
      const w = g.players.find((p) => p.role === 'white');
      if (w?.loverId) {
        s = g;
        white = w;
        break;
      }
    }
    expect(s).not.toBeNull();
    let g = reducer(s!, { type: 'REVEAL_DONE' });
    g = voteOut(g, white!.loverId!); // vote out the White's partner
    expect(g.players.find((p) => p.id === white!.id)!.alive).toBe(false);
    expect(g.awaitingWhiteGuess).toBe(false);
  });
});

describe('special role: Serial Killer', () => {
  // 6 players: 1 undercover + 1 killer, 4 civilians (4 > 1+1+1 ✓).
  function withKiller(seed = 13): GameState {
    let s = newGame(['A', 'B', 'C', 'D', 'E', 'F'], 1, 0, seed, {}, { killer: 1 });
    s = reducer(s, { type: 'REVEAL_DONE' });
    return s;
  }

  it('holds the real civilian word and exactly one exists', () => {
    const s = withKiller();
    const killers = s.players.filter((p) => p.role === 'killer');
    expect(killers).toHaveLength(1);
    expect(killers[0].word).toBe('Apple');
  });

  it('night falls after a vote while the killer lives', () => {
    let s = withKiller();
    const civ = livingPlayers(s).find((p) => p.role === 'civilian')!;
    s = voteOut(s, civ.id);
    expect(s.phase).toBe('elimination');
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('night');
  });

  it('a murder is found at dawn — no White guess, no revenge, but heartbreak', () => {
    let s = newGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 1, 1, 21, {}, { killer: 1, lovers: true });
    s = reducer(s, { type: 'REVEAL_DONE' });
    const civ = livingPlayers(s).find((p) => p.role === 'civilian' && !p.loverId)!;
    s = voteOut(s, civ.id);
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('night');

    const white = s.players.find((p) => p.role === 'white')!;
    s = reducer(s, { type: 'NIGHT_RESOLVE', victimId: white.id });
    expect(s.phase).toBe('elimination');
    expect(s.players.find((p) => p.id === white.id)!.alive).toBe(false);
    expect(s.awaitingWhiteGuess).toBe(false); // murdered, not voted out
    expect(s.history.find((e) => e.playerId === white.id)!.cause).toBe('murder');
    // a bound lover falls too
    if (white.loverId) {
      expect(s.players.find((p) => p.id === white.loverId)!.alive).toBe(false);
    }
  });

  it('a quiet night leaves no body and the game moves on', () => {
    let s = withKiller();
    const civ = livingPlayers(s).find((p) => p.role === 'civilian')!;
    s = voteOut(s, civ.id);
    s = reducer(s, { type: 'NEXT_ROUND' });
    s = reducer(s, { type: 'NIGHT_RESOLVE', victimId: null });
    expect(s.phase).toBe('elimination');
    expect(s.quietNight).toBe(true);
    expect(s.lastEliminatedIds).toEqual([]);
    const round = s.round;
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('clues'); // one night per round — no second hunt
    expect(s.round).toBe(round + 1);
  });

  it('no team can win while the killer lives; killer wins at the final 2', () => {
    let s = withKiller();
    // Kill the undercover: normally civilians would win, but the killer lives.
    const und = s.players.find((p) => p.role === 'undercover')!;
    s = { ...s, players: s.players.map((p) => (p.id === und.id ? { ...p, alive: false } : p)) };
    expect(checkWinner(s)).toBeNull();

    // Cut down to killer + 1 civilian → killer outlasts everyone.
    const killer = s.players.find((p) => p.role === 'killer')!;
    const lastCiv = s.players.filter((p) => p.alive && p.role === 'civilian')[0];
    s = {
      ...s,
      players: s.players.map((p) =>
        p.id === killer.id || p.id === lastCiv.id ? p : { ...p, alive: false },
      ),
    };
    expect(checkWinner(s)).toBe('killer');
  });

  it('once the killer is voted out, normal wins resume and nights stop', () => {
    let s = withKiller();
    const killer = s.players.find((p) => p.role === 'killer')!;
    s = voteOut(s, killer.id);
    expect(s.phase).toBe('elimination');
    expect(s.winner).toBeNull(); // undercover still alive
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('clues'); // no night without a living killer
  });

  it('validateCounts caps the killer and keeps the majority', () => {
    expect(validateCounts(6, 1, 0, 0, 1).ok).toBe(true); // 4 civ vs 1+1
    expect(validateCounts(6, 1, 0, 0, 2).ok).toBe(false); // two killers
    expect(validateCounts(4, 1, 0, 0, 1).ok).toBe(false); // 2 civ vs 1+1 — no majority
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
