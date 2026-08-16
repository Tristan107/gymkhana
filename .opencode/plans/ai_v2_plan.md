# Plan: Replace lean_ai with ai_v2 (TDD — Step 1: red test + stub)

## Goal

Replace the old rule-based AI in `src/game/lean_ai.ts` with a new `ai_v2` AI that
implements the rewritten heuristics in `.opencode/02_basic_heuristics.md`.

This plan covers **only TDD step 1**:
- Delete the old AI files.
- Create a minimal `ai_v2` stub so the build stays green and imports resolve.
- Create a new test file `ai_v2.test.ts` that encodes **every acceptance criterion**
  from `02_basic_heuristics.md` §4.
- The new test must **FAIL** at the end of this step (red) because the stub returns `null`.

A later step (not in this plan) will implement the actual `chooseMove` logic in
`src/game/ai_v2.ts` until the tests pass.

---

## Specification documents (read these first)

- `.opencode/01_simplified_rules_for_ai.md` — board layout, coordinates, placement rules, win conditions.
- `.opencode/02_basic_heuristics.md` — the decision pipeline (7 steps) and the concrete acceptance-criteria boards (§4).

---

## Coordinate mapping (docs → board indices)

The board is `Board = CellValue[][]` where `board[row][col]` and `CellValue = 'red' | 'white' | null`.

- Chess **Row N** (1 = bottom … 11 = top) → **row index** = `11 - N`.
  - `Row 1` → index `0`, `Row 11` → index `10`.
- Chess **Column A..K** (A = left … K = right) → **col index** = `charCode - 65` (A=0 … K=10).
- `createBoard()` from `src/game/logic.ts` already builds the full fixed layout
  (30 red + 30 white staggered pegs). Tests **override only the placed tokens**
  shown in each doc board, on top of `createBoard()`.

Fixed layout (already present in `createBoard()`, do not override):
- Red fixed pegs: odd display rows (1,3,5,7,9), columns B,D,F,H,J.
- White fixed pegs: even display rows (2,4,6,8,10), columns A,C,E,G,I,K.
- Corners A1, A11, K1, K11 do not exist.

---

## Files

### 1. Create `src/game/ai_v2.ts` (STUB — no logic)

Minimal stub so imports resolve and type-check passes, but assertions fail.

```ts
import type { Board, Player } from '../types'

export interface Move {
  row: number
  col: number
}

export function chooseMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null {
  return null
}
```

