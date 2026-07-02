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

/** File-folder tab used as a section header. */
function SectionTab({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="tab text-[10px] font-bold uppercase tracking-[0.2em] text-ink/70">
      {children}
    </h3>
  );
}

/** Small inked square marking a role's stamp color. */
function RoleMark({ color, dashed = false }: { color?: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3 w-3 shrink-0 ${dashed ? 'border-2 border-dashed border-ink/50' : ''}`}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

function Stepper({
  label,
  mark,
  value,
  onChange,
  min,
  max,
  accent,
}: {
  label: string;
  mark: React.ReactNode;
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
    <div className="sheet flex items-center justify-between rounded-card px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-bold" style={{ color: accent }}>
        {mark}
        {label}
      </span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => step(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-[0.3rem] border-2 border-ink/30 text-xl text-ink active:bg-ink active:text-paper"
          aria-label={`Fewer ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center font-display text-2xl tabular-nums text-ink">{value}</span>
        <button
          onClick={() => step(1)}
          className="flex h-9 w-9 items-center justify-center rounded-[0.3rem] border-2 border-ink/30 text-xl text-ink active:bg-ink active:text-paper"
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
        <section>
          <SectionTab>Roles · {total} players</SectionTab>
          <div className="space-y-2 rounded-b-card rounded-tr-card border border-ink/25 bg-paper/40 p-2">
            <div className="flex items-center justify-between rounded-card bg-civilian/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-civilian">
                <RoleMark color="var(--color-civilian)" />
                Civilians
              </span>
              <span className="font-display text-2xl tabular-nums text-civilian">{civilians}</span>
            </div>
            <Stepper
              label="Undercover"
              mark={<RoleMark color="var(--color-undercover)" />}
              value={draft.undercover}
              onChange={(v) => setDraft({ undercover: v })}
              min={1}
              max={total - 1}
              accent="var(--color-undercover)"
            />
            <Stepper
              label="Mr. White"
              mark={<RoleMark dashed />}
              value={draft.white}
              onChange={(v) => setDraft({ white: v })}
              min={0}
              max={total - 2}
              accent="var(--color-ink)"
            />
            <p
              className={`px-2 pb-1 text-xs ${check.ok ? 'text-ink/50' : 'font-bold text-undercover'}`}
              role="status"
            >
              {check.ok
                ? 'Civilians hold a strict majority. Good to go.'
                : check.reason}
            </p>
          </div>
        </section>

        {/* Difficulty */}
        <section>
          <SectionTab>Difficulty</SectionTab>
          <div className="grid grid-cols-3 gap-2 rounded-b-card rounded-tr-card border border-ink/25 bg-paper/40 p-2">
            {DIFFS.map((d) => {
              const active = draft.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    haptic('tick');
                    setDraft({ difficulty: d.id });
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-card border-2 px-2 py-3 text-center transition ${
                    active
                      ? 'border-ink bg-ink text-paper'
                      : 'sheet border-ink/20 text-ink/60'
                  }`}
                >
                  <span className="font-display text-base tracking-wide">{d.label}</span>
                  <span className={`text-[10px] leading-tight ${active ? 'text-paper/60' : 'text-ink/40'}`}>
                    {d.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pack */}
        <section>
          <SectionTab>Word pack</SectionTab>
          <div className="grid grid-cols-2 gap-2 rounded-b-card rounded-tr-card border border-ink/25 bg-paper/40 p-2">
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
        Deal & start
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
      className={`flex items-center gap-2 rounded-card border-2 px-3 py-3 text-left transition ${
        active ? 'border-civilian bg-civilian/10' : 'sheet border-ink/20'
      }`}
    >
      <span className="text-xl grayscale-[0.35]">{emoji}</span>
      <span className={`truncate text-sm font-bold ${active ? 'text-civilian' : 'text-ink/75'}`}>
        {name}
      </span>
    </button>
  );
}
