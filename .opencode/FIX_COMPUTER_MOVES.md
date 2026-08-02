# Fix: Computer Stops Moving After 1-2 Moves

## Root Cause
In `src/game/ai.ts`, `getValidMoves()` filters candidate cells only with
`isCellPlayable`, which does NOT verify the cell is empty (the UI checks
`value === null` separately in `Cell.tsx`). As a result the AI treats
already-occupied cells as valid moves.

Reproduced: the AI frequently selected `{1,1}` — the exact tile the human had
just played — because it scored highest there. The reducer's `PLACE` then
rejected the move (cell not null) and returned the SAME state object, so the
`useEffect` dependency set did not change and never re-fires → the AI stops,
leaving the game frozen on the AI's turn.

## Fix plan
1. `src/game/ai.ts` — `getValidMoves`: require the cell be empty, matching the UI:
   ```ts
   if (board[row][col] === null && isCellPlayable(board, row, col, player, gameOver))
   ```
   This covers heuristic, win-now, and block scans.

2. `src/game/ai.ts` — `chooseMove`: change return type to `Move | null`;
   replace the `{ row: 0, col: 0 }` no-moves fallback with `null` to avoid
   ever placing an illegal corner tile. Add the same `board[..]===null`
   guard to the opening-book filter.

3. `src/App.tsx` — AI dispatch guard: only dispatch `PLACE` when `chooseMove`
   returns a non-null move.

## Verification
- `npm run build && npm run lint`
- Headless sim (bundled game modules via vite): with the fix, AI-as-white vs
  red plays a full legal game to a winner (previously froze at move 1).