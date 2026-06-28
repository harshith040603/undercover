import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/engine/distribution';
import { haptic } from '@/lib/haptics';

const RANDOM_NAMES = [
  'Ace', 'Vex', 'Nova', 'Echo', 'Raven', 'Slate', 'Onyx', 'Zara',
  'Kit', 'Wren', 'Cyrus', 'Lux', 'Dash', 'Mira', 'Jett', 'Sol',
];

export function Players() {
  const nav = useNavigate();
  const { draft, setDraft } = useGame();
  const names = draft.names;

  const setName = (i: number, v: string) => {
    const next = names.slice();
    next[i] = v;
    setDraft({ names: next });
  };

  const add = () => {
    if (names.length >= MAX_PLAYERS) return;
    haptic('tick');
    setDraft({ names: [...names, ''] });
  };

  const removeAt = (i: number) => {
    if (names.length <= MIN_PLAYERS) return;
    haptic('tick');
    setDraft({ names: names.filter((_, idx) => idx !== i) });
  };

  const surprise = () => {
    haptic('tick');
    const shuffled = [...RANDOM_NAMES].sort(() => Math.random() - 0.5);
    setDraft({ names: names.map((_, i) => shuffled[i % shuffled.length]) });
  };

  const next = () => {
    // Roles screen auto-derives the distribution from the player count.
    nav('/setup');
  };

  return (
    <Screen className="pb-6">
      <TopBar title="Players" onBack={() => nav('/')} />

      <div className="mt-2 flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold">Who's playing?</h2>
        <span className="text-sm tabular-nums text-white/40">
          {names.length}/{MAX_PLAYERS}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/45">
        Add {MIN_PLAYERS}–{MAX_PLAYERS} players. Blank names auto-fill.
      </p>

      <div className="mt-5 flex-1 space-y-2 overflow-y-auto">
        <AnimatePresence initial={false}>
          {names.map((name, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="flex items-center gap-2"
            >
              <span className="w-6 shrink-0 text-center text-sm tabular-nums text-white/30">
                {i + 1}
              </span>
              <input
                value={name}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                maxLength={16}
                autoComplete="off"
                className="h-12 flex-1 rounded-xl border border-glass-edge bg-glass px-4 text-base text-white placeholder:text-white/25 focus:border-civilian focus:outline-none"
              />
              <button
                onClick={() => removeAt(i)}
                disabled={names.length <= MIN_PLAYERS}
                aria-label="Remove player"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white/40 active:bg-white/10 disabled:opacity-20"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="glass" onClick={add} disabled={names.length >= MAX_PLAYERS}>
          + Add
        </Button>
        <Button variant="ghost" onClick={surprise}>
          🎲 Surprise me
        </Button>
      </div>
      <div className="mt-3">
        <Button onClick={next}>Next: Roles & Pack</Button>
      </div>
    </Screen>
  );
}
