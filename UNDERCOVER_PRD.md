# Undercover — Product Requirements Document

> **Working title:** **Undercover** — *one word stands between you and exposure.*
> A local-first, offline, pass-and-play social deduction word game in the browser.
> **Version:** 0.1 (Draft) · **Author:** Harshith · **Status:** Mechanics + Concept locked, build pending

---

## 0. The Name

**Undercover** — the title says exactly what the game is, so there's zero learning curve for a new player ("oh, like the imposter word game"). The product leans into instant recognition rather than a clever brand.

> Note: "Undercover" is a common title in app stores, so it's not distinctive for trademark/SEO. If discoverability ever matters, pair it with a wordmark or subtitle (e.g., *"Undercover — the word imposter game"*) without renaming. Distinctive alternatives kept on ice: **TELL**, **SLIP**, **DECOY**.

---

## 1. Vision

A pocket-sized party game that turns **any phone into a deception engine.** No accounts, no servers, no internet. You open the site once, it loads instantly forever after (PWA), and a group of up to 16 people can play by passing a single phone around the circle.

The experience should feel less like a utility and more like **a tiny spy thriller staged in your hand** — neon-noir, cinematic reveals, a spotlight that swings to the accused, a glitch when an imposter is unmasked. The word list is just data; the *theater* is the product.

### Design Pillars

| Pillar | Meaning |
|---|---|
| **Local & Lawless** | 100% offline. All words, packs, history, and state live in the browser. Works on a plane, in a basement, forever. |
| **Pass-and-Play Sacred** | The phone moves between people. Privacy of each player's secret word is a *first-class feature*, not an afterthought. |
| **Cinematic Motion** | Every state transition is choreographed. Reveals flip, votes spotlight, deaths shatter, wins erupt. Motion *is* the game feel. |
| **Zero Friction Setup** | From "open app" to "first clue" in under 30 seconds. Smart defaults, one-tap start. |
| **Make It Yours** | Players can write custom word packs (inside jokes, course material, friend names) stored locally and shared via export string. |

---

## 2. Game Mechanics (Core Spec)

> This is the authoritative ruleset the engine must implement. Everything else in this doc serves these mechanics.

### 2.1 The Three Roles

#### 🟦 Civilian (the majority)
- Every Civilian receives the **same secret word** — the *Civilian Word* (e.g., `APPLE`).
- They do **not** know how many Undercovers or Mr. Whites exist (configurable: can be shown or hidden).
- **Goal:** identify and vote out every Undercover **and** Mr. White before the imposters reach numerical parity.

#### 🟥 Undercover (the imposter who *almost* knows)
- Receives a **different but thematically adjacent word** — the *Undercover Word* (e.g., `PEAR` when Civilians have `APPLE`).
- The word is close enough that the Undercover can bluff convincingly, but the *gap* is exploitable by sharp Civilians.
- The Undercover does **not** know they are the Undercover-with-the-odd-word vs. just a Civilian — *they only see their word.* The doubt ("is my word the majority word or not?") is part of the tension.
- **Goal:** survive. Blend in, deflect votes, and outlast Civilians until imposters reach parity.

#### ⬜ Mr. White (the blank)
- Receives **no word.** A literal blank card.
- Knows only that they are Mr. White (configurable). Must reconstruct the Civilian word purely by **listening to other players' clues.**
- **Lifeline:** the instant Mr. White is voted out, they get **exactly one guess** at the Civilian Word.
  - ✅ Correct guess → **Mr. White wins immediately** (overrides all other win states this round).
  - ❌ Wrong guess → Mr. White is simply eliminated; play continues.
- **Goal:** either survive to the endgame, *or* get caught but nail the guess.

### 2.2 Setup & Word Assignment

1. Host enters player names (or just a count → auto "Player 1…N").
2. Host picks a **Word Pack** (or random) and a **difficulty** (controls how *similar* the Civilian/Undercover words are).
3. Engine assigns roles using the distribution table (§2.5), then:
   - Picks a **word pair** `{ civilianWord, undercoverWord }` from the pack.
   - Civilians ← `civilianWord`
   - Undercover(s) ← `undercoverWord`
   - Mr. White(s) ← `∅` (blank)
