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
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="pt-6 font-display text-xs uppercase tracking-[0.4em] text-white"
      >
        ⬜ {white?.name} · one shot
      </motion.div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        <h2 className="font-display text-3xl font-bold leading-tight">
          What was the<br />civilian word?
        </h2>
        <input
          autoFocus
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="type your guess…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full max-w-xs border-b-2 border-white/30 bg-transparent pb-2 text-center font-display text-3xl text-white placeholder:text-white/20 focus:border-white focus:outline-none"
        />
        <p className="text-xs text-white/35">
          Nail it and Mr. White steals the win.
        </p>
      </div>

      <Button onClick={submit} disabled={!guess.trim()}>
        Lock in Guess
      </Button>
    </Screen>
  );
}
