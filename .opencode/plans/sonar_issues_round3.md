# Plan: SonarQube round 3 — resolve all 51 issues in sonar_issues.json

Follow-up to `sonar_issues_cleanup.md` and `sonar_issues_round2.md`.
Source: fresh export `sonar_issues.json` (51 issues; line numbers verified to match current source).

Decisions confirmed with user:
- **Delete** the dead-code cluster (`evaluation.ts`, `floodFill.ts`, `winDetection.ts`) — nothing outside it imports it.
- **S2245** (Math.random): fix with inline `// NOSONAR` comments.
- **Scope**: all 51 issues, so the next scan exports an empty file.

## A. Delete dead code (12 issues resolved)

Delete these files entirely:
- `src/game/evaluation.ts` — fixes S3776 (:15, :80), S4138 (:41, :73), S107 pickBestMove 9 params (:166), S6660 else-if-only (:212), S2245 Math.random (:221)
- `src/game/floodFill.ts` — fixes S3776 (:44, :145, :203)
- `src/game/winDetection.ts` — fixes S3776 (:52, :83, :125), S4138 (:70, :74)

Verified dead: only cross-imports within the cluster exist (`evaluation.ts` imports
`UnionFind` from winDetection + `getComponents`/`Component` from floodFill). No imports from
components/hooks/firebase/tests. `ai_v2.ts` and `flatBoard.ts` have their own implementations.

## B. Components (7 issues)

### B1. GameScreen.tsx:54 & RulesScreen.tsx:14 — S6819
Change `<div data-testid="..." role="main" ...>` → `<main data-testid="..." className=...>`.
E2E uses `getByRole('main')` — still passes (implicit role).

### B2. MenuScreen.tsx:75 — S6822
Remove `role="dialog"` attribute from the native `<dialog>` (implicit role already).

### B3. DevMenu.tsx:45+51 — S6819, S6848, S1082
Convert to a native `<dialog open>` (component is conditionally rendered by App.tsx):
- Replace outer `<div className="fixed inset-0 z-50 flex items-center justify-center">` and the
  clickable backdrop `<div data-testid="dev-backdrop" ... onClick={onClose} />` with:
  ```tsx
  <dialog
    open
    data-testid="dev-menu"
    aria-labelledby="dev-menu-title"
    className="m-auto w-[calc(100%-32px)] max-w-[320px] rounded-lg border border-white/20 bg-[#151515] p-6 shadow-xl [font-family:Arial,sans-serif] backdrop:bg-black/60"
  >
  ```
  (same pattern as MenuScreen's side-picker; `backdrop:` variant replaces the backdrop div and
  removes all three findings at once). Keep the inner content unchanged; drop the now-redundant
  wrapper panel div's positioning classes as needed.
- No test or e2e references `dev-backdrop`; e2e checks `getByRole('dialog', { name: 'Developer Menu' })`
  (still satisfied) and clicks the Close button / toggles via keyboard shortcut.

### B4. GameOverOverlay.tsx:42 — S6819
Replace the wrapper div (`role="dialog" aria-modal="true"`) with `<dialog open>` keeping
`data-testid="game-over-overlay"` and `aria-labelledby="game-over-message"`; drop `aria-modal`
(not modal via showModal). Component already returns null when closed, so conditional render +
`open` works. Tailwind classes carry over (`absolute inset-0 z-10 flex ... backdrop-blur-sm`);
add UA-style resets if needed (MenuScreen precedent shows Tailwind v4 handles dialog fine).
E2E `getByRole('dialog')` keeps passing.

## C. Types & imports (4 issues)

### C1. types.ts:10 — S6564
Delete `export type MoveIndex = number`. After step A, only `flatBoard.ts` still imports it;
replace `MoveIndex` with `number` there (including removing `as MoveIndex` casts at lines 38/284,
and the return-cast in `fromPublicMove`). Remove the import.

### C2. reducer.ts:2,6 — S3863
Merge into one statement: `import type { Board, FlatBoard, Player, PlayerCode } from '../types'`.

## D. Nested ternaries (5 issues)

Pattern everywhere: `x === 1 ? 'red' : x === 2 ? 'white' : null`.

### D1. reducer.ts:52,92,97 — S3358
Rewrite existing helper without nesting:
```ts
function codeToPlayer(code: PlayerCode): Player | null {
  if (code === 1) return 'red'
  if (code === 2) return 'white'
  return null
}
```
Lines 92 (`winner`) and 97 (`humanPlayer`) already call it — no further change needed once the
helper is flat.

### D2. logic.ts:102 — S3358
Add local helper (or reuse a new exported one) and use for `result.winner`:
```ts
function winnerToPlayer(winner: number): Player | null {
  if (winner === 1) return 'red'
  if (winner === 2) return 'white'
  return null
}
```

### D3. flatBoard.ts:232 (hashBoard) — S3358
Replace `cell === CELL.RED ? 1 : cell === CELL.WHITE ? 2 : 3` with an if-chain.

### D4. flatBoard.ts:263 (fromPublicBoard) — S3358
Extract `function publicCellToCode(cell: CellValue): number` with if/else chain
(RED / WHITE / EMPTY). Also reused to reduce complexity in D8.

## E. Cognitive Complexity S3776 (9 remaining after deletions)

All behavior-preserving refactors — extract helpers; keep hot-path allocation patterns
(module-level typed-array buffers, no new allocations per call).

### E1. constants.ts:32 `initLookupTables` (86 → <15)
Split into helpers operating on shared accumulators:
- `buildSpatialTables(...)` — indexToRC/rcToIndex/neighbors loops
- `classifyEdges(row, col, idx, masks)` — the eight `if (is...Edge...) push(idx)` blocks
- `buildPlayabilityMasks(...)` — playable/opening mask logic
- `generateZobrist(): { keys, turn }` — LCG block
Main function becomes sequential calls; each helper well under 15.

