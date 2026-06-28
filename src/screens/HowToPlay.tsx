import { useNavigate } from 'react-router-dom';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';

const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '🃏',
    title: 'Everyone gets a word',
    body: 'Most players (Civilians) share one secret word. One or more Undercovers get a similar-but-different word. Mr. White gets nothing.',
  },
  {
    emoji: '🗣️',
    title: 'Drop one clue each',
    body: 'Going in turn, every living player says a single clue about their word — without saying the word itself.',
  },
  {
    emoji: '🔍',
    title: 'Debate & vote',
    body: 'Argue over who feels off. Then vote. The most-voted player is eliminated and their role is revealed.',
  },
  {
    emoji: '⬜',
    title: 'Mr. White’s shot',
    body: 'If Mr. White is voted out, they get one guess at the civilian word. Nail it and they win on the spot.',
  },
  {
    emoji: '🏆',
    title: 'How you win',
    body: 'Civilians win by eliminating all imposters. Imposters win once they equal the civilians in number.',
  },
];

export function HowToPlay() {
  const nav = useNavigate();
  return (
    <Screen className="pb-6">
      <TopBar title="How to Play" onBack={() => nav('/')} />
      <div className="mt-2 flex-1 space-y-3 overflow-y-auto pb-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex gap-3 rounded-card border border-glass-edge bg-glass p-4">
            <span className="text-3xl">{s.emoji}</span>
            <div>
              <h3 className="font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/55">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => nav('/players')}>Start a Game</Button>
    </Screen>
  );
}