4. **Seating order is shuffled** so role order isn't guessable from name entry order.
5. A **random first speaker** is chosen each round (prevents the first player being a sitting duck / always-safe).

### 2.3 Round Structure (the loop)

Each round = four phases. The engine drives them in order:

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1 — REVEAL   (pass the phone, each sees their card)│
│  PHASE 2 — CLUES    (one clue per living player, in order)│
│  PHASE 3 — DEBATE   (open discussion, off-device, timer)  │
│  PHASE 4 — VOTE     (everyone votes, eliminate, reveal)   │
└─────────────────────────────────────────────────────────┘
        ↑                                          │
        └────────── repeat until win check ────────┘
```

**Phase 1 — Reveal (Round 1 only, or every round if "re-peek" is enabled)**
- The phone is passed to each player in turn. Each player taps to flip their card, sees their word (or blank), taps to hide, and passes on.
- The screen must **fully conceal** the previous player's word before the next handoff (a "Pass to **[Name]**" interstitial gate).

**Phase 2 — Clues**
- Starting from the random first speaker, going clockwise, **each living player says exactly one clue aloud** describing their word.
- Rules enforced socially (engine can optionally track):
  - ❌ Cannot say the word itself.
  - ❌ Cannot say a clue already given verbatim (optional "no-repeat" rule).
  - ✅ Clue should be a single word or short phrase (configurable: one-word mode vs. sentence mode).
- The device shows a **turn tracker** highlighting whose turn it is. Optional per-turn countdown.

**Phase 3 — Debate**
- Free discussion. The device shows a **debate timer** (default 60–90s, configurable, can be skipped). Accusations, defenses, second-guessing.

**Phase 4 — Vote & Eliminate**
- Each player votes for one player to eliminate. Two supported voting UIs:
  - **Tap-to-tally** (host taps the agreed target — fast, trust-based), or
  - **Secret pass-vote** (phone passed, each privately taps a choice — slower, no bandwagon).
- Player with the **most votes is eliminated** and their **role + word is revealed** with a dramatic flip.
- **If the eliminated player is Mr. White → trigger the Guess sub-phase** (§2.4).
- Run the **win check** (§2.6). If no winner, loop to Phase 2 (clues) with the reduced player set.

### 2.4 Mr. White Guess Sub-phase

Triggered the moment Mr. White is eliminated:
- A full-screen "Mr. White has one shot" moment.
- An input appears. Mr. White types/speaks their single guess at the **Civilian Word.**
- Matching is **forgiving by default**: case-insensitive, trims whitespace, ignores plural `s`, optional fuzzy match (Levenshtein distance ≤1) — configurable strictness.
- ✅ Match → Mr. White win screen, round ends.
- ❌ No match → "Mr. White is gone." Continue.

### 2.5 Role Distribution

Defaults (host can override any of these manually):

| Players | Civilians | Undercover | Mr. White | Imposters |
|:---:|:---:|:---:|:---:|:---:|
| 3 | 2 | 1 | 0 | 1 |
| 4 | 3 | 1 | 0 | 1 |
| 5 | 3 | 1 | 1 | 2 |
| 6 | 4 | 1 | 1 | 2 |
| 7 | 4 | 2 | 1 | 3 |
| 8 | 5 | 2 | 1 | 3 |
| 9 | 6 | 2 | 1 | 3 |
| 10 | 6 | 3 | 1 | 4 |
| 11 | 7 | 3 | 1 | 4 |
| 12 | 7 | 3 | 2 | 5 |
| 13 | 8 | 3 | 2 | 5 |
| 14 | 8 | 4 | 2 | 6 |
| 15 | 9 | 4 | 2 | 6 |
| 16 | 10 | 4 | 2 | 6 |

> Imposters hold steady at roughly one-third of the table. Civilians always retain a strict starting majority. Host can override any cell within the §2.5 constraints.

**Hard constraints the config UI must enforce:**
- `civilians ≥ undercovers + whites + 1` at game start (Civilians must start as a strict majority).
- At least 1 Civilian and at least 1 imposter (Undercover or White) always.
- Mr. White is optional and can be set to 0 for a "pure" two-word game.

### 2.6 Win Conditions & Resolution Order

Checked **after every elimination**, in this priority order:

1. **Mr. White instant win** — Mr. White was just eliminated and guessed the Civilian Word correctly. → *White wins.* (Highest priority, ends round immediately.)
2. **Civilian win** — All Undercovers **and** all Mr. Whites have been eliminated. → *Civilians win.*
3. **Imposter win (parity)** — The number of living imposters (Undercover + White) is **≥** the number of living Civilians. → *Imposters win.* (They can now control any vote, so they win pre-emptively rather than playing it out.)
4. **No winner yet** → continue to next round.

> **Edge case — last 3 with 1 imposter:** if it's 2 Civilians + 1 Undercover, the next elimination decides it. If Civilians vote out the Undercover → Civilian win. If they misfire → parity → imposter win.

### 2.7 Tie & Special-case Handling

| Situation | Rule |
|---|---|
| **Vote tie** | Configurable: (a) **Revote** between tied players only, (b) **Sudden-death clue** — tied players give one more clue then revote, or (c) **No elimination** this round (skip to next clue phase). Default: revote once, then no-elimination if still tied. |
| **Civilian word pool exhausted** | Packs are large; on exhaustion, reshuffle used pairs. |
| **Mr. White is the last imposter and gets voted out without guessing right** | Civilians win (normal flow). |
| **Multiple Mr. Whites both eliminated same round** | Only the one being voted out this round guesses. (Eliminations are one-at-a-time.) |
| **Solo / 3-player** | Supported as a "quick duel" variant — no Mr. White, 1 Undercover, faster loop. |

### 2.8 Optional Rule Variants (toggles in settings)

- **Silent Round 1** — Mr. White-friendly off; clues only, no debate in round 1.
- **One-Word Mode** — clues must be a single word (harder, faster).
- **Reverse Undercover** — Undercovers are told they're Undercover and must *coordinate* (advanced, for experienced groups).
- **Ghosts Vote** — eliminated players still cast (non-binding) "ghost votes" shown after the round for fun.
- **Blitz Timer** — every phase is hard-timed; the game becomes frantic.
- **Blind Counts** — players are NOT told how many imposters exist (max paranoia). Default: ON.

---

## 3. Local-First Architecture

### 3.1 Principle
**Nothing leaves the device.** No fetch calls at runtime (except the one-time PWA asset load). The app is a static bundle. All dynamic data is browser storage.

### 3.2 Storage Strategy

| Data | Store | Why |
|---|---|---|
| Bundled word packs | **Shipped in JS bundle** (read-only) | Always available offline, fast |
| Custom user packs | **IndexedDB** (`undercover.packs`) | Can be large; structured |
| Game settings / preferences | **localStorage** (`undercover.settings`) | Tiny, sync read |
| In-progress game state | **localStorage** (`undercover.activeGame`) | Survives accidental refresh mid-game |
| Match history / stats | **IndexedDB** (`undercover.history`) | Grows over time |

> Use IndexedDB (via a thin wrapper like `idb-keyval`) for anything that can grow; localStorage only for small, hot, synchronous reads. Never block the UI on storage.

### 3.3 Word Pack Format

```jsonc
{
  "id": "pack_fruits_v1",
  "name": "Fruit Bowl",
  "emoji": "🍎",
  "author": "built-in",
  "difficulty": "easy",        // easy = words obviously related, hard = sneaky-close
  "pairs": [
    { "civilian": "Apple",  "undercover": "Pear" },
    { "civilian": "Lemon",  "undercover": "Lime" },
    { "civilian": "Orange", "undercover": "Tangerine" }
  ]
}
```

### 3.4 Custom Pack Creator
- In-app editor: name, emoji, add/remove pairs, set difficulty.
- **Validation:** no empty fields, no `civilian === undercover`, warn on duplicates.
- **Export:** serialize a pack to a compact, copyable **share string** (base64 of gzipped JSON, or a short code) → paste into WhatsApp.
- **Import:** paste a share string → validate → save to IndexedDB. *(This is how packs travel without a server.)*

### 3.5 Bundled Packs (ship at launch)
Fruit Bowl · Animals · Around the House · Sports · Food & Drink · Movies & TV · Travel · Tech · **Spicy** (adult/party) · **Brain** (academic — physics/chem/bio terms, great for a teaching crowd 😉).

### 3.6 Where Words Come From (Sourcing Strategy)

The hard question for a no-backend game: how do we get a large, *high-quality* supply of word **pairs** that are "related-but-different"? The answer is three layers, in priority order:

**Layer 1 — Bundled Seed Library (primary).**
A curated JSON of word pairs ships *inside the app bundle*. This guarantees instant, offline, quality-controlled play on first launch. Pairs are **author-curated** (hand-written or LLM-generated *at build time* and then human-reviewed — never at runtime). Generation is a one-time/offline chore, so there's zero runtime cost or network dependency. Target: **200+ pairs at launch**, growing over versions.

**Layer 2 — Custom Packs (user-generated).**
Players write their own pairs in the in-app editor (§3.4) — inside jokes, friend names, course material. Stored in IndexedDB, shared peer-to-peer via export strings. This is how the library grows *socially* without us writing every word.

**Layer 3 — Online Top-Up (optional, opt-in, breaks "pure offline").**
A clearly-labelled "✨ Generate a fresh pack" button that, *only when online and only if the user taps it*, calls an LLM to mint a new themed pack on the spot, then **saves the result locally** so it's offline forever after. This is the *only* feature that touches the network, it's never required, and core play never depends on it. (Implementation note: this is exactly the "AI-powered Artifact" pattern — a single completion request returning a JSON pack.)

> **Design refinement:** difficulty becomes a **cross-cutting filter**, not just a pack property. Every *pair* carries its own `difficulty` (`easy | normal | hard`). Packs stay thematic; the host picks a theme **and** a difficulty, and the engine draws pairs matching both. `easy` = obviously different (Dog/Cat). `hard` = sneaky-close (Turtle/Tortoise, Mass/Weight).

#### Updated pair schema

```jsonc
{ "civilian": "Apple", "undercover": "Pear", "difficulty": "easy" }
```

---

## 4. Screens & User Flow

```
HOME ──▶ NEW GAME ──▶ PLAYERS ──▶ ROLES & PACK ──▶ REVEAL (pass)
                                                        │
   WIN ◀── ELIMINATION ◀── VOTE ◀── DEBATE ◀── CLUES ◀─┘
    │                                              ▲
    └──── PLAY AGAIN (same crew / new words) ──────┘

