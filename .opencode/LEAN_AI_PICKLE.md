# Implementation Plan: Basic Computer Player (lean_ai.ts)

## Sources of truth

The rules and heuristics live in the repo, not in this plan:

- **`/home/tristan/projects/gymkhana/.opencode/01_simplified_rules_for_ai.md`** — board layout, gameplay, win conditions (the model MUST read this).
- **`/home/tristan/projects/gymkhana/.opencode/02_basic_heuristics.md`** — the algorithm to implement (random first move; win → defend win → 2-way win → defend 2-way → extend; edge-trap warning) (the model MUST read this).

The rules engine is already implemented and well tested in `src/game/logic.ts` (pure functions) and `src/game/reducer.ts` (React reducer). **Do not modify these files. Reuse their exports.**

## Goal

Implement a basic computer player per the heuristics, in a new file **`src/game/lean_ai.ts`**, wire the existing UI to it, and completely replace the current `src/game/ai.ts`.

## Repo context (verified facts)

- Project: React 19 + TypeScript + Vite, ESM, oxlint. Scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (`oxlint`). No test suite exists.
- 0-indexed board, `BOARD_SIZE = 11` from `src/constants.ts`. Row 0 = top, row 10 = bottom; col 0 = left, col 10 = right.
- `src/types.ts`: `type Player = 'red' | 'white'`; `type CellValue = Player | null`; `type Board = CellValue[][]`.
- `src/constants.ts`: `BOARD_SIZE = 11`, `MAX_TILES = 21`, `OPPONENT: Record<Player, Player>`.
- Win conditions: red wins by connecting row 0 to row 10 (vertical) OR boxing in a white chain; white wins by connecting col 0 to col 10 (horizontal) OR boxing in a red chain.
- Red moves first.

### `src/game/logic.ts` — exported API to reuse
- `createBoard(): Board` — pre-positioned pegs (white on odd rows/even cols, red on even rows/odd cols).
- `isFixedPeg(row, col): boolean` — true where a pre-positioned peg sits. **Note: fixed pegs are never null, so "our placed tiles" = cells where `board[r][c] === player && !isFixedPeg(r, c)`.**
- `getTileOrientation(board, row, col, targetColor?)`: `'vertical' | 'horizontal'`.
- `isValidConnection(board, row, col, targetColor): boolean` — cell must have targetColor neighbors above+below (vertical) or left+right (horizontal).
- `isForbiddenEdgePlacement(board, row, col, targetColor): boolean` — vertical tiles forbidden on row 0/10; horizontal tiles forbidden on col 0/10.
- `isCellPlayable(board, row, col, player, gameOver): boolean` — combines non-corner, valid connection, and forbidden-edge checks. Corners are never playable.
- `checkConnectionWin(board, player): boolean` — red: path row 0→10; white: path col 0→10.
- `checkSurroundWin(board, player): boolean` — `player` has boxed-in `OPPONENT[player]` (flood-fill from borders through cells `!== player`; boxed if an opponent cell is unreachable).
- `isBoardFull(board): boolean`.

**Semantics to remember:** `checkSurroundWin(next, opp)` after an opponent move = opponent boxes **us** in. An opponent "immediate win" = any opponent valid move where `checkConnectionWin(next, opp) || checkSurroundWin(next, opp)`.

### `src/App.tsx` — the only UI wiring needed
- Line 8: `import { chooseMove } from './game/ai'` → **change to `'./game/lean_ai'`**.
- The AI effect (`App.tsx:14–41`) calls `chooseMove(state.board, aiPlayer, state.tilesPlaced, state.gameOver)` inside a `setTimeout(…, 400)` and then `dispatch({ type: 'PLACE', row: move.row, col: move.col })`. It only fires when `state.gameMode === 'ai'`, game not over, and `currentPlayer !== humanPlayer`. `aiPlayer = OPPONENT[humanPlayer]`.
- So `chooseMove` must keep the **exact signature**:
  `chooseMove(board: Board, player: Player, tilesPlaced: Record<Player, number>, gameOver: boolean): { row: number; col: number } | null`.
- Header/dialog (`Header.tsx`) already lets the human pick red or white via `START_AI`; no UI changes needed.

## Work to do

### 1. Create `src/game/lean_ai.ts` (new file)

Export `chooseMove` with the signature above. Do not export anything else unless useful. All helper functions internal. Do not add comments unless they aid clarity (repo has no comment convention; keep code self-explanatory).

**Algorithm** (from `02_basic_heuristics.md`, adapted to 0-indexing):

