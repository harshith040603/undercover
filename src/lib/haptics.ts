import { useGame } from '@/store/gameStore';

type Pattern = 'tick' | 'thump' | 'buzz';

const PATTERNS: Record<Pattern, number | number[]> = {
  tick: 8,
  thump: 24,
  buzz: [0, 40, 60, 40],
};

/** Fire a haptic if supported and enabled in settings (PRD §5.4). */
export function haptic(pattern: Pattern) {
  const enabled = useGame.getState().rules.haptics;
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(PATTERNS[pattern]);
  }
}
