# Plan: Fix ai_v2 TDD test boards to match the heuristics doc (UC1–16)

## Goal

Fix `src/game/tests/ai_v2.test.ts` so its boards faithfully encode the acceptance-criteria
boards in `.opencode/02_basic_heuristics.md` §4 (UC1–16), and rename the `overrides` helper
concept to `placedTokens`.

This is a **test-only** change. `src/game/ai_v2.ts` stays a stub (returns `null`), so the
tests remain red after this plan — implementing `chooseMove` is a separate follow-up.

## Context

- TDD step 1 is complete (`ai_v2.ts` stub + red `ai_v2.test.ts`, per `.opencode/plans/ai_v2_plan.md`).
- During analysis the test boards diverged from the doc UC boards:
  - Several overrides were transcribed from an older doc state (e.g. UC3 had `C7 W / E5 W / I3 R`
    giving red two winning squares `H2`+`J2`; the doc now has `E7 W` → single win `H2`).
  - UC4's doc board was corrected by the author (added `F8 W`, `J8 R`) so red has a single
    winning square `E9`; the test still encodes the old two-threat board.
  - UC1/2/6/7/9/11/13 had minor token divergences (extra fixed-peg or stray placed tokens,
    `H8` instead of `J8`, extra `H2 W`, missing `J6 W`, etc.).
- Decisions locked with the author:
  1. **Fix tests to match the doc boards** (the doc is the single source of truth).
  2. **Rename `overrides` → `placedTokens`** in the test helpers and case lists.
  3. No doc edits — the doc's UC boards (including UC7/UC11 row 8 `8 W . W . W . W . W W W`,
     i.e. placed `J8 W`) are correct as-is.

## Files

- `src/game/tests/ai_v2.test.ts` — the only file changed.
- Reference (read-only): `.opencode/02_basic_heuristics.md` §4.
- `src/game/logic.ts` — `createBoard()` for the fixed layout (30 red + 30 white pegs).
- `src/constants.ts` — `BOARD_SIZE`, `MAX_TILES`.

## Changes

### 1. Rename `overrides` → `placedTokens`

In `ai_v2.test.ts`:

```ts
type PlacedToken = [coord: string, value: CellValue]   // was Override

function boardWith(placedTokens: PlacedToken[]): Board {
  const board = createBoard()
  for (const [coord, value] of placedTokens) {
    const { row, col } = idx(coord)
    board[row][col] = value
  }
  return board
}
```

No other helper changes. `expectMove`, `tilesPlacedFor`, `idx` stay as-is.

### 2. Corrected `placedTokens` and accepted moves per case

Each list below is the exact placed (non-fixed) token set shown on the doc board for the
matching UC. Redundant fixed-peg overrides (e.g. `F9 red`, `I4 white`, `C2 white`) are
removed. Every case keeps at least one placed token for the active player (the opening-move
branch `tilesPlaced[player] === 0` is never hit), and placed-token parity matches the
declared turn.

| Case | Player | `placedTokens` (corrected) | `accepted` (corrected) |
|------|--------|----------------------------|------------------------|
| 1 | red | `G9 R, F8 R, C7 W, B6 W, F6 R, J6 W, E5 R, I5 W, D4 R, H4 W, J4 W, D2 R` | `['F10','H10']` |
| 2 | red | `F10 R, H10 R, G9 R, E7 W, D4 W, H4 W` | `['G11']` |
| 3 | white | `F10 R, G9 R, F8 W, H8 R, E7 W, D6 W, H6 R, H4 R, C3 W` | `['H2']` |
| 4 | white | `G9 R, D8 R, F8 W, H8 R, J8 R, E7 W, G7 R, D6 R, F6 R, E5 R, K5 W, B4 W, G3 W, I3 W, D2 W` | `['E9']` |
| 5 | red | `D10 R, E9 R, G5 W, D4 W` | `['F10']` |
| 6 | white | `D10 R, E9 R, G5 W` | `['F10']` |
| 7 | red | `E9 R, J8 W, F6 R, H6 W, I5 W, F4 R, I3 W, F2 R` | `['F8']` |
| 8 | red | `E9 R, F8 R, F6 R, J6 W, E5 R, H4 W, G3 W, D2 W` | `['E7']` |
| 9 | red | `D10 R, D8 R, E7 R, H4 W, D2 W, J2 W` | `['E9']` |
| 10 | red | `E9 R, G9 R, D4 W, G3 W` | `['F10']` |
| 11 | white | `E9 R, J8 W, F6 R, H6 W, I5 W, F4 R, F2 R` | `['F8']` |
| 12 | white | `E9 R, F8 R, F6 R, E5 R, H4 W, G3 W, D2 W` | `['E7','D6','D8']` |
| 13 | white | `D10 R, D8 R, E7 R, D2 W, J2 W` | `['E9','F8','F10']` |
| 14 | white | `E9 R, G9 R, G3 W` | `['F10','H10','D10']` |
| 15 | red | `F6 R, H4 W` | `['F4']` |
| 16 | red | `D10 R, H6 W` | `['C9','D8','E9']` |

Key deltas vs the current test file (for review):

- **Case 3:** drop `E5 W` and `I3 R`; `C7 W` → `E7 W`; accepted `['H2','J2']` → `['H2']`
  (doc red win is now only `H2`).
- **Case 4:** add `F8 W` and `J8 R` (author's doc fix) → red win is now only `E9`.
- **Case 1:** add `J6 W`.
- **Case 2:** `C7 W` → `E7 W`; drop redundant fixed pegs.
- **Case 6:** drop `D4 W`.
- **Cases 7/11:** `H8 W` → `J8 W`; case 11 also drops `I3 W` (doc UC11 row 3 is empty).
- **Cases 9/13:** drop `F7 R` and `H2 W` (and redundant fixed pegs).
- **Cases 8/10/12/14/15/16:** only redundant fixed-peg overrides dropped; accepted unchanged.

## Verification

1. `npm run build` — must PASS (no code changes; test file type-checks).
2. `npm run lint` — must PASS.
3. `npm test` — `ai_v2.test.ts` runs (not excluded) and **FAILS** because the stub
   `chooseMove` returns `null`. This is the expected, intended end state of this plan.
4. Sanity check the corrected boards with the real game logic
   (`checkConnectionWin` / `checkSurroundWin` / `winningMoves`): on each board the active
   player's immediate winning squares (if any) are exactly within the accepted set
   (e.g. UC3 → only `H2`; UC4 → only `E9`; UC1 → `F10`/`H10`; UC2 → `G11`).

## Out of scope (follow-up)

Implement `chooseMove` in `src/game/ai_v2.ts` per the 7-step pipeline in
`02_basic_heuristics.md` until `ai_v2.test.ts` and `puzzleRunner.test.ts` pass. That is the
next plan; this plan intentionally leaves the tests red.