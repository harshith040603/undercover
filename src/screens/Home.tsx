import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { useGame } from '@/store/gameStore';

const LETTERS = 'UNDERCOVER'.split('');

export function Home() {
  const nav = useNavigate();
  const activeGame = useGame((s) => s.game);

  return (
    <Screen spotlight className="items-center justify-between pb-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mb-4 font-display text-[11px] uppercase tracking-[0.4em] text-amber/70"
        >
          The word imposter game
        </motion.p>

        <h1 className="flex flex-wrap justify-center font-display text-5xl font-extrabold uppercase leading-none tracking-tight">
          {LETTERS.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 500, damping: 22 }}
              className={i % 2 === 0 ? 'text-white' : 'text-civilian'}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-5 max-w-[16rem] text-sm leading-relaxed text-white/45"
        >
          One word stands between you and exposure. Pass the phone. Trust no one.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="flex w-full flex-col gap-3"
      >
        {activeGame && (
          <Button variant="glass" onClick={() => nav('/play')}>
            ▶ Resume game
          </Button>
        )}
        <Button onClick={() => nav('/players')}>New Game</Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => nav('/how')}>
            How to Play
          </Button>
          <Button variant="ghost" onClick={() => nav('/settings')}>
            Settings
          </Button>
        </div>
      </motion.div>
    </Screen>
  );
}
