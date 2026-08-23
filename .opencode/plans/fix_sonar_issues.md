# Fix remaining 12 Sonar issues

Goal: resolve all 12 issues listed in `sonar_issues.json` without changing game/AI behavior.

## Verification commands (run after all edits)

```
npm run lint
npm test
npm run test:ai
npm run build
```

`npm run test:ai` is mandatory because `src/game/ai_v2.ts` is touched.

---

## 1. `src/components/DevMenu.tsx` — S6847 (MAJOR) + S1082 (BUG), line 44

Problem: the `<dialog>` element has a JSX `onClick` prop (backdrop click-to-close) but no keyboard listener; Sonar flags both the mouse listener on a non-interactive element and the missing keyboard listener.

Fix (minimal-risk approach, keeps current behavior):
- Add `const dialogRef = useRef<HTMLDialogElement>(null)` and attach the ref to the `<dialog>`.
- Remove the JSX `onClick` prop from the dialog.
- In a `useEffect`, attach a native `'click'` listener to `dialogRef.current` that calls `onClose()` when `event.target === dialogRef.current` (backdrop click). Return a cleanup function that removes it.
- Keep Escape handling via the dialog's native cancel event: add `onCancel={onClose}` to the `<dialog>` (a dialog-specific event; not flagged by S6847/S1082).
- Note: the component currently imports only `useState`; add `useRef, useEffect`.

Do NOT restructure to `ref.showModal()` — it changes mount/unmount semantics and is higher risk.

## 2. `src/constants.ts` — S3776 (CRITICAL) + S107 (MAJOR), line 70 (`classifyEdges`)

Problem: cognitive complexity 19 (>15) and 13 parameters (max 7).

Fix:
- Define an interface grouping the edge arrays, e.g.:

```ts
interface EdgeTables {
  red: number[]
  white: number[]
  redStart: number[]
  whiteStart: number[]
  redFixed: number[]
  whiteFixed: number[]
  redStartFixed: number[]
  whiteStartFixed: number[]
}
```

- Change signature to something like `classifyEdges(row: number, col: number, idx: number, isFixed: boolean, isCorner: boolean, edges: EdgeTables): void` (5–6 params).
- Replace the nested `if (isFixed) {...} else {...}` with a data-driven loop:

```ts
const targets = isFixed
  ? [[isRedEdge, edges.redFixed], [isWhiteEdge, edges.whiteFixed],
     [isRedStartEdge, edges.redStartFixed], [isWhiteStartEdge, edges.whiteStartFixed]]
  : [[isRedEdge, edges.red], [isWhiteEdge, edges.white],
     [isRedStartEdge, edges.redStart], [isWhiteStartEdge, edges.whiteStart]]
for (const [cond, arr] of targets) {
  if (cond) arr.push(idx)
}
```

(Tuple types must be explicit, e.g. `[boolean, number[]][]`, to satisfy strict TS.)
- Update the call site in `buildPlayabilityAndEdgeTables` to pass the grouped object.

## 3. `src/constants.ts` — S3776 (CRITICAL), line 104 (`buildPlayabilityAndEdgeTables`)

Problem: cognitive complexity 31.

Fix: extract per-cell logic into small helpers so the main double loop is flat:
- `markPlayable(idx, row, col, isFixed, isCorner)`: sets `playableRed`/`playableWhite`. Either return which masks to set or pass the arrays in.
- `markOpening(idx, row, col, isFixed)`: sets `openingRed`/`openingWhite`.
- The remaining loop body becomes ~4 flat statements → complexity well under 15.

Keep behavior byte-identical: same mask values for every cell.

## 4. `src/game/ai_v2.ts` — S107 (MAJOR), lines 705 & 720 (`isBetterMove`, `isTiedMove`)

Problem: each has 10 parameters (max 7).

Fix:
- Introduce:

```ts
interface MoveScores {
  connect: number
  oppConnect: number
  zigzag: number
  health: number
  box: number
}
```

- Change signatures to `isBetterMove(scores: MoveScores, best: MoveScores): boolean` and `isTiedMove(scores: MoveScores, best: MoveScores): boolean`; bodies compare fields pairwise exactly as today.
- Update `pickBestStrategic` (~line 731): compute the five metrics as today, then build one `MoveScores` object per move; keep the five `best*` scalars OR track a single `best: MoveScores` object — either works, but comparison order and tie-break randomness must remain unchanged so AI output stays identical.
- CRITICAL: do not alter evaluation order (`connect` asc, `oppConnect` desc, `zigzag` asc, `health` asc, `box` asc) or the random tie-break. `npm run test:ai` must pass unchanged.

## 5. `src/game/flatBoard.ts` — S2234 (MAJOR), lines 119–120

Problem: `edgesLinked(uf, board, startEdgesFixed, endEdges, fixedCode, playerCode)` passes arguments whose names don't match parameter names/order of `edgesLinked(uf, board, starts, ends, playerCode, fixedCode)`.

Fix: rename the last two params of `edgesLinked` to order-agnostic names, e.g. `codeA: number, codeB: number` (the function only checks `cell !== codeA && cell !== codeB`, i.e. membership in either set). No behavioral change; call sites stay as-is and now satisfy the rule.

## 6. `src/game/reducer.ts` — S3358 (MAJOR), lines 93 & 98

Problem: nested ternaries in `toPublicState`.

Fix: add a module-level lookup map near the top of the file:

```ts
const PLAYER_NAME_BY_CODE = { 0: null, 1: 'red', 2: 'white' } as const
```

Then:
- Line 93: `winner: PLAYER_NAME_BY_CODE[internal.winner]`
- Line 98: `humanPlayer: PLAYER_NAME_BY_CODE[internal.humanPlayer]`

Type the map as `Record<number, 'red' | 'white' | null>` if strict TS complains about index access. Values identical for codes 0/1/2.

## 7. `src/game/flatBoard.ts` — S3776 (CRITICAL), line 281 (`fromPublicBoard`)

Problem: cognitive complexity 17.

Fix: extract the fixed-peg branch into a helper so the loop body is flat:

```ts
function resolveFlatCode(cell: 'red' | 'white' | null, row: number): number {
  const code = cellToCode(cell)
  if (code !== CELL.EMPTY) return code
  return row % 2 === 0 ? CELL.FIXED_RED : CELL.FIXED_WHITE
}
```

Loop body becomes:

```ts
out[idx] = FIXED_PEG_MASK[idx] ? resolveFlatCode(board[row][col], row) : cellToCode(board[row][col])
```

Behavior identical (helper only called when `FIXED_PEG_MASK[idx]` is truthy, matching today's guard).

---

## Constraints / gotchas

- Strict TS + `verbatimModuleSyntax`: use `import type` where needed; no unused locals/params.
- No comments unless already present; match existing style.
- Do NOT touch `.opencode/01_simplified_rules_for_ai.md` / `02_basic_heuristics.md` semantics — AI changes are purely structural refactors; rule order in `isBetterMove` must be preserved exactly.
- Do NOT add `ai_v2.test.ts` to the default `npm test` run.

## Execution order

1. reducer.ts (#6) — smallest, isolated.
2. flatBoard.ts (#5, #7).
3. constants.ts (#2, #3).
4. ai_v2.ts (#4).
5. DevMenu.tsx (#1).
6. Run full verification suite.
