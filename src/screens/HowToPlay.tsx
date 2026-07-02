import { useNavigate } from 'react-router-dom';
import { Screen, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';

// A true sequence — the numbers are the order of play.
const STEPS: { title: string; body: string }[] = [
  {
    title: 'Everyone gets a word',
    body: 'Most players (Civilians) share one secret word. One or more Undercovers get a similar-but-different word. Mr. White gets nothing.',
  },
  {
    title: 'Drop one clue each',
    body: 'Going in turn, every living player says a single clue about their word — without saying the word itself.',
  },
  {
    title: 'Debate & vote',
    body: 'Argue over who feels off. Then vote. The most-voted player is eliminated and their role is revealed.',
  },
  {
    title: 'Mr. White’s shot',
    body: 'If Mr. White is voted out, they get one guess at the civilian word. Nail it and they win on the spot.',
  },
  {
    title: 'How you win',
    body: 'Civilians win by eliminating all imposters. Imposters win once they equal the civilians in number.',
  },
];

export function HowToPlay() {
  const nav = useNavigate();
  return (
    <Screen className="pb-6">
      <TopBar title="Briefing" onBack={() => nav('/')} />
      <div className="mt-2 flex-1 space-y-3 overflow-y-auto pb-4">
        {STEPS.map((s, i) => (
          <div key={i} className="sheet flex gap-4 rounded-card p-4">
            <span className="pt-0.5 font-display text-3xl leading-none text-undercover">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="font-display text-lg tracking-wide text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => nav('/players')}>Start a game</Button>
    </Screen>
  );
}
