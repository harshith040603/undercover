import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

type Step = 'gate' | 'act';

/**
 * Night pass-around. Every living player takes the phone and "visits someone
 * in their dreams" — the identical screen for everyone is the cover: only the
 * Serial Killer's visit is real. The pick is held locally and resolved once
 * the phone has gone full circle, so nothing on screen ever singles out
 * the Killer.
 */
export function Night() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);

  const order = useMemo(
    () => [...game.players].filter((p) => p.alive).sort((a, b) => a.seat - b.seat),
    [game.players],
  );

  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>('gate');
  const [victimId, setVictimId] = useState<string | null>(null);

  const player = order[idx];
  const isLast = idx === order.length - 1;

  // After NIGHT_RESOLVE the victim drops out of `order` while this screen is
  // still exit-animating — render nothing during that frame.
  if (!player) return null;

  const targets = order.filter((p) => p.id !== player.id);

  const visit = (targetId: string | null) => {
    haptic('tick');
    // Only the Killer's dream is real; everyone else's tap is theater.
    const pick = player.role === 'killer' ? targetId : victimId;
    if (isLast) {
      dispatch({ type: 'NIGHT_RESOLVE', victimId: pick });
      return;
    }
    setVictimId(pick);
    setIdx((i) => i + 1);
    setStep('gate');
  };

  // ── Pass gate ──
  if (step === 'gate') {
    return (
      <Screen className="items-center justify-center text-center">
        <motion.div
          key={player.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-ink/55">
            Round {game.round} · Lights out
          </p>
          <p className="text-sm uppercase tracking-[0.3em] text-ink/50">Pass the phone to</p>
          <h2 className="font-display text-6xl text-ink">{player.name}</h2>
          <p className="max-w-[16rem] text-xs text-ink/50">
            Everyone visits someone in their dreams. One visit is real.
          </p>
          <p className="text-xs font-bold text-ink/40">
            {idx + 1} of {order.length}
          </p>
          <div className="w-64 pt-6">
            <Button
              onClick={() => {
                haptic('tick');
                setStep('act');
              }}
            >
              I'm {player.name} — dream
            </Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // ── The dream: identical for everyone ──
  return (
    <Screen className="pb-6">
      <div className="mt-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-ink/55">
          Lights out
        </p>
        <h2 className="mt-3 font-display text-4xl text-ink">Who do you visit?</h2>
        <p className="mx-auto mt-2 max-w-[17rem] text-sm text-ink/60">
          Pick anyone and pass on. Dreams are harmless — unless you're the Killer.
        </p>
      </div>

      <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
        {targets.map((p) => (
          <button
            key={p.id}
            onClick={() => visit(p.id)}
            className="sheet flex w-full items-center gap-3 rounded-card px-4 py-3 text-left active:bg-manila-2"
          >
            <span aria-hidden className="h-3 w-3 shrink-0 rotate-45 border-2 border-ink/30" />
            <span className="flex-1 text-base font-bold">{p.name}</span>
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={() => visit(null)}>
        Visit no one
      </Button>
    </Screen>
  );
}