1. `moves = getValidMoves(board, player, gameOver)` (loop rows/cols 1..BOARD_SIZE-2; skip non-null; keep `isCellPlayable`). If empty → return `null`.
2. **First move**: if `tilesPlaced[player] === 0`, return a random valid move. (Covers both "AI is red, game move 1" and "AI is white, game move 2".)
3. **Immediate win**: any move where `checkConnectionWin(next, player) || checkSurroundWin(next, player)` → return it.
4. **Defend opponent's immediate win**: if the opponent has any winning move, find a move that after placement leaves opponent with zero winning moves. Return it; if none exists (we're doomed), fall through.
5. **Fork (2-way)**: if a move leaves us with ≥ 2 winning moves (opponent can block at most one), return it.
6. **Defend opponent's fork**: if the opponent threatens a fork, find a move that after placement leaves the opponent with no winning move AND no fork; return it.
7. **Extend (greedy fallback)**: score all valid moves and return the best (random tie-break).

**Helpers to implement:**
- `getValidMoves(board, player, gameOver): Move[]`
- `place(board, move, player): Board` — copy rows, set cell.
- `hasWin(board, player)` — `checkConnectionWin || checkSurroundWin`.
- `winningMoves(board, player): Move[]` — valid moves whose placement gives `hasWin`.
- `hasFork(board, player): boolean` and/or `findForkMove(board, player): Move | null` — exists a valid move whose placement yields `winningMoves(next, player).length >= 2`.
- `findBlockingMove(board, player)` — a move leaving opponent with zero winning moves.
- Component analysis: `largestComponentSize(board, color)` (4-connected same-color cells, including fixed pegs) and `advanceTowardWin(board, color)` — for red: max over components touching row 0 of `(maxRow + 1)`; for white: max over components touching col 0 of `(maxCol + 1)`; 0 if none touches the start edge.
- `pickRandom<T>(arr)`.

**Greedy scoring for step 7** (weights are suggestions, keep balanced):
- `+60 × adjacency` = number of the move's 4-neighbors that are our color on a **non-fixed-peg** cell (this is "extends already connected tiles").
- `+4 × largestComponentSize(next, player)`.
- `+25 × advanceTowardWin(next, player)` (push red toward row 10, white toward col 10).
- **`−150 × (number of opponent winning moves after our placement)`** — this is the **edge-trap / box-in avoidance**: placing near the edge can remove our own escape squares and hand the opponent an immediate box-in, exactly the "detect the possibility before it happens" warning in `02_basic_heuristics.md`. Moves that enable an opponent surround must be deprioritized.
- `advanceTowardWin` needs the post-placement board; reuse the component code.

**Performance note:** board is tiny (121 cells, ≤ ~40–50 valid moves). The fork/defense scans (each move × each winning-move scan) are fine with BFS-based `checkConnectionWin`/`checkSurroundWin`. No memoization needed. Every helper must treat the board as immutable (`place` returns a new board).

**Correctness notes:**
- Our move can never create an opponent *connection* win, but it CAN create an opponent *surround* win (by filling an escape square of our own edge component) — that's why the greedy penalty and step-4 defense both matter.
- Step 2 (defend win) must remove ALL opponent winning moves, not just one — filter by `winningMoves(next, opp).length === 0`.
- In step 6, only run the fork-defense scan if `hasFork(board, opp)` is true, and only return a move that satisfies BOTH `winningMoves(next, opp).length === 0` AND `!hasFork(next, opp)`.
- Respect the doc's priority order strictly: win → defend → own fork → opp fork → extend. Do not reorder.

### 2. Update `src/App.tsx`
Change line 8 to `import { chooseMove } from './game/lean_ai'`. Nothing else in the file changes.

### 3. Replace `src/game/ai.ts`
**Delete the file** (user confirmed). It is fully superseded; `App.tsx` was its only consumer. Do not keep any of its old logic (opening book, forcing/defensive roles, etc.).

### 4. Verify
- `npm run lint`
- `npm run build`
- Optionally manual sanity check via `npm run dev` (play vs computer as both colors); AI must never attempt an illegal move, and must not throw on empty moves (`return null`).

## Decisions already made
- Delete `ai.ts` (confirmed by user) rather than keeping it as a re-export.
- Keep `chooseMove`'s existing signature so only the import path in `App.tsx` changes.
- Implementation reuses `logic.ts`; do not add new rule logic.
- Do not commit anything (only commit if explicitly asked).