Side routes: PACK MANAGER · CUSTOM PACK EDITOR · HISTORY · SETTINGS · HOW TO PLAY
```

### 4.1 Screen Inventory

1. **Home** — animated logo, big "New Game", small links: Packs, How to Play, Settings.
2. **Players** — add names (chips), reorder, quick "+/-" count, "Surprise me" for random names.
3. **Roles & Pack** — distribution stepper (with live validity check), pack picker (carousel of pack cards), difficulty slider, rule toggles.
4. **Reveal / Pass** — the heart of pass-and-play. "Pass to **Name**" gate → tap-and-hold to reveal card → flip animation → "Got it, hide" → next. (See §5.3.)
5. **Clues** — circular seat layout or list; active speaker pulsing; optional per-turn timer; "Next speaker" tap.
6. **Debate** — large countdown ring; pause/skip; "Call the vote" button.
7. **Vote** — tap-tally grid *or* secret pass-vote; running tally hidden until reveal (configurable).
8. **Elimination** — dramatic role reveal flip; word shown; shatter/glitch by role.
9. **Mr. White Guess** — spotlight input moment.
10. **Win** — role-colored eruption, MVP-ish summary, "Play Again" / "New Crew".
11. **Pack Manager + Editor** — list, create, edit, import/export.
12. **History** — past games, who won, fun stats (most-eliminated, best White guesser).
13. **Settings** — timers, strictness, haptics, sound, theme, blind-counts.
14. **How to Play** — animated mini-tutorial.

---

## 5. Motion & Feel (the creative core)

> Animation isn't decoration here — it carries the drama and masks the "pass the phone" awkwardness. Spec each signature moment.

### 5.1 Aesthetic Direction — *Neon-Noir Interrogation*
- **Mood:** a dim interrogation room at midnight. Deep charcoal/near-black backgrounds, a single warm "spotlight" gradient, neon accents that *mean* something.
- **Color language (semantic):**
  - Civilian → **cyan** `#22D3EE`
  - Undercover → **magenta/red** `#F43F5E`
  - Mr. White → **off-white** `#F5F5F4`
  - Neutral UI / spotlight → warm amber glow over charcoal `#0A0A0B`