### E2. flatBoard.ts:67 `checkConnectionWin` (53)
Collapse the four near-identical edge×edge scans. Extract:
- `unionOwned(board, uf, playerCode, fixedCode)` — first double loop
- `edgesLinked(uf, board, starts, ends, playerCode, fixedCode): boolean` — one start/end scan
Then body ≈ `for (const starts of [startEdges, startEdgesFixed]) for (const ends of [...])`
with early returns. Complexity drops far below 15.

### E3. flatBoard.ts:127 `checkSurroundWin` (27)
Extract `seedBorderCells(board, player, visited, queue): number` (returns tail) and
`floodUnowned(...)` BFS loop; final opponent-scan stays inline. Also note this duplicates the
BFS shape used twice — extraction makes both trivial.

### E4. flatBoard.ts:252 `fromPublicBoard` (27)
Use D4 helper plus an extracted fixed-cell fallback (`fixedCellFor(row)`); nested ifs flatten.

### E5. ai_v2.ts:539 `tilesToConnect` (30)
Extract:
- `seedEdge(board, color): void` — initial edge seeding loop (uses DIST/DEQUE)
- relax inner-body into `relaxNeighbor(board, color, idx, n, base)` or keep while-loop but move
  the 4-direction relaxation into `relax(board, color, idx)`
Keep DIST/DEQUE module buffers.

### E6. ai_v2.ts:669 `pickBestStrategic` (30)
Extract:
- `buildStrategicPool(board, player): number[]` — candidate filtering (home-lane/imminent-box/
  near-active logic, incl. fallbacks)
- `isBetterMove(connect, oppConnect, zigzag, health, box, best...): -1|0|1` comparator mirroring
  the metric priority order, replacing the giant nested conditional
Main loop reduces to compare-and-track-ties.

### E7. ai_v2.ts:434 `findForkBlockMode` (17)
Extract mode branch into `forkQualifies(board, fork, mode, attacker, defender, legal): boolean`
that also builds candidates (calls buildForkCandidatesImmediate/General). Main function becomes
loop + qualify + pickBestForkBlock.

## F. For-of conversions S4138 (16 remaining)

Mechanical: `for (let i = 0; i < arr.length; i++) { const x = arr[i] ... }` →
`for (const x of arr) ...`. Safe on arrays and TypedArrays; behavior identical.

flatBoard.ts: lines 93, 98, 106, 111, 117 (`startEdges[i]`, `endEdges[j]`,
`startEdgesFixed[i]`, `endEdgesFixed[j]`) — largely absorbed by E2's rewrite anyway.

ai_v2.ts lines (current source):
- 123 `openNeighborsInto` — iterate `cells`
- 273 `findForkMove` — iterate `LEGAL`
- 357, 363 `buildForkCandidatesImmediate` — iterate `wins`, then `legal`
- 416 `pickBestForkBlock` — iterate `CANDIDATE_BUF`
- 635, 642 `markActiveCells` — iterate `cells` (both loops)
- 673 `pickBestStrategic` — iterate `LEGAL` (absorbed by E6 pool builder)
- 683 `pickBestStrategic` — iterate `base`
- 696 `pickBestStrategic` — iterate `pool`
- 757 `openingMoves` — iterate `LEGAL`

Note: do NOT convert loops that mutate the iterated array's length or use the index for writes
(e.g. `LIBS[count++] = LIBS[i]` compaction in componentLiberties — not flagged anyway).
All listed sites are read-only iterations.

## G. S2245 Math.random (2 issues)

Add `// NOSONAR` at end of line with a short reason where Sonar allows:
- ai_v2.ts:743 — `return tiedMoves[Math.floor(Math.random() * tiedMoves.length)] // NOSONAR: non-security tie-break`
- ai_v2.ts:793 — opening-move randomization, same suffix

(Per AGENTS.md "no comments unless asked" — user explicitly chose NOSONAR.)

## Verification

1. `npm run lint`
2. `npm run build`
3. `npm test` (must stay green — AI behavior must not change; ai_v2.test.ts excluded here by design)
4. `npm run test:ai` (critical after E5–E7 and F changes to ai_v2.ts)
5. Optional but recommended: `npx playwright test` e2e (dialog/main-role changes affect DevMenu,
   GameOverOverlay, screens; getByRole assertions should still pass)
6. Re-run `./sonar-scan.sh` (needs SONAR_TOKEN + SonarQube on :9000) → expect empty
   `sonar_issues.json`

## Files touched

| File | Action |
|---|---|
| `src/game/evaluation.ts` | Delete |
| `src/game/floodFill.ts` | Delete |
| `src/game/winDetection.ts` | Delete |
| `src/types.ts` | Remove `MoveIndex` alias |
| `src/game/flatBoard.ts` | Refactor (E2–E4), ternaries (D3/D4), for-of, drop MoveIndex |
| `src/constants.ts` | Split `initLookupTables` (E1) |
| `src/game/ai_v2.ts` | Refactor (E5–E7), for-of, NOSONAR comments (G) |
| `src/game/reducer.ts` | Merge type imports, flatten `codeToPlayer` |
| `src/game/logic.ts` | Flatten winner ternary |
| `src/components/GameScreen.tsx` | `role="main"` div → `<main>` |
| `src/components/RulesScreen.tsx` | `role="main"` div → `<main>` |
| `src/components/MenuScreen.tsx` | Drop redundant `role="dialog"` |
| `src/components/DevMenu.tsx` | Native `<dialog>` conversion |
| `src/components/GameOverOverlay.tsx` | Native `<dialog>` conversion |

No changes to AI semantics, game rules, or move selection — refactors are structural only;
`npm run test:ai` is the gate.
