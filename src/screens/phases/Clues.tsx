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
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Now speaking</p>
        <motion.h2
          key={current?.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-2 font-display text-5xl font-extrabold text-amber"
        >
          {current?.name}
        </motion.h2>
        <p className="mt-2 text-sm text-white/45">
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
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                active
                  ? 'border-amber bg-amber/15'
                  : done
                    ? 'border-transparent bg-white/[0.02] opacity-50'
                    : 'border-glass-edge bg-glass'
              }`}
            >
              <span className="w-5 text-center text-sm tabular-nums text-white/30">{i + 1}</span>
              <span className="flex-1 text-base">{p.name}</span>
              {done && <span className="text-civilian">✓</span>}
              {active && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-amber"
                >
                  ●
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={advance}>{isLast ? 'Everyone spoke → Debate' : 'Next speaker'}</Button>
    </Screen>
  );
}
