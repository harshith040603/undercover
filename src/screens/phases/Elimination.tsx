import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';
import type { EliminationCause, Player, Role } from '@/engine/types';

const ROLE_META: Record<Role, { label: string; color: string; dashed?: boolean }> = {
  civilian: { label: 'Civilian', color: 'var(--color-civilian)' },
  undercover: { label: 'Undercover', color: 'var(--color-undercover)' },
  white: { label: 'Mr. White', color: 'var(--color-ink)', dashed: true },
  revenger: { label: 'Revenger', color: 'var(--color-undercover)' },
  killer: { label: 'Serial Killer', color: 'var(--color-ink)' },
};

const CAUSE_NOTE: Partial<Record<EliminationCause, string>> = {
  revenge: 'dragged down in revenge',
  heartbreak: 'died of heartbreak',
};

const HEADERS: Partial<Record<EliminationCause, string>> = {
  revenge: 'Revenge taken',
  murder: 'Found at dawn',
};

export function Elimination() {
  const game = useGame((s) => s.game)!;
  const dispatch = useGame((s) => s.dispatch);

  // Every death from this resolution (vote target first, then cascades).
  // Fallback to the single id for games persisted before cascades existed.
  const deadIds =
    game.lastEliminatedIds && game.lastEliminatedIds.length > 0
      ? game.lastEliminatedIds
      : game.lastEliminatedId
        ? [game.lastEliminatedId]
        : [];
  const fallen = deadIds
    .map((id) => game.players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  useEffect(() => {
    haptic('buzz');
  }, []);

  // The Killer stayed quiet → dawn breaks with no body.
  if (fallen.length === 0 && game.quietNight) {
    return (
      <Screen className="items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <span className="stamp stamp-worn -rotate-6 text-2xl text-ink/60">No incident</span>
          <h2 className="font-display text-4xl text-ink">Everyone wakes.</h2>
          <p className="max-w-[15rem] text-sm text-ink/60">
            The night passed without a sound. Or did it?
          </p>
          <div className="w-64 pt-6">
            <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>Next round</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // Tie → no elimination this round.
  if (fallen.length === 0) {
    return (
      <Screen className="items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <span className="stamp stamp-worn -rotate-6 text-2xl text-ink/60">Tie vote</span>
          <h2 className="font-display text-4xl text-ink">Deadlock.</h2>
          <p className="max-w-[15rem] text-sm text-ink/60">
            The vote tied. Nobody leaves this round.
          </p>
          <div className="w-64 pt-6">
            <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>Next round</Button>
          </div>
        </motion.div>
      </Screen>
    );
  }

  const primary = fallen[0];
  const causeOf = (id: string): EliminationCause =>
    [...game.history].reverse().find((e) => e.playerId === id)?.cause ?? 'vote';
  const isWhiteVotedOut = primary.role === 'white' && causeOf(primary.id) === 'vote';
  const header = HEADERS[causeOf(primary.id)] ?? 'Eliminated';
  const single = fallen.length === 1;

  const nextLabel = game.awaitingWhiteGuess
    ? "Mr. White's guess →"
    : game.awaitingRevengeBy
      ? 'Revenge →'
      : game.winner
        ? 'See result'
        : 'Next round';

  return (
    <Screen className="items-center justify-between py-10 text-center">
      <p className="pt-4 text-sm uppercase tracking-[0.3em] text-ink/50">{header}</p>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {fallen.map((p, i) => (
          <FallenCard
            key={p.id}
            player={p}
            cause={causeOf(p.id)}
            compact={!single}
            delay={i * 0.5}
          />
        ))}

        {isWhiteVotedOut && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-[15rem] text-sm text-ink/65"
          >
            Mr. White gets one shot at the civilian word…
          </motion.p>
        )}
        {game.awaitingRevengeBy && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-[15rem] text-sm font-bold text-undercover"
          >
            The Revenger doesn't fall alone…
          </motion.p>
        )}
      </div>

      <Button
        variant={game.awaitingWhiteGuess || game.awaitingRevengeBy ? 'glass' : 'primary'}
        onClick={() => dispatch({ type: 'NEXT_ROUND' })}
      >
        {nextLabel}
      </Button>
    </Screen>
  );
}

/** A personnel card pulled from the file and stamped with the fallen's role. */
function FallenCard({
  player,
  cause,
  compact,
  delay,
}: {
  player: Player;
  cause: EliminationCause;
  compact: boolean;
  delay: number;
}) {
  const meta = ROLE_META[player.role];
  const note = CAUSE_NOTE[cause];
  const isWhite = player.role === 'white';

  if (compact) {
    // Two or more fell together — horizontal record slips.
    return (
      <motion.div
        initial={{ y: -18, rotate: 3, opacity: 0 }}
        animate={{ y: 0, rotate: delay > 0 ? 1 : -1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16, delay }}
        className="sheet relative flex w-full max-w-xs items-center gap-3 rounded-card px-4 py-4 text-left shadow-[0.3rem_0.3rem_0_rgba(43,36,22,0.16)]"
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-2xl leading-none text-ink">
            {player.name}
          </span>
          {note && <span className="mt-1 block text-xs italic text-ink/55">{note}</span>}
          {!isWhite && player.word && (
            <span className="mt-0.5 block text-xs text-ink/55">
              word: <span className="font-bold text-ink">{player.word}</span>
            </span>
          )}
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: delay + 0.3, duration: 0.15, ease: 'easeIn' }}
          className={`stamp stamp-worn shrink-0 text-base ${meta.dashed ? 'border-dashed' : ''}`}
          style={{ color: meta.color }}
        >
          {meta.label}
        </motion.span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -24, rotate: 4, opacity: 0 }}
      animate={{ y: 0, rotate: -1.5, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 16 }}
      className="sheet relative flex aspect-[3/4] w-60 flex-col items-center justify-center gap-4 rounded-card p-6 shadow-[0.4rem_0.4rem_0_rgba(43,36,22,0.18)]"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink/40">
        Personnel record
      </span>
      <span className="font-display text-4xl leading-none text-ink">{player.name}</span>
      {!isWhite && player.word && (
        <span className="text-xs text-ink/55">
          word: <span className="font-bold text-ink">{player.word}</span>
        </span>
      )}

      <motion.span
        initial={{ opacity: 0, scale: 1.8, rotate: 2 }}
        animate={{ opacity: 1, scale: 1, rotate: -10 }}
        transition={{ delay: 0.35, duration: 0.16, ease: 'easeIn' }}
        className={`stamp stamp-worn absolute bottom-8 text-3xl ${meta.dashed ? 'border-dashed' : ''}`}
        style={{ color: meta.color }}
      >
        {meta.label}
      </motion.span>
    </motion.div>
  );
}
