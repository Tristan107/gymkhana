# Plan: Refactor `src/game/logic.ts` — unify the two BFS flood-fills

## Goal

Pure refactor of `src/game/logic.ts` with **zero behavior change**. Collapse the two
near-duplicate BFS implementations (`hasPath` + `seedQueue` + `expandNeighbors` +
`reachedEnd`, and `checkSurroundWin` + `seedBorder` + `expandEscapable` +
`hasTrappedOpponent`) into a single generic `reachableFrom()` helper, plus minor
cleanups. All exported function signatures stay identical so no other file changes.

## Findings from the review (why this is safe)

- The logic is **correct** against `.opencode/01_simplified_rules_for_ai.md`. Verified:
  - Fixed layout, corners empty, `isFixedPeg` parity, placement restrictions.
  - Connection BFS seeds the start edge with same-color cells and checks the end edge.
  - Surround flood-fill (seed border `≠ player`, expand through `≠ player`, any interior
    opponent unreachable ⇒ trapped) is correct, including corners: corner cells are always
    border cells and seeded escapable, so passing "through" them cannot create a false leak.
  - Edge-based "enclosures" (EX5 in the rules doc) correctly fail because the token on the
    border is seeded escapable.
- No bug fixes are part of this plan.
- `src/game/tests/logic.test.ts` and `src/game/tests/specRules.test.ts` cover every behavior
  that the refactor must preserve, so verification is fully automated.

## Files touched

- Only `src/game/logic.ts` (plus optionally a new test file — see "Optional").
- `reducer.ts`, `ai_v2.ts`, `boardFile.ts`, `Cell.tsx`, `constants.ts`, `types.ts`,
  and all existing tests stay untouched.

## Refactor steps

### 1. Add module-level constants and helpers

```ts
const ORTHOGONAL_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

interface Cell {
  row: number
  col: number
}

function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}
```

`ORTHOGONAL_DIRECTIONS` replaces the two inline `[[-1,0],[1,0],[0,-1],[0,1]]` arrays
(currently at lines ~98 and ~180). Keep `import type { Board, Orientation, Player }` and
the `OPPONENT`/`BOARD_SIZE` imports unchanged.

### 2. Add the generic BFS helper

Replace `seedQueue`, `reachedEnd`, `expandNeighbors`, `seedBorder`, `expandEscapable`,
`hasTrappedOpponent`, and `hasPath` with:

```ts
function reachableFrom(
  board: Board,
  isStart: (row: number, col: number) => boolean,
  isPassable: (row: number, col: number) => boolean
): boolean[][] {
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Cell[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isStart(row, col)) {
        visited[row][col] = true
        queue.push({ row, col })
      }
    }
  }

  let head = 0
  while (head < queue.length) {
    const { row, col } = queue[head]
    head++
    for (const [dr, dc] of ORTHOGONAL_DIRECTIONS) {
      const nr = row + dr
      const nc = col + dc
      if (isInsideBoard(nr, nc) && !visited[nr][nc] && isPassable(nr, nc)) {
        visited[nr][nc] = true
        queue.push({ row: nr, col: nc })
      }
    }
  }

  return visited
}
```

Notes for the implementer:
- The index-based dequeue (`head`) replaces `queue.shift()` (O(1) instead of O(n); the
  board is only 11×11 so this is cosmetic, but free).
- Queue entries are uniformly `{ row, col }` (the old surround path used `{ r, c }`).
- `isStart` runs a full-board scan instead of the old edge-only seeds — equivalent, and
  simpler. Both old `seedQueue` and `seedBorder` become a predicate over the whole board.

### 3. Rewrite `checkConnectionWin` on top of `reachableFrom`

```ts
export function checkConnectionWin(board: Board, player: Player): boolean {
  const crossesRows = player === 'red'
  const onEdge = (r: number, c: number, edge: number) =>
    crossesRows ? r === edge : c === edge
  const startEdge = 0
  const endEdge = BOARD_SIZE - 1

  const visited = reachableFrom(
    board,
    (r, c) => board[r][c] === player && onEdge(r, c, startEdge),
    (r, c) => board[r][c] === player
  )

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (crossesRows ? visited[endEdge][i] : visited[i][endEdge]) return true
  }
  return false
}
```

