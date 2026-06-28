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
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-glass-edge bg-glass px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm text-white/90">{label}</span>
        {hint && <span className="block text-xs text-white/40">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-civilian' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
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
    <div className="rounded-xl border border-glass-edge bg-glass p-3">
      <p className="mb-2 text-sm text-white/90">{label}</p>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              haptic('tick');
              onChange(o.id);
            }}
            className={`flex-1 rounded-lg px-2 py-2 text-xs transition ${
              value === o.id ? 'bg-civilian text-noir font-semibold' : 'bg-white/5 text-white/60'
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

        <div className="rounded-xl border border-glass-edge bg-glass p-3">
          <p className="mb-2 text-sm text-white/90">Debate timer: {rules.debateSeconds}s</p>
          <input
            type="range"
            min={30}
            max={180}
            step={15}
            value={rules.debateSeconds}
            onChange={(e) => set('debateSeconds', Number(e.target.value))}
            className="w-full accent-civilian"
          />
        </div>
      </div>
    </Screen>
  );
}