Notes:
- Must export `Move` (a type) and `chooseMove` (a function) with the exact signature above.
- Keep `board`/`player`/`tilesPlaced`/`gameOver` params even though unused (strict TS
  `noUnusedParameters` may complain — if so, prefix unused with `_` or reference them
  via `void`; follow the repo's strict TS conventions).
- The body returns `null` for every input — this is the deliberate TDD red state.

### 2. Delete `src/game/lean_ai.ts`
The old implementation. Entirely superseded by `ai_v2`.

### 3. Delete `src/game/tests/lean_ai.test.ts`
Old tests for the old AI. Superseded by `ai_v2.test.ts`.

### 4. Rewire broken imports to `ai_v2` (deleting `lean_ai.ts` breaks these)

- `src/App.tsx` line 11:
  - From: `import { chooseMove } from './game/lean_ai'`
  - To: `import { chooseMove } from './game/ai_v2'`
  - (Only `chooseMove` is used here; `Move` is not imported in App.tsx.)
- `src/game/tests/puzzleRunner.ts` lines 5–6:
  - From: `import { chooseMove } from '../lean_ai'` and `import type { Move } from '../lean_ai'`
  - To: `import { chooseMove } from '../ai_v2'` and `import type { Move } from '../ai_v2'`
  - (Used in `runPuzzle` at line 66.)

### 5. Create `src/game/tests/ai_v2.test.ts`

Imports needed:
- `describe, expect, it` from `vitest`
- `BOARD_SIZE` from `../../constants`
- `Board, CellValue, Player` types from `../../types`
- `createBoard` from `../logic`
- `chooseMove` from `../ai_v2` (type `Move`)

Helpers (mirror the style of `src/game/tests/logic.test.ts`):

```ts
const COLS = 'ABCDEFGHIJK'

function idx(coord: string): { row: number; col: number } {
  const col = COLS.indexOf(coord[0].toUpperCase())
  const displayRow = parseInt(coord.slice(1), 10)
  return { row: BOARD_SIZE - displayRow, col }
}

type Override = [coord: string, value: CellValue]

function boardWith(overrides: Override[]): Board {
  const board = createBoard()
  for (const [coord, value] of overrides) {
    const { row, col } = idx(coord)
    board[row][col] = value
  }
  return board
}

// Count placed tokens (total minus the 30 fixed pegs per color), like boardFile.ts.
function tilesPlacedFor(board: Board): Record<Player, number> {
  let red = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === 'red') red++
      else if (cell === 'white') white++
    }
  }
  return { red: red - 30, white: white - 30 }
}

// Run chooseMove and assert the returned move is one of the accepted chess coords.
function expectMove(board: Board, player: Player, accepted: string[]): void {
  const placed = tilesPlacedFor(board)
  const move = chooseMove(board, player, placed, false)
  expect(move).not.toBeNull()
  const expected = accepted.map(idx)
  expect(move).toBeDefined()
  expect(expected).toContainEqual(move)
}
```

> Note: the stub returns `null`, so `expect(move).not.toBeNull()` fails first — the
> intended red state. `tilesPlacedFor` only affects the AI's opening-move branch
> (`tilesPlaced[player] === 0`); every acceptance board has at least one placed token
> for the active player, so the branch is never hit with these inputs.

#### Test cases (every acceptance criterion from `02_basic_heuristics.md` §4)

For each case, build the board with `boardWith([...])` using only the **placed
(non-fixed)** tokens from the doc ASCII board, then call `expectMove` with the
active player and the accepted move(s).

**1. Immediate win — connection** (doc "Red must play F10 or H10."), player red:
- overrides: `F9 red, G9 red, F8 red, C7 white, B6 white, C6 white, F6 red, E5 red, F5 red, I5 white, D4 red, H4 white, I4 white, J4 white, D2 red`
- accepted: `['F10', 'H10']`

**2. Immediate win — box-in** (doc "Red must play G11"), player red:
- overrides: `F10 red, H10 red, F9 red, G9 red, C7 white, C4 white, D4 white, H4 white, I4 white`
- accepted: `['G11']`

**3. Block opponent immediate win (ex1)** (doc "White must play H2 or J2."), player white:
- overrides: `F10 red, F9 red, G9 red, E8 white, F8 white, H8 red, C7 white, C6 white, D6 white, H6 red, E5 white, H4 red, C3 white, H3 red, I3 red, J3 red`
- accepted: `['H2', 'J2']`

**4. Block opponent immediate win (ex2)** (doc "White must play E9."), player white:
- overrides: `F9 red, G9 red, D8 red, H8 red, E7 white, G7 red, H7 red, D6 red, F6 red, E5 red, F5 red, K5 white, B4 white, C4 white, G3 white, I3 white, C2 white, D2 white`
- accepted: `['E9']`

**5. Forced win near edge** (doc "Red must play F10"), player red:
- overrides: `D10 red, E9 red, F9 red, G5 white, C4 white, D4 white`
- accepted: `['F10']`

**6. Defend forced win near edge** (doc "White must play F10"), player white:
- same overrides as case 5
- accepted: `['F10']`

**7. Create double-threat (ex1)** (doc "Red must play F8."), player red:
- overrides: `E9 red, F9 red, H8 white, I8 white, F6 red, H6 white, I6 white, I5 white, F4 red, I3 white, F2 red`
- accepted: `['F8']`

**8. Create double-threat (ex2)** (doc "Red must play E7."), player red:
- overrides: `E9 red, F9 red, F8 red, F6 red, I6 white, J6 white, E5 red, F5 red, H4 white, I4 white, G3 white, C2 white, D2 white`
- accepted: `['E7']`

**9. Create double-threat (ex3)** (doc "Red must play E9."), player red:
- overrides: `D10 red, D8 red, E7 red, F7 red, H4 white, I4 white, C2 white, D2 white, H2 white, I2 white, J2 white`
- accepted: `['E9']`

**10. Create double-threat (ex4)** (doc "Red must play F10."), player red:
- overrides: `E9 red, F9 red, G9 red, H9 red, C4 white, D4 white, G3 white`
- accepted: `['F10']`

**11. Block opponent double-threat (ex1)** (doc "White must play F8."), player white:
- same overrides as case 7
- accepted: `['F8']`

**12. Block opponent double-threat (ex2)** (doc "White must play E7 (D6 or D8 would be ok too)."), player white:
- overrides: `E9 red, F9 red, F8 red, F6 red, E5 red, F5 red, H4 white, I4 white, G3 white, C2 white, D2 white`
- accepted: `['E7', 'D6', 'D8']`

**13. Block opponent double-threat (ex3)** (doc "White must play E9. F8 or F10 would be ok too."), player white:
- overrides: `D10 red, D8 red, E7 red, F7 red, C2 white, D2 white, H2 white, I2 white, J2 white`
- accepted: `['E9', 'F8', 'F10']`

**14. Block opponent double-threat (ex4)** (doc "White must play F10. H10 and D10 are ok too."), player white:
- overrides: `E9 red, F9 red, G9 red, H9 red, G3 white`
- accepted: `['F10', 'H10', 'D10']`

**15. Strategic path expansion (ex1)** (doc "Red must play F4"), player red:
- overrides: `F6 red, H4 white, I4 white`
- accepted: `['F4']`

**16. Strategic path expansion (ex2)** (doc "Red must play C9, D8 or E9"), player red:
- overrides: `D10 red, H6 white, I6 white`
- accepted: `['C9', 'D8', 'E9']`

All `boardWith` overrides list the placed (non-fixed) tokens for the active player
and the opponent. Do **not** add overrides for fixed pegs (already in `createBoard()`).

---

## Verification (after implementing this step)

1. `npm run build` — must PASS (stub compiles, imports rewired to `ai_v2`).
2. `npm run lint` — must PASS.
3. `npm test` — must run `src/game/tests/ai_v2.test.ts` (not excluded) and **FAIL**,
   because the stub `chooseMove` returns `null` (TDD red). This is the expected outcome.
4. `npm run test:ai` — runs `puzzleRunner.test.ts` (against the empty stub) and will
   FAIL; `lean_ai.test.ts` is deleted. This is expected during the red phase and
   resolves once `ai_v2.ts` is implemented.

---

## Test runner config notes

- `package.json` `test` script: `vitest run --exclude src/game/tests/lean_ai.test.ts --exclude src/game/tests/puzzleRunner.test.ts`
  - `ai_v2.test.ts` is NOT excluded, so it runs in the default `npm test`.
- `test:ai` runs only `lean_ai.test.ts` and `puzzleRunner.test.ts` explicitly.
  - After this step `lean_ai.test.ts` is deleted; `puzzleRunner.test.ts` runs against the stub.
- `AGENTS.md` conventions: strict TS (`import type`), no unused locals, no comments
  unless asked, oxlint (not eslint), `npm test` excludes the slow/AI test files.

---

## Dependencies

- `src/game/logic.ts` — `createBoard` (used by test helper), plus (later) `checkConnectionWin`,
  `checkSurroundWin`, `isCellPlayable` for the real implementation.
- `src/constants.ts` — `BOARD_SIZE` (used by helper), `OPPONENT`, `MAX_TILES`.
- `src/types.ts` — `Board`, `Player`, `CellValue`.
- `src/game/boardFile.ts` — reference for coordinate parsing and placed-token counting
  (`parseCell`, `boardToText`); its pattern informs the test helpers.

## Follow-up (NOT in this step)

Implement `chooseMove` in `src/game/ai_v2.ts` per the 7-step pipeline in
`02_basic_heuristics.md` until `ai_v2.test.ts` and `puzzleRunner.test.ts` pass.
