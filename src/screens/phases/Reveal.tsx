import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { Player } from '@/engine/types';

type Step = 'gate' | 'peeking' | 'done';

const ROLE_LABEL: Record<Player['role'], string> = {
  civilian: 'You are a Civilian',
  undercover: 'You are a Civilian', // Undercover only sees their word — doubt is the game (PRD §2.1)
  white: 'You are Mr. White',
};

export function Reveal() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const blind = game.config.rules.blindCounts;

  // Pass order follows seat order so it matches the physical circle.
  const order = useMemo(
    () => [...game.players].sort((a, b) => a.seat - b.seat),
    [game.players],
  );

  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>('gate');
  const [held, setHeld] = useState(false);

  const player = order[idx];
  const isLast = idx === order.length - 1;

  const startPeek = () => {
    haptic('tick');
    setStep('peeking');
  };

  const confirmHide = () => {
    haptic('thump');
    if (isLast) {
      setStep('done');
    } else {
      setIdx((i) => i + 1);
      setStep('gate');
    }
    setHeld(false);
  };

  if (step === 'done') {
    return (
      <Screen spotlight className="items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <p className="font-display text-xs uppercase tracking-[0.3em] text-amber/70">
            Everyone has their word
          </p>
          <h2 className="font-display text-4xl font-bold">Time to talk.</h2>
          <p className="max-w-[16rem] text-sm text-white/45">
            Each living player gives one clue, in turn. Don't say your word.
          </p>
          <div className="w-full pt-4">
            <Button onClick={() => dispatch({ type: 'REVEAL_DONE' })}>Start Clues</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // ── Pass gate: opaque, names the next player ──
  if (step === 'gate') {
    return (
      <Screen className="items-center justify-center text-center">
        <motion.div
          key={player.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Pass the phone to</p>
          <h2 className="font-display text-5xl font-extrabold">{player.name}</h2>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-3xl text-amber"
          >
            ↓
          </motion.div>
          <p className="text-xs text-white/30">
            {idx + 1} of {order.length}
          </p>
          <div className="w-64 pt-6">
            <Button onClick={startPeek}>I'm {player.name} — Reveal</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // ── Peek: word only visible while finger is held down ──
  return (
    <Screen spotlight className="items-center justify-between py-8 text-center">
      <p className="pt-6 text-sm uppercase tracking-[0.3em] text-white/40">{player.name}</p>

      <div
        className="relative flex w-full flex-1 select-none items-center justify-center"
        onPointerDown={() => {
          setHeld(true);
          haptic('tick');
        }}
        onPointerUp={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          className="flex aspect-[3/4] w-64 flex-col items-center justify-center rounded-card border border-glass-edge bg-noir-3 p-6"
          animate={{ rotateY: held ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence mode="wait">
            {held ? (
              <motion.div
                key="front"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <span className="font-display text-[11px] uppercase tracking-[0.25em] text-white/40">
                  {blind ? 'Your word' : ROLE_LABEL[player.role]}
                </span>
                {player.role === 'white' ? (
                  <span className="font-display text-3xl font-bold text-white">— BLANK —</span>
                ) : (
                  <span className="font-display text-4xl font-extrabold leading-tight text-civilian">
                    {player.word}
                  </span>
                )}
                {player.role === 'white' && (
                  <span className="max-w-[12rem] text-xs text-white/45">
                    You get no word. Listen, blend in, and reconstruct it.
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 text-white/30"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <span className="text-5xl">🔒</span>
                <span className="text-xs uppercase tracking-widest">Hold to reveal</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="w-full space-y-2">
        <p className="text-xs text-white/40">
          {held ? 'Release to hide' : 'Press and hold the card'}
        </p>
        <Button variant="glass" onClick={confirmHide} disabled={held}>
          {isLast ? 'Got it — finish' : 'Got it — pass on'}
        </Button>
      </div>
    </Screen>
  );
}
