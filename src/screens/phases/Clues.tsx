import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

export function Clues() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);

  // Living players in clockwise speaking order from the first speaker.
  const order = useMemo(() => {
    const ring = [...game.players].sort((a, b) => a.seat - b.seat).filter((p) => p.alive);
    const start = ring.findIndex((p) => p.id === game.firstSpeakerId);
    return start < 0 ? ring : [...ring.slice(start), ...ring.slice(0, start)];
  }, [game.players, game.firstSpeakerId]);

  const currentIdx = order.findIndex((p) => p.id === game.currentSpeakerId);
  const isLast = currentIdx === order.length - 1;
  const current = order[currentIdx];

  const advance = () => {
    haptic('tick');
    if (isLast) dispatch({ type: 'START_DEBATE' });
    else dispatch({ type: 'NEXT_SPEAKER' });
  };

  return (
    <Screen spotlight className="pb-6">
      <TopBar title={`Round ${game.round} · Clues`} />

      <div className="mt-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ink/50">On the record</p>
        <motion.h2
          key={current?.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-2 inline-block border-b-4 border-undercover font-display text-5xl leading-tight text-ink"
        >
          {current?.name}
        </motion.h2>
        <p className="mt-3 text-sm text-ink/60">
          {game.config.rules.oneWordMode
            ? 'Say exactly ONE word describing your secret word.'
            : 'Give one short clue about your secret word.'}
        </p>
      </div>

      <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
        {order.map((p, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-card border px-4 py-3 transition ${
                active
                  ? 'border-2 border-ink bg-manila-2'
                  : done
                    ? 'border-transparent bg-ink/[0.04] opacity-55'
                    : 'sheet'
              }`}
            >
              <span className="w-7 text-center text-sm font-bold tabular-nums text-ink/40">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`flex-1 text-base ${done ? 'line-through decoration-ink/50' : 'font-bold'}`}>
                {p.name}
              </span>
              {done && <span className="font-bold text-civilian">✓</span>}
              {active && (
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-undercover"
                >
                  ●
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={advance}>{isLast ? 'Everyone spoke → debate' : 'Next speaker'}</Button>
    </Screen>
  );
}
