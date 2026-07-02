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

const SPECIALS: { title: string; body: string }[] = [
  {
    title: 'The Revenger',
    body: 'An imposter who knows their role. If the table votes them out, they immediately drag one player down with them. No guess, no appeal.',
  },
  {
    title: 'The Serial Killer',
    body: 'Holds the real word and plays alone. After every vote, night falls: the phone goes around and everyone "visits someone in their dreams" — only the Killer\'s visit is real. They win by outlasting everyone; no team can win while they live.',
  },
  {
    title: 'The Lovers',
    body: 'Two random players — any roles — are secretly bound and learn each other at the reveal. If one falls, the other dies of heartbreak.',
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

        <h2 className="tab mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/70">
          Special roles · optional
        </h2>
        <div className="!mt-0 space-y-2 rounded-b-card rounded-tr-card border border-ink/25 bg-paper/40 p-2">
          {SPECIALS.map((s) => (
            <div key={s.title} className="sheet flex gap-4 rounded-card p-4">
              <span aria-hidden className="mt-1.5 h-3 w-3 shrink-0 rotate-45 bg-undercover" />
              <div>
                <h3 className="font-display text-lg tracking-wide text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/65">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button onClick={() => nav('/players')}>Start a game</Button>
    </Screen>
  );
}
