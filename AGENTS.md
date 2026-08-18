# Gymkhana — Hex-like strategy game

Vite + React 19 + TypeScript (strict) + Tailwind 4. Firebase RTDB for online multiplayer.

## Commands
- `npm run dev`           # dev server
- `npm run build`         # tsc -b && vite build
- `npm run lint`          # oxlint (oxlint, NOT eslint)
- `npm test`              # vitest, EXCLUDES ai_v2.test.ts (slow/AI)
- `npm run test:ai`       # vitest, runs ONLY ai_v2.test.ts
- `npm run test:all`      # vitest, includes everything
- `npm run test:watch`    # watch mode
- `npm run deploy`        # deploy RTDB rules only (GitHub Pages auto-deploys on push to main)

## Local multiplayer
Terminal 1: `npx firebase emulators:start --only database`   # port 9000
Terminal 2: `npm run dev`

## Structure
- `src/game/`      pure game logic, no React (logic.ts, reducer.ts, ai_v2.ts)
- `src/components/`  React UI
- `src/firebase/`    RTDB rooms/multiplayer
- `src/hooks/`       useOnlineGame

## Conventions & gotchas
- Strict TS: use `import type { ... }` (verbatimModuleSyntax), no unused locals/params.
- AI behavior is rule-based. The spec lives in `.opencode/01_simplified_rules_for_ai.md` and
  `.opencode/02_basic_heuristics.md` — read these before changing `ai_v2.ts`.
- Board: 11x11, orthogonal adjacency only, fixed staggered start tokens, 20 tokens/player.
- Do NOT add `ai_v2.test.ts` to the default `npm test` run
  (run it via `npm run test:ai`).
- No comments unless asked; keep code style consistent with existing files.

