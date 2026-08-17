# Implement ai_v2.ts

## Goal
Create `src/game/ai_v2.ts` implementing a rule-based AI that passes
`src/game/tests/ai_v2.test.ts` (16 use cases from `.opencode/02_basic_heuristics.md`).

## Approach
1. Copy `src/game/lean_ai.ts` to `src/game/ai_v2.ts` (keep `Move` export + `chooseMove` signature).
2. Run `npx vitest run src/game/tests/ai_v2.test.ts` to find failing cases.
3. Adapt the decision pipeline to the 7-step spec.

## Decision pipeline (from heuristics)
1. Immediate win (connection or box-in) — `winningMoves` (already in lean_ai).
2. Block immediate opponent win — play on opponent's winning square (already in lean_ai).
3. Forced win near the edge — `findForcedWinMove` (already in lean_ai).
4. **Defend forced win near the edge — MISSING in lean_ai.** Add: simulate each opponent
   move; if it leaves one of my components with 0 playable liberties (all liberties on
   opponent-unplayable lanes but playable by me), play on that opponent move square.
5. Create double-threat (fork) — `findForkMove` (already in lean_ai). May need to extend
   beyond `winningMoves >= 2` to cover "1 immediate + 1 delayed" and "2 delayed" patterns
   (UC8/UC9/UC10).
6. Block opponent double-threat — `findForkBlock` (already in lean_ai).
7. Strategic path expansion — `pickBestStrategic` (already in lean_ai).

## Verification
- `npx vitest run src/game/tests/ai_v2.test.ts`
- `npm run lint`
- `npm run build`