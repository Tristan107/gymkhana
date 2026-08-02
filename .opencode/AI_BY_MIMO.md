# Gymkhana AI Implementation Plan

## Summary

This is a **Gymkhana** board game - a tile-placement connection game on an 11x11 grid. The AI needs to be rewritten in `src/game/lean_ai.ts` to follow the simplified heuristics from `.opencode/02_basic_heuristics.md`. The UI integration is already complete (`App.tsx` calls `chooseMove` from `lean_ai.ts`).

## Plan

### 1. Rewrite `src/game/lean_ai.ts`

The file will export a single `chooseMove(board, player, tilesPlaced, gameOver)` function with this priority:

1. **First move** → random placement
2. **Immediate win** → play the winning move
3. **Block opponent win** → play a move that removes all opponent winning threats
4. **Create 2-way victory** → find a move creating 2+ winning threats (unstoppable)
5. **Block opponent 2-way victory** → find a move that prevents opponent from forking
6. **Best extension** → heuristic scoring with edge trap penalty

### 2. Edge Trap Detection & Handling

The "edge trap" occurs when red pieces are near the top/bottom edge (rows 0 or 10) and white can surround them, because **red cannot place tiles in columns 0 or 10** (forbidden edge placement). Once trapped, there's no way to prevent the box-in.

**Detection algorithm:**
- For each opponent connected component near the edge (within 2 rows/cols of board boundary)
- Count the number of "escape routes" (empty cells adjacent to the component that are playable by the opponent)
- If escape routes ≤ 1, the component is at risk of being trapped
- Penalize moves that allow this situation to develop

**In scoring:**
- Add a large negative weight (e.g., -300) for moves that create edge trap vulnerability
- Add detection for "almost trapped" components (1 escape route left)

### 3. Move Validation Helper

Reuse existing `isCellPlayable` from `logic.ts` to ensure valid moves.

## Key Implementation Details

```
chooseMove(board, player, tilesPlaced, gameOver):
  moves = getValidMoves(board, player, gameOver)
  if first move → pickRandom(moves)

  // Step 1: Win immediately
  if winningMoves(board, player) → return it

  // Step 2: Block opponent immediate win
  if opponentHasWinningMoves → findBlockingMove

  // Step 3: Create 2-way threat (fork)
  if findForkMove → return it

  // Step 4: Block opponent 2-way threat
  if opponentCanFork → find safe move (no opponent fork after)

  // Step 5: Best extension with edge trap awareness
  return pickBestExtend(board, moves, player)  // includes edge trap scoring
```

**Edge trap scoring in `extendScore`:**
- `edgeTrapPenalty(board, move, opponent)` → checks if placing this move allows opponent to trap own pieces near edge
- Large negative weight: `-300 * edgeTrapPenalty`

The UI is already wired up - `App.tsx:8` imports `chooseMove` and `App.tsx:24-31` calls it on the AI's turn with a 400ms delay.

**Estimated scope:** ~220 lines, pure logic, no UI changes needed.