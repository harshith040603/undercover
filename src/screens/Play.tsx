import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { Reveal } from './phases/Reveal';
import { Clues } from './phases/Clues';
import { Debate } from './phases/Debate';
import { Vote } from './phases/Vote';
import { Elimination } from './phases/Elimination';
import { WhiteGuess } from './phases/WhiteGuess';
import { Win } from './phases/Win';

export function Play() {
  const nav = useNavigate();
  const game = useGame((s) => s.game);

  // No active game (e.g. deep link / after quit) → bounce home.
  useEffect(() => {
    if (!game) nav('/', { replace: true });
  }, [game, nav]);

  if (!game) return null;

  const phase = game.phase;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="contents"
      >
        {phase === 'reveal' && <Reveal />}
        {phase === 'clues' && <Clues />}
        {phase === 'debate' && <Debate />}
        {phase === 'vote' && <Vote />}
        {phase === 'elimination' && <Elimination />}
        {phase === 'whiteGuess' && <WhiteGuess />}
        {phase === 'gameOver' && <Win />}
      </motion.div>
    </AnimatePresence>
  );
}
