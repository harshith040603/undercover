import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { Player } from '@/engine/types';

/**
 * Hand-raise voting: nobody votes on the phone. Players raise hands, the host
 * counts them and enters the number per player; the app eliminates the top.
 */
export function Vote() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);
  const isRevote = game.tiedIds.length > 0;

  const targets = useMemo(() => {
    const living = game.players.filter((p) => p.alive);
    if (isRevote) return living.filter((p) => game.tiedIds.includes(p.id));
    return living.sort((a, b) => a.seat - b.seat);
  }, [game.players, game.tiedIds, isRevote]);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const totalCast = Object.values(counts).reduce((a, b) => a + b, 0);
  const livingCount = game.players.filter((p) => p.alive).length;

  // Highlight the current leader(s) so the host can sanity-check the count.
  const max = Math.max(0, ...Object.values(counts));
  const leaders = max > 0 ? targets.filter((p) => (counts[p.id] ?? 0) === max).map((p) => p.id) : [];

  const bump = (id: string, delta: number) => {
    setCounts((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      return { ...c, [id]: next };
    });
    haptic('tick');
  };

  const eliminate = () => {
    haptic('thump');
    dispatch({ type: 'RESOLVE_VOTE', counts });
  };

  return (
    <Screen className="pb-6">
      <TopBar title={isRevote ? 'Revote!' : `Round ${game.round} · Vote`} />

      <div className="mt-1 text-center">
        <p className="text-sm text-white/55">
          “Hands up for who you suspect.” Count the hands, tap to enter each total.
        </p>
        <p className="mt-1 text-xs text-white/35">
          {totalCast} of {livingCount} {livingCount === 1 ? 'vote' : 'votes'} counted
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {targets.map((p) => (
          <CountRow
            key={p.id}
            player={p}
            count={counts[p.id] ?? 0}
            leading={leaders.includes(p.id)}
            onAdd={() => bump(p.id, 1)}
            onSub={() => bump(p.id, -1)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Button variant="ghost" onClick={() => setCounts({})} disabled={totalCast === 0}>
          Clear
        </Button>
        <Button variant="danger" onClick={eliminate} disabled={totalCast === 0}>
          Eliminate Top Vote
        </Button>
      </div>
    </Screen>
  );
}

function CountRow({
  player,
  count,
  leading,
  onAdd,
  onSub,
}: {
  player: Player;
  count: number;
  leading: boolean;
  onAdd: () => void;
  onSub: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
        leading ? 'border-undercover bg-undercover/10' : 'border-glass-edge bg-glass'
      }`}
    >
      {/* Tap the name area to add a vote — the fast path. */}
      <button onClick={onAdd} className="flex-1 py-1 text-left text-base active:opacity-70">
        {player.name}
      </button>

      <button
        onClick={onSub}
        disabled={count === 0}
        aria-label={`One fewer vote for ${player.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl active:bg-white/20 disabled:opacity-25"
      >
        −
      </button>

      <motion.span
        key={count}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={`w-7 text-center text-xl font-bold tabular-nums ${
          leading ? 'text-undercover' : 'text-white/80'
        }`}
      >
        {count}
      </motion.span>

      <button
        onClick={onAdd}
        aria-label={`One more vote for ${player.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl active:bg-white/20"
      >
        +
      </button>
    </div>
  );
}