- **Surfaces:** glassmorphism cards with subtle inner glow, grain/noise overlay for film texture, soft bloom on neon.
- **Type:** a heavy condensed display face for headers (think interrogation-poster energy) + a clean geometric sans for body.

### 5.2 Signature Animations

| Moment | Animation |
|---|---|
| **App launch** | Logo letters `U·N·D·E·R·C·O·V·E·R` slam in one by one with a light glitch + chromatic aberration, then settle. |
| **Deal** | Cards fly from a central "deck" out to a fanned hand; a soft shuffle sound. |
| **Card reveal (peek)** | 3D flip on tap-hold; word fades up under a moving spotlight gradient; releasing snaps it face-down with a "thunk." |
| **Pass gate** | Screen wipes to a frosted "PASS TO **NAME**" curtain; a directional arrow pulses toward the next person. |
| **Active speaker** | A spotlight ring orbits to the current player's seat; their card breathes (subtle scale pulse). |
| **Vote cast** | Each vote drops a glowing tally token with a satisfying spring + haptic tick. |
| **Elimination reveal** | The accused card flips; **Civilian** → clean cyan flip; **Undercover** → magenta **glitch/scramble** reveal; **Mr. White** → the card *cracks like glass* (shatter particles) and goes blank-white. |
| **Mr. White guess** | Everything dims except a single spotlight on a typewriter-style input; a slow heartbeat sound under the timer. |
| **Win — Civilians** | Cyan sweep, "CASE CLOSED" stamp. |
| **Win — Imposters** | Lights cut to red, "THEY GOT AWAY" with a slow magenta bloom. |
| **Win — Mr. White** | Screen goes blinding white, then their name burns in — the blank wins. |

