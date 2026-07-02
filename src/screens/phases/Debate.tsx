import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

export function Debate() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const total = game.config.rules.debateSeconds;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(true);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(ref.current!);
          haptic('buzz');
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const pct = total > 0 ? remaining / total : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Screen spotlight className="items-center justify-between py-8 text-center">
      <TopBar title={`Round ${game.round} · Debate`} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-8 max-w-[15rem] text-sm text-ink/60">
          Accuse. Defend. Second-guess. Who's bluffing?
        </p>

        {/* Interrogation stopwatch: dotted paper track, ink hand */}
        <div className="relative h-56 w-56">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(43,36,22,0.18)"
              strokeWidth="3"
              strokeDasharray="0.5 5.5"
              strokeLinecap="round"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={remaining === 0 ? 'var(--color-undercover)' : 'var(--color-ink)'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - pct) }}
              transition={{ ease: 'linear', duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-display text-6xl tabular-nums ${
                remaining === 0 ? 'text-undercover' : 'text-ink'
              }`}
            >
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="mt-2 text-xs font-bold uppercase tracking-widest text-ink/50 active:text-ink"
            >
              {running ? 'Pause' : remaining === 0 ? "Time's up" : 'Resume'}
            </button>
          </div>
        </div>
      </div>

      <Button variant="danger" onClick={() => dispatch({ type: 'OPEN_VOTE' })}>
        Call the vote
      </Button>
    </Screen>
  );
}
