import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { Role } from '@/engine/types';

const ROLE_META: Record<Role, { label: string; color: string; dashed?: boolean }> = {
  civilian: { label: 'Civilian', color: 'var(--color-civilian)' },
  undercover: { label: 'Undercover', color: 'var(--color-undercover)' },
  white: { label: 'Mr. White', color: 'var(--color-ink)', dashed: true },
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
          <span className="stamp stamp-worn -rotate-6 text-2xl text-ink/60">Tie vote</span>
          <h2 className="font-display text-4xl text-ink">Deadlock.</h2>
          <p className="max-w-[15rem] text-sm text-ink/60">
            The vote tied. Nobody leaves this round.
          </p>
          <div className="w-64 pt-6">
            <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>Next round</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  const meta = ROLE_META[eliminated.role];
  const isWhite = eliminated.role === 'white';

  return (
    <Screen className="items-center justify-between py-10 text-center">
      <p className="pt-4 text-sm uppercase tracking-[0.3em] text-ink/50">Eliminated</p>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/* Their personnel card, pulled from the file and stamped */}
        <motion.div
          initial={{ y: -24, rotate: 4, opacity: 0 }}
          animate={{ y: 0, rotate: -1.5, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
          className="sheet relative flex aspect-[3/4] w-60 flex-col items-center justify-center gap-4 rounded-card p-6 shadow-[0.4rem_0.4rem_0_rgba(43,36,22,0.18)]"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink/40">
            Personnel record
          </span>
          <span className="font-display text-4xl leading-none text-ink">{eliminated.name}</span>
          {!isWhite && (
            <span className="text-xs text-ink/55">
              word: <span className="font-bold text-ink">{eliminated.word}</span>
            </span>
          )}

          <motion.span
            initial={{ opacity: 0, scale: 1.8, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: -10 }}
            transition={{ delay: 0.35, duration: 0.16, ease: 'easeIn' }}
            className={`stamp stamp-worn absolute bottom-8 text-3xl ${meta.dashed ? 'border-dashed' : ''}`}
            style={{ color: meta.color }}
          >
            {meta.label}
          </motion.span>
        </motion.div>

        {isWhite && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-[15rem] text-sm text-ink/65"
          >
            Mr. White gets one shot at the civilian word…
          </motion.p>
        )}
      </div>

      <Button
        variant={isWhite ? 'glass' : 'primary'}
        onClick={() => dispatch({ type: 'NEXT_ROUND' })}
      >
        {game.awaitingWhiteGuess ? "Mr. White's guess →" : game.winner ? 'See result' : 'Next round'}
      </Button>
    </Screen>
  );
}
