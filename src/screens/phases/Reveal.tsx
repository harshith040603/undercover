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
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/55">
            Everyone has their word
          </p>
          <h2 className="font-display text-5xl text-ink">Time to talk.</h2>
          <p className="max-w-[16rem] text-sm text-ink/60">
            Each living player gives one clue, in turn. Don't say your word.
          </p>
          <div className="w-full pt-4">
            <Button onClick={() => dispatch({ type: 'REVEAL_DONE' })}>Start clues</Button>
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
          <p className="text-sm uppercase tracking-[0.3em] text-ink/50">Pass the phone to</p>
          <h2 className="font-display text-6xl text-ink">{player.name}</h2>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-3xl text-undercover"
          >
            ↓
          </motion.div>
          <p className="text-xs font-bold text-ink/40">
            {idx + 1} of {order.length}
          </p>
          <div className="w-64 pt-6">
            <Button onClick={startPeek}>I'm {player.name} — reveal</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // ── Peek: word only visible while finger is held down ──
  return (
    <Screen spotlight className="items-center justify-between py-8 text-center">
      <p className="pt-6 text-sm uppercase tracking-[0.3em] text-ink/50">{player.name}</p>

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
        {/* A classified slip pulled from the folder */}
        <motion.div
          className="sheet flex aspect-[3/4] w-64 flex-col items-center justify-center rounded-card p-6 shadow-[0.4rem_0.4rem_0_rgba(43,36,22,0.18)]"
          animate={{ rotate: held ? 0 : -1.5 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <AnimatePresence mode="wait">
            {held ? (
              <motion.div
                key="open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center gap-4"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink/50">
                  {blind ? 'Your word' : ROLE_LABEL[player.role]}
                </span>
                {player.role === 'white' ? (
                  <span className="border-2 border-dashed border-ink/40 px-4 py-2 font-display text-2xl text-ink/50">
                    No word
                  </span>
                ) : (
                  <span className="font-display text-4xl leading-tight text-ink">
                    {player.word}
                  </span>
                )}
                {player.role === 'white' && (
                  <span className="max-w-[12rem] text-xs text-ink/55">
                    You get no word. Listen, blend in, and reconstruct it.
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="sealed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center gap-5"
              >
                <span className="stamp stamp-worn -rotate-6 text-2xl text-undercover">
                  Classified
                </span>
                {/* Redaction bars standing in for the hidden word */}
                <div className="flex w-36 flex-col items-center gap-2" aria-hidden>
                  <span className="redact h-4 w-full" />
                  <span className="redact h-4 w-3/4" />
                  <span className="redact h-4 w-1/2" />
                </div>
                <span className="text-xs uppercase tracking-widest text-ink/45">
                  Hold to reveal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="w-full space-y-2">
        <p className="text-xs text-ink/50">
          {held ? 'Release to hide' : 'Press and hold the slip'}
        </p>
        <Button variant="glass" onClick={confirmHide} disabled={held}>
          {isLast ? 'Got it — finish' : 'Got it — pass on'}
        </Button>
      </div>
    </Screen>
  );
}
