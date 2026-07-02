import { useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

/**
 * A voted-out Revenger's last act: pick one living player to fall with them.
 * The phone goes to the Revenger; the choice is public and final.
 */
export function Revenge() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const revenger = game.players.find((p) => p.id === game.awaitingRevengeBy);
  const living = game.players
    .filter((p) => p.alive)
    .sort((a, b) => a.seat - b.seat);

  const [targetId, setTargetId] = useState<string | null>(null);

  const strike = () => {
    if (!targetId) return;
    haptic('buzz');
    dispatch({ type: 'REVENGE', targetId });
  };

  return (
    <Screen className="pb-6">
      <div className="mt-8 text-center">
        <motion.span
          initial={{ opacity: 0, scale: 1.7, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ duration: 0.16, ease: 'easeIn' }}
          className="stamp stamp-worn text-3xl text-undercover"
        >
          Revenge
        </motion.span>
        <h2 className="mt-5 font-display text-4xl text-ink">{revenger?.name}'s last act</h2>
        <p className="mx-auto mt-2 max-w-[17rem] text-sm text-ink/60">
          The Revenger falls — but not alone. {revenger?.name}, choose who goes down with you.
        </p>
      </div>

      <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
        {living.map((p) => {
          const picked = p.id === targetId;
          return (
            <button
              key={p.id}
              onClick={() => {
                haptic('tick');
                setTargetId(p.id);
              }}
              className={`flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition ${
                picked ? 'border-2 border-undercover bg-undercover/10' : 'sheet'
              }`}
            >
              <span
                aria-hidden
                className={`h-3 w-3 shrink-0 rotate-45 border-2 ${
                  picked ? 'border-undercover bg-undercover' : 'border-ink/30'
                }`}
              />
              <span className={`flex-1 text-base font-bold ${picked ? 'text-undercover' : ''}`}>
                {p.name}
              </span>
              {picked && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-undercover">
                  Marked
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button variant="danger" onClick={strike} disabled={!targetId}>
        Take them down
      </Button>
    </Screen>
  );
}
