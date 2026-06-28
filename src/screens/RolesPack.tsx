import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { defaultDistribution, validateCounts } from '@/engine/distribution';
import { BUNDLED_PACKS } from '@/data/packs';
import type { Difficulty } from '@/engine/types';
import { haptic } from '@/lib/haptics';

const DIFFS: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Obviously different' },
  { id: 'normal', label: 'Normal', hint: 'Same family' },
  { id: 'hard', label: 'Hard', hint: 'Sneaky-close' },
];

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  accent: string;
}) {
  const step = (delta: number) => {
    const v = Math.max(min, Math.min(max, value + delta));
    if (v !== value) {
      haptic('tick');
      onChange(v);
    }
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-glass-edge bg-glass px-4 py-3">
      <span className="text-sm" style={{ color: accent }}>
        {label}
      </span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => step(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl active:bg-white/20"
          aria-label={`Fewer ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-lg font-semibold tabular-nums">{value}</span>
        <button
          onClick={() => step(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl active:bg-white/20"
          aria-label={`More ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function RolesPack() {
  const nav = useNavigate();
  const { draft, setDraft, startGame } = useGame();
  const total = draft.names.length;

  // Auto-assign the balanced ratio whenever the player count changes
  // (PRD §2.5). The host can still override with the steppers afterwards.
  useEffect(() => {
    if (draft.countFor !== total) {
      const d = defaultDistribution(total);
      setDraft({ undercover: d.undercover, white: d.white, countFor: total });
    }
  }, [total, draft.countFor, setDraft]);

  const civilians = total - draft.undercover - draft.white;
  const check = validateCounts(total, draft.undercover, draft.white);

  const start = () => {
    if (!check.ok) return;
    haptic('thump');
    startGame();
    nav('/play');
  };

  return (
    <Screen className="pb-6">
      <TopBar title="Roles & Pack" onBack={() => nav('/players')} />

      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        {/* Roles */}
        <section className="space-y-2">
          <h3 className="font-display text-xs uppercase tracking-[0.2em] text-white/40">
            Roles · {total} players
          </h3>
          <div className="flex items-center justify-between rounded-xl bg-civilian/10 px-4 py-3">
            <span className="text-sm text-civilian">🟦 Civilians</span>
            <span className="text-lg font-semibold tabular-nums text-civilian">{civilians}</span>
          </div>
          <Stepper
            label="🟥 Undercover"
            value={draft.undercover}
            onChange={(v) => setDraft({ undercover: v })}
            min={1}
            max={total - 1}
            accent="var(--color-undercover)"
          />
          <Stepper
            label="⬜ Mr. White"
            value={draft.white}
            onChange={(v) => setDraft({ white: v })}
            min={0}
            max={total - 2}
            accent="var(--color-white)"
          />
          <p
            className={`text-xs ${check.ok ? 'text-white/40' : 'text-undercover'}`}
            role="status"
          >
            {check.ok
              ? 'Civilians hold a strict majority. Good to go.'
              : check.reason}
          </p>
        </section>

        {/* Difficulty */}
        <section className="space-y-2">
          <h3 className="font-display text-xs uppercase tracking-[0.2em] text-white/40">
            Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {DIFFS.map((d) => {
              const active = draft.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    haptic('tick');
                    setDraft({ difficulty: d.id });
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 text-center transition ${
                    active
                      ? 'border-amber bg-amber/15 text-white'
                      : 'border-glass-edge bg-glass text-white/60'
                  }`}
                >
                  <span className="text-sm font-semibold">{d.label}</span>
                  <span className="text-[10px] leading-tight text-white/40">{d.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pack */}
        <section className="space-y-2">
          <h3 className="font-display text-xs uppercase tracking-[0.2em] text-white/40">
            Word Pack
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <PackCard
              emoji="🎲"
              name="Random"
              active={draft.packId === 'random'}
              onClick={() => setDraft({ packId: 'random' })}
            />
            {BUNDLED_PACKS.map((p) => (
              <PackCard
                key={p.id}
                emoji={p.emoji}
                name={p.name}
                active={draft.packId === p.id}
                onClick={() => setDraft({ packId: p.id })}
              />
            ))}
          </div>
        </section>
      </div>

      <Button onClick={start} disabled={!check.ok}>
        Deal & Start
      </Button>
    </Screen>
  );
}

function PackCard({
  emoji,
  name,
  active,
  onClick,
}: {
  emoji: string;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic('tick');
        onClick();
      }}
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition ${
        active ? 'border-civilian bg-civilian/10' : 'border-glass-edge bg-glass'
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span className="truncate text-sm text-white/80">{name}</span>
    </button>
  );
}