Equivalence to the current code:
- Old: `hasPath(board, 'red', 0, BOARD_SIZE-1, false)` and
  `hasPath(board, 'white', 0, BOARD_SIZE-1, true)`.
- Start edge: red → row 0, white → col 0. Passable = same-color cells only (same as
  `expandNeighbors`). End check: red → row 10, white → col 10 (same as `reachedEnd`).

### 4. Rewrite `checkSurroundWin` on top of `reachableFrom`

```ts
export function checkSurroundWin(board: Board, player: Player): boolean {
  const opponent = OPPONENT[player]
  const isBorder = (r: number, c: number) =>
    r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1

  const escapable = reachableFrom(
    board,
    (r, c) => isBorder(r, c) && board[r][c] !== player,
    (r, c) => board[r][c] !== player
  )

  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === opponent && !escapable[r][c]) return true
    }
  }
  return false
}
```

Equivalence to the current code:
- Seed = every border cell `!== player` (matches `seedBorder`, including corners and
  opponent tokens on the border).
- Expand = any `!== player` cell (matches `expandEscapable`).
- Trap check = interior-only scan for an opponent cell that was never reached
  (matches `hasTrappedOpponent`; the `r`/`c` loop bounds 1 … BOARD_SIZE-2 are preserved).

### 5. Optional: simplify `createBoard` with the parity formula

Replace the two nested placement loops with:

```ts
export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => {
      if ((row + col) % 2 === 0) return null
      return row % 2 === 0 ? 'red' : 'white'
    })
  )
}
```

- `(row + col) % 2 === 0` ⇒ empty (matches `isFixedPeg`'s negation).
- Odd row + even col ⇒ white (old loop 1); even row + odd col ⇒ red (old loop 2).
- TS should infer `CellValue[][]` from the ternary; if inference balks, annotate the inner
  callback's return as `CellValue` (or the array as `Board`). `logic.test.ts` verifies the
  exact layout (30/30/61, corners empty, parity positions), so any slip is caught.

### 6. Delete dead code

After steps 2–4 the following no longer exist anywhere in the file: `hasPath`,
`seedQueue`, `reachedEnd`, `expandNeighbors`, `seedBorder`, `expandEscapable`,
`hasTrappedOpponent`. Strict TS (`noUnusedLocals`) plus oxlint will fail the build if any
stray reference remains — rely on `npm run lint` + `npm run build` to catch it.

## Explicit non-goals

- **No** incremental connectivity / union-find optimization for `ai_v2.ts`. `ai_v2` calls
  `checkConnectionWin`/`checkSurroundWin` per candidate move, but at 11×11 that's
  ~2 BFS × 121 cells × ~50 candidates ≈ 12k cell visits per decision — not worth the
  complexity.
- **No** API changes: `createBoard`, `isFixedPeg`, `getTileOrientation`,
  `isCellPlayable`, `checkConnectionWin`, `checkSurroundWin` keep their exact names,
  arity, and types. `reducer.ts`, `ai_v2.ts`, `boardFile.ts`, `Cell.tsx` are untouched.
- **No** comments added (AGENTS.md: "No comments unless asked").

## Verification

1. `npm test` — runs `logic.test.ts`, `specRules.test.ts`, `reducer.test.ts`,
   `boardFile.test.ts` (excludes `ai_v2.test.ts` by design). All must pass unchanged.
2. `npm run test:ai` — confirms `ai_v2` (which imports `checkConnectionWin`,
   `checkSurroundWin`, `isCellPlayable`) is unaffected.
3. `npm run lint` — oxlint clean (no unused imports/params after deleting helpers).
4. `npm run build` — strict TS + vite build green.
5. `git diff` should show changes in `src/game/logic.ts` only.

## Optional: lock in the corner-edge-case behavior

The review confirmed the flood-fill's handling of corner and border cells is correct and
already exercised by existing tests (`EX5_NOT_BOXED`, "cannot box in a group touching the
board edge", "does not let an opponent token seal the enclosure"). No new tests are
strictly required; if desired, add one test to `logic.test.ts` asserting that a red
"U" wall whose only gap to the outside is a corner square does NOT count as a box-in
(this documents that corners never become leaks). Keep it out of scope unless asked.