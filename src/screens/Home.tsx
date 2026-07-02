import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/lib/haptics';

const LETTERS = 'UNDERCOVER'.split('');
// The signature: one letter of the title arrives pre-redacted.
const REDACTED_INDEX = 6; // the "O"

/** Stamp-chip toggle for opting into a special role before starting. */
function RoleChip({ label, on, onTap }: { label: string; on: boolean; onTap: () => void }) {
  return (
    <button
      onClick={() => {
        haptic('tick');
        onTap();
      }}
      aria-pressed={on}
      className={`rounded-[0.3rem] border-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
        on
          ? 'border-ink bg-ink text-paper shadow-[0.15rem_0.15rem_0_rgba(43,36,22,0.25)]'
          : 'border-dashed border-ink/35 text-ink/55'
      }`}
    >
      {label}
    </button>
  );
}

export function Home() {
  const nav = useNavigate();
  const activeGame = useGame((s) => s.game);
  const { draft, setDraft } = useGame();

  return (
    <Screen spotlight className="items-center justify-between pb-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mb-8 text-[11px] font-bold uppercase tracking-[0.35em] text-ink/55"
        >
          Case file · the word imposter game
        </motion.p>

        <div className="relative">
          <h1 className="flex flex-wrap justify-center font-display text-[3.4rem] uppercase leading-none text-ink">
            {LETTERS.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.055, duration: 0.12 }}
                className="relative"
              >
                {ch}
                {i === REDACTED_INDEX && (
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.75, duration: 0.18, ease: 'easeOut' }}
                    className="redact absolute -inset-x-[2px] top-[7%] bottom-[18%] origin-left"
                  />
                )}
              </motion.span>
            ))}
          </h1>

          <motion.span
            initial={{ opacity: 0, scale: 1.7, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            transition={{ delay: 1.15, duration: 0.16, ease: 'easeIn' }}
            className="stamp stamp-worn absolute -top-4 -right-3 text-xl text-undercover"
          >
            Top secret
          </motion.span>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-6 max-w-[17rem] text-sm leading-relaxed text-ink/60"
        >
          One word stands between you and exposure. Pass the phone. Trust no one.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex w-full flex-col gap-3"
      >
        {activeGame && (
          <Button variant="glass" onClick={() => nav('/play')}>
            Reopen case — resume game
          </Button>
        )}

        <div className="flex flex-col items-center gap-2 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/45">
            Special roles
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <RoleChip
              label="Revenger"
              on={draft.revenger > 0}
              onTap={() => setDraft({ revenger: draft.revenger > 0 ? 0 : 1 })}
            />
            <RoleChip
              label="Serial Killer"
              on={draft.killer > 0}
              onTap={() => setDraft({ killer: draft.killer > 0 ? 0 : 1 })}
            />
            <RoleChip
              label="Lovers"
              on={draft.lovers}
              onTap={() => setDraft({ lovers: !draft.lovers })}
            />
          </div>
        </div>

        <Button onClick={() => nav('/players')}>New game</Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => nav('/how')}>
            How to play
          </Button>
          <Button variant="ghost" onClick={() => nav('/settings')}>
            Settings
          </Button>
        </div>
      </motion.div>
    </Screen>
  );
}
