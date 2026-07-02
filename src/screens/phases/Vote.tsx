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

  // Each living player votes at most once and never for themselves, so the
  // table can cast N votes total and any one player can receive at most N−1.
  const perPlayerMax = Math.max(0, livingCount - 1);
  const canAdd = (id: string) =>
    totalCast < livingCount && (counts[id] ?? 0) < perPlayerMax;

  // Highlight the current leader(s) so the host can sanity-check the count.
  const max = Math.max(0, ...Object.values(counts));
  const leaders = max > 0 ? targets.filter((p) => (counts[p.id] ?? 0) === max).map((p) => p.id) : [];

  const bump = (id: string, delta: number) => {
    if (delta > 0 && !canAdd(id)) return;
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
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
        <p className="text-sm text-ink/65">
          “Hands up for who you suspect.” Count the hands, tap to enter each total.
        </p>
        <p className="mt-1 text-xs font-bold text-ink/45">
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
            canAdd={canAdd(p.id)}
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
          Eliminate top vote
        </Button>
      </div>
    </Screen>
  );
}

/** Pen-and-paper tally marks: groups of four strokes with a diagonal strike. */
function Tally({ n }: { n: number }) {
  const groups: number[] = [];
  for (let i = 0; i < Math.floor(n / 5); i++) groups.push(5);
  if (n % 5) groups.push(n % 5);

  if (n === 0) return <span className="text-sm text-ink/25">—</span>;

  return (
    <span className="flex items-center gap-2" aria-hidden>
      {groups.map((g, gi) => (
        <span key={gi} className="relative flex items-center gap-[3px]">
          {Array.from({ length: g === 5 ? 4 : g }).map((_, si) => (
            <span key={si} className="h-5 w-[2px] rounded-full bg-current" />
          ))}
          {g === 5 && (
            <span className="absolute left-1/2 top-1/2 h-[2px] w-[26px] -translate-x-1/2 -translate-y-1/2 -rotate-[55deg] rounded-full bg-current" />
          )}
        </span>
      ))}
    </span>
  );
}

function CountRow({
  player,
  count,
  leading,
  canAdd,
  onAdd,
  onSub,
}: {
  player: Player;
  count: number;
  leading: boolean;
  canAdd: boolean;
  onAdd: () => void;
  onSub: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-card border px-3 py-3 transition ${
        leading ? 'border-2 border-undercover bg-undercover/10' : 'sheet'
      }`}
    >
      {/* Tap the name area to add a vote — the fast path. */}
      <button
        onClick={onAdd}
        disabled={!canAdd}
        className="min-w-0 flex-1 py-1 text-left text-base font-bold active:opacity-70 disabled:active:opacity-100"
      >
        <span className="block truncate">{player.name}</span>
      </button>

      {/* The host's tally, scratched next to the name */}
      <motion.span
        key={count}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        className={`flex min-w-[3.5rem] items-center justify-end gap-2 ${
          leading ? 'text-undercover' : 'text-ink/75'
        }`}
      >
        <Tally n={count} />
        <span className="w-5 text-right font-display text-xl tabular-nums">{count}</span>
      </motion.span>

      <button
        onClick={onSub}
        disabled={count === 0}
        aria-label={`One fewer vote for ${player.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.3rem] border-2 border-ink/30 text-xl text-ink active:bg-ink active:text-paper disabled:opacity-25"
      >
        −
      </button>

      <button
        onClick={onAdd}
        disabled={!canAdd}
        aria-label={`One more vote for ${player.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.3rem] border-2 border-ink/30 text-xl text-ink active:bg-ink active:text-paper disabled:opacity-25"
      >
        +
      </button>
    </div>
  );
}