### 5.3 The Pass-and-Play Privacy Choreography (critical)
This is the make-or-break UX. The flip from "Player A's secret" to "Player B's turn" must guarantee **A's word is never on screen when B is looking.**
- Reveal requires an active **tap-and-hold** (word only visible while finger is down) → eliminates "left it face-up on the table" leaks.
- On release → instant face-down + a **full-screen opaque pass-gate** that names the next player.
- Optional **"shoulder-surf" toggle:** add a 1s countdown before hide so the holder can't be rushed.

### 5.4 Sound & Haptics
- Tiny library of UI sounds: shuffle, thunk, tally tick, glitch, shatter, heartbeat, win stings. All **toggleable**, off by default in case of a quiet room. Preloaded locally.
- **Haptics** (`navigator.vibrate`): tick on vote, thump on reveal, buzz on elimination.

### 5.5 Motion Principles
- 60fps, GPU-friendly transforms only (`transform`/`opacity`).
- **Respect `prefers-reduced-motion`** → swap flips/shatters for clean fades.
- Spring physics for anything interactive; eased curves for cinematic beats.

---

## 6. Tech Stack (recommended)

Chosen for: static deploy, offline-first, world-class animation, and reuse of what you already run.

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Vite + React + TypeScript** (or Next.js static export) | Fast, static, no server needed |
| Animation | **Framer Motion** (layout + gestures) **+ GSAP** (timeline-y cinematic beats) | Best-in-class; you already know GSAP/Three |
| 3D flourish (optional) | **Three.js** for the launch logo / spotlight volume | Already in your toolkit; keep it lightweight |
| Styling | **Tailwind v4** | Matches your existing stack |
| State | **Zustand** | Tiny, perfect for a single-device state machine |
| Storage | **idb-keyval** (IndexedDB) + native `localStorage` | Offline persistence |
| Offline | **PWA** (`vite-plugin-pwa` / Workbox) | Installable, works fully offline |
| Hosting | **Netlify** (static) | Same as your other tools, `tiny.cc` short link friendly |
| Sound | **Howler.js** (or native Audio) | Reliable local audio |

