# Undercover

> One word stands between you and exposure.

A local-first, offline, pass-and-play social deduction word game in the browser.
No accounts, no servers — open it once and it works forever (PWA).

## Stack

- **Vite + React + TypeScript** — static SPA, no backend
- **Pure-TS game engine** (`src/engine/`) — framework-agnostic reducer, fully unit-tested
- **Zustand** — UI state, wraps the engine
- **Tailwind v4** — neon-noir theme
- **Framer Motion** — animation
- **vite-plugin-pwa** — installable, fully offline
- **220 bundled word pairs** across 11 packs (`words.seed.json`)

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine unit tests (vitest)
npm run build        # production build → dist/
```

## Deploy — Cloudflare Pages (continuous)

The repo is wired for Cloudflare Pages. Connect it once and every push to
`main` auto-deploys:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the **`undercover`** GitHub repo.
3. Build settings (auto-detected for Vite, but confirm):
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. **Save and Deploy.**

`public/_redirects` handles SPA routing and `public/_headers` sets PWA cache
rules — both are copied into `dist/` at build time.
