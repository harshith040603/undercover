import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { Winner } from '@/engine/types';

const WIN_META: Record<Winner, { title: string; sub: string; color: string; bg: string }> = {
  civilians: {
    title: 'Case closed',
    sub: 'The Civilians rooted out every imposter.',
    color: 'var(--color-civilian)',
    bg: 'radial-gradient(ellipse at center, rgba(43,78,162,0.14), transparent 70%)',
  },
  imposters: {
    title: 'They got away',
    sub: 'The imposters reached parity. Nobody saw it coming.',
    color: 'var(--color-undercover)',
    bg: 'radial-gradient(ellipse at center, rgba(179,49,31,0.14), transparent 70%)',
  },
  white: {
    title: 'The blank wins',
    sub: 'Mr. White had no word — and still cracked it.',
    color: 'var(--color-ink)',
    bg: 'radial-gradient(ellipse at center, rgba(249,243,225,0.55), transparent 70%)',
  },
  killer: {
    title: 'No witnesses',
    sub: 'The Serial Killer outlasted them all, one night at a time.',
    color: 'var(--color-ink)',
    bg: 'radial-gradient(ellipse at center, rgba(43,36,22,0.16), transparent 70%)',
  },
};

export function Win() {
  const nav = useNavigate();
  const game = useGame((s) => s.game)!;
  const playAgain = useGame((s) => s.playAgainSameCrew);
  const quit = useGame((s) => s.quit);
  const winner = game.winner ?? 'civilians';
  const meta = WIN_META[winner];

  useEffect(() => {
    haptic('buzz');
  }, []);

  const imposters = game.players.filter((p) => p.role !== 'civilian' && p.role !== 'killer');
  const killer = game.players.find((p) => p.role === 'killer');
  const lovers = game.players.filter((p) => p.loverId);

  return (
    <Screen className="items-center justify-between py-10 text-center">
      <div className="pointer-events-none absolute inset-0" style={{ background: meta.bg }} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5">
        {/* The final verdict, stamped across the file */}
        <motion.h1
          initial={{ scale: 2, opacity: 0, rotate: 2 }}
          animate={{ scale: 1, opacity: 1, rotate: -6 }}
          transition={{ duration: 0.18, ease: 'easeIn' }}
          className="stamp stamp-worn text-5xl"
          style={{ color: meta.color }}
        >
          {meta.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-[16rem] text-sm text-ink/65"
        >
          {meta.sub}
        </motion.p>

        {/* Declassified case summary — everything un-redacted at last */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="sheet mt-4 w-full space-y-1.5 rounded-card p-4 text-left text-sm shadow-[0.3rem_0.3rem_0_rgba(43,36,22,0.15)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink/40">
            Declassified
          </p>
          <p className="text-ink/60">
            Civilian word: <span className="font-bold text-civilian">{game.civilianWord}</span>
          </p>
          <p className="text-ink/60">
            Undercover word: <span className="font-bold text-undercover">{game.undercoverWord}</span>
          </p>
          <p className="pt-1 text-ink/60">
            Imposters were:{' '}
            <span className="font-bold text-ink">
              {imposters.map((p) => p.name).join(', ') || '—'}
            </span>
          </p>
          {killer && (
            <p className="text-ink/60">
              The Serial Killer: <span className="font-bold text-ink">{killer.name}</span>
            </p>
          )}
          {lovers.length === 2 && (
            <p className="text-ink/60">
              The Lovers:{' '}
              <span className="font-bold text-ink">
                {lovers.map((p) => p.name).join(' & ')}
              </span>
            </p>
          )}
        </motion.div>
      </div>

      <div className="relative z-10 flex w-full flex-col gap-3">
        <Button
          onClick={() => {
            playAgain();
            nav('/play');
          }}
        >
          Play again · same crew
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            quit();
            nav('/');
          }}
        >
          Home
        </Button>
      </div>
    </Screen>
  );
}
