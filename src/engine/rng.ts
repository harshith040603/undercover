// Small RNG helpers. Default to Math.random, but accept an injectable
// generator so the engine is fully deterministic under test.

export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Fisher–Yates shuffle (non-mutating). */
export function shuffle<T>(arr: readonly T[], rng: Rng = defaultRng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick a random element. */
export function pick<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Deterministic seeded RNG (mulberry32) — handy for tests / replay. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
