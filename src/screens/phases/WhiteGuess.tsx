import { useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

export function WhiteGuess() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const white = game.players.find((p) => p.id === game.lastEliminatedId);
  const [guess, setGuess] = useState('');

  const submit = () => {
    if (!guess.trim()) return;
    haptic('thump');
    dispatch({ type: 'WHITE_GUESS', guess });
  };

  return (
    <Screen spotlight className="items-center justify-between py-10 text-center">
      <motion.div
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="pt-6 text-xs font-bold uppercase tracking-[0.4em] text-ink"
      >
        {white?.name} · one shot
      </motion.div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
        <h2 className="font-display text-4xl leading-tight text-ink">
          What was the<br />civilian word?
        </h2>
        {/* The blank line on the form — Mr. White fills it in */}
        <input
          autoFocus
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="type your guess…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full max-w-xs border-b-2 border-dashed border-ink/40 bg-transparent pb-2 text-center font-display text-3xl text-ink placeholder:font-body placeholder:text-base placeholder:text-ink/35 focus:border-solid focus:border-undercover focus:outline-none"
        />
        <p className="text-xs text-ink/50">
          Nail it and Mr. White steals the win.
        </p>
      </div>

      <Button onClick={submit} disabled={!guess.trim()}>
        Lock in guess
      </Button>
    </Screen>
  );
}
