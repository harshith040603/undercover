import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { Role } from '@/engine/types';

const ROLE_META: Record<Role, { label: string; color: string; emoji: string }> = {
  civilian: { label: 'Civilian', color: 'var(--color-civilian)', emoji: '🟦' },
  undercover: { label: 'Undercover', color: 'var(--color-undercover)', emoji: '🟥' },
  white: { label: 'Mr. White', color: 'var(--color-white)', emoji: '⬜' },
};

export function Elimination() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const eliminated = game.players.find((p) => p.id === game.lastEliminatedId);

  useEffect(() => {
    haptic('buzz');
  }, []);

  // Tie → no elimination this round.
  if (!eliminated) {
    return (
      <Screen className="items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <span className="text-5xl">⚖️</span>
          <h2 className="font-display text-3xl font-bold">Deadlock.</h2>
          <p className="max-w-[15rem] text-sm text-white/45">
            The vote tied. Nobody leaves this round.
          </p>
          <div className="w-64 pt-6">
            <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>Next Round</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  const meta = ROLE_META[eliminated.role];
  const isWhite = eliminated.role === 'white';

  return (
    <Screen className="items-center justify-between py-10 text-center">
      <p className="pt-4 text-sm uppercase tracking-[0.3em] text-white/40">Eliminated</p>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ rotateY: 180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="flex aspect-[3/4] w-60 flex-col items-center justify-center gap-3 rounded-card border p-6"
          style={{ borderColor: meta.color, boxShadow: `0 0 50px -12px ${meta.color}` }}
        >
          <span className="text-5xl">{meta.emoji}</span>
          <span className="font-display text-3xl font-extrabold">{eliminated.name}</span>
          <span
            className="font-display text-sm uppercase tracking-[0.2em]"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
          {!isWhite && (
            <span className="mt-2 text-xs text-white/50">
              word: <span className="text-white">{eliminated.word}</span>
            </span>
          )}
        </motion.div>

        {isWhite && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-[15rem] text-sm text-white/55"
          >
            Mr. White gets one shot at the civilian word…
          </motion.p>
        )}
      </div>

      <Button
        variant={isWhite ? 'glass' : 'primary'}
        onClick={() => dispatch({ type: 'NEXT_ROUND' })}
      >
        {game.awaitingWhiteGuess ? "Mr. White's Guess →" : game.winner ? 'See Result' : 'Next Round'}
      </Button>
    </Screen>
  );
}
