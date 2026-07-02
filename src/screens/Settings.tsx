import { useNavigate } from 'react-router-dom';
import { Screen, TopBar } from '@/ui/Screen';
import { useGame } from '@/store/gameStore';
import type { GameRules, TieRule, WhiteMatch } from '@/engine/types';
import { haptic } from '@/lib/haptics';

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        haptic('tick');
        onChange(!on);
      }}
      className="sheet flex w-full items-center justify-between gap-4 rounded-card px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink/50">{hint}</span>}
      </span>
      {/* Checkbox drawn like a form field: empty box → inked X */}
      <span
        aria-hidden
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.25rem] border-2 font-display text-xl leading-none transition ${
          on ? 'border-civilian bg-civilian text-paper' : 'border-ink/35 text-transparent'
        }`}
      >
        ✕
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="sheet rounded-card p-3">
      <p className="mb-2 text-sm font-bold text-ink">{label}</p>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              haptic('tick');
              onChange(o.id);
            }}
            className={`flex-1 rounded-[0.3rem] border-2 px-2 py-2 text-xs transition ${
              value === o.id
                ? 'border-ink bg-ink font-bold text-paper'
                : 'border-ink/20 bg-transparent text-ink/60'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const nav = useNavigate();
  const { rules, setRules } = useGame();
  const set = <K extends keyof GameRules>(k: K, v: GameRules[K]) => setRules({ [k]: v });

  return (
    <Screen className="pb-6">
      <TopBar title="Settings" onBack={() => nav('/')} />

      <div className="mt-2 flex-1 space-y-3 overflow-y-auto pb-4">
        <Toggle
          label="Blind counts"
          hint="Hide how many imposters exist — max paranoia"
          on={rules.blindCounts}
          onChange={(v) => set('blindCounts', v)}
        />
        <Toggle
          label="One-word mode"
          hint="Clues must be a single word"
          on={rules.oneWordMode}
          onChange={(v) => set('oneWordMode', v)}
        />
        <Toggle label="Haptics" on={rules.haptics} onChange={(v) => set('haptics', v)} />
        <Toggle label="Sound" on={rules.sound} onChange={(v) => set('sound', v)} />

        <Segmented<TieRule>
          label="On a vote tie"
          value={rules.tieRule}
          onChange={(v) => set('tieRule', v)}
          options={[
            { id: 'revote', label: 'Revote' },
            { id: 'suddenDeath', label: 'Sudden death' },
            { id: 'noElim', label: 'No elim' },
          ]}
        />
        <Segmented<WhiteMatch>
          label="Mr. White guess matching"
          value={rules.whiteMatch}
          onChange={(v) => set('whiteMatch', v)}
          options={[
            { id: 'exact', label: 'Exact' },
            { id: 'lenient', label: 'Lenient' },
            { id: 'fuzzy', label: 'Fuzzy' },
          ]}
        />

        <div className="sheet rounded-card p-3">
          <p className="mb-2 text-sm font-bold text-ink">
            Debate timer: <span className="tabular-nums">{rules.debateSeconds}s</span>
          </p>
          <input
            type="range"
            min={30}
            max={180}
            step={15}
            value={rules.debateSeconds}
            onChange={(e) => set('debateSeconds', Number(e.target.value))}
            className="w-full accent-undercover"
          />
        </div>
      </div>
    </Screen>
  );
}