> The **game engine should be a pure, framework-agnostic state machine** (`/engine`) — `reducer(state, action) → state` — fully unit-testable with zero UI. The React layer just renders state and dispatches actions. This keeps mechanics bulletproof and animation-independent.

---

## 7. Data Model (TypeScript sketch)

```ts
type Role = 'civilian' | 'undercover' | 'white';
type Phase = 'setup' | 'reveal' | 'clues' | 'debate' | 'vote' | 'elimination' | 'whiteGuess' | 'gameOver';

interface Player {
  id: string;
  name: string;
  role: Role;
  word: string | null;     // null for Mr. White
  alive: boolean;
  seat: number;            // shuffled order
}

interface GameConfig {
  packId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  counts: { undercover: number; white: number }; // civilians derived
  rules: {
    blindCounts: boolean;
    oneWordMode: boolean;
    debateSeconds: number;
    perTurnSeconds: number | null;
    tieRule: 'revote' | 'suddenDeath' | 'noElim';
    whiteMatch: 'exact' | 'lenient' | 'fuzzy';
    secretVote: boolean;
    sound: boolean;
    haptics: boolean;
  };
}

interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  civilianWord: string;
  undercoverWord: string;
  round: number;
  firstSpeakerId: string;
  currentSpeakerId: string | null;
  votes: Record<string, string>;     // voterId -> targetId
  lastEliminatedId: string | null;
  winner: 'civilians' | 'imposters' | 'white' | null;
  history: EliminationEvent[];
}

interface WordPack {
  id: string; name: string; emoji: string;
  author: string; difficulty: GameConfig['difficulty'];
  pairs: { civilian: string; undercover: string }[];
}
```

---

## 8. Phased Build Plan

Following a phased convention so it slots cleanly into a Claude Code build.

**Phase 0 — Skeleton**
Vite + React + TS + Tailwind, routing, PWA shell, base neon-noir theme tokens.

**Phase 1 — The Engine (no UI polish)**
Pure state machine: role assignment, phase loop, voting, win checks, Mr. White guess. Full unit tests. *Ugly but correct.*

**Phase 2 — Core Screens**
Home → Players → Roles & Pack → Reveal (with privacy choreography) → Clues → Debate → Vote → Elimination → White Guess → Win. Functional, minimal motion.

**Phase 3 — Local Data**
Bundled packs + IndexedDB custom packs + settings persistence + active-game resume on refresh.

**Phase 4 — Pack Creator & Sharing**
Editor + validation + export/import share strings.

**Phase 5 — Motion & Feel**
Framer/GSAP signature animations, spotlight, glitch/shatter reveals, sound + haptics, reduced-motion fallbacks.

**Phase 6 — History & Stats**
Match history, fun stats, replay-same-crew.

**Phase 7 — Polish & Ship**
Empty states, accessibility, install prompt, Netlify deploy + short link.

---

## 9. Open Decisions (for Harshith to confirm)

1. **Single-device pass-and-play** is assumed as the model (matches "store words on the phone's browser"). ✅ Confirm — or do you want a future multi-device mode (would need WebRTC/peer sync, no longer purely local)?
2. **Default look:** is neon-noir the vibe, or do you want a second theme option (e.g., clean "masquerade" pastel, or a retro arcade theme) selectable in settings?
3. **Voting default:** fast tap-tally (trust-based) vs. secret pass-vote (slower, no bandwagon) — which is the *default*?
4. **Mr. White on by default?** (More chaotic, more fun — recommend yes for 5+.)
5. **Brand:** name locked to **Undercover** ✅ (subtitle/wordmark optional later — see §0).

---

*End of PRD v0.1 — mechanics locked, ready to build.*
