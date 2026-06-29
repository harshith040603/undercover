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
    title: 'CASE CLOSED',
    sub: 'The Civilians rooted out every imposter.',
    color: 'var(--color-civilian)',
    bg: 'radial-gradient(ellipse at center, rgba(255,210,90,0.20), transparent 70%)',
  },
  imposters: {
    title: 'THEY GOT AWAY',
    sub: 'The imposters reached parity. Nobody saw it coming.',
    color: 'var(--color-undercover)',
    bg: 'radial-gradient(ellipse at center, rgba(255,120,90,0.22), transparent 70%)',
  },
  white: {
    title: 'THE BLANK WINS',
    sub: 'Mr. White had no word — and still cracked it.',
    color: 'var(--color-white)',
    bg: 'radial-gradient(ellipse at center, rgba(245,245,244,0.22), transparent 70%)',
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

  const imposters = game.players.filter((p) => p.role !== 'civilian');

  return (
    <Screen className="items-center justify-between py-10 text-center">
      <div className="pointer-events-none absolute inset-0" style={{ background: meta.bg }} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4">
        <motion.h1
          initial={{ scale: 0.6, opacity: 0, filter: 'blur(10px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="font-display text-5xl font-extrabold uppercase tracking-tight"
          style={{ color: meta.color, textShadow: `0 0 40px ${meta.color}` }}
        >
          {meta.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-[16rem] text-sm text-white/55"
        >
          {meta.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 w-full space-y-1 rounded-card border border-glass-edge bg-glass p-4 text-left text-sm"
        >
          <p className="text-white/40">
            Civilian word: <span className="text-civilian">{game.civilianWord}</span>
          </p>
          <p className="text-white/40">
            Undercover word: <span className="text-undercover">{game.undercoverWord}</span>
          </p>
          <p className="pt-1 text-white/40">
            Imposters were:{' '}
            <span className="text-white">{imposters.map((p) => p.name).join(', ') || '—'}</span>
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 flex w-full flex-col gap-3">
        <Button
          onClick={() => {
            playAgain();
            nav('/play');
          }}
        >
          Play Again · Same Crew
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
