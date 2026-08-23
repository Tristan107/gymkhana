# Pure MCTS AI Implementation Plan

## Goal
Create a new `ai_pure_mcts.ts` that uses MCTS for **all moves** (no heuristic pre-filtering steps 1–9), while keeping the hybrid `ai_mcts.ts` available. Switch the game to use the pure version.

---

## Design Choices

### What "Pure MCTS" Means Here
| Component | Hybrid (`ai_mcts`) | Pure (`ai_pure_mcts`) |
|-----------|-------------------|----------------------|
| Opening move (move 0) | Hardcoded opening book | MCTS with strong priors (or keep tiny opening book) |
| Immediate win/block (steps 1–2) | Instant check | **Option A**: Keep (free, guaranteed) **Option B**: Let MCTS find them |
| Forced wins/forks/defenses (steps 3–8) | Heuristic pipeline | **Option A**: Keep instant tactical checks **Option B**: Pure MCTS only |
| Strategic expansion (step 9) | `pickBestStrategic` | MCTS (already the case) |

**Recommendation**: Keep instant win/block (steps 1–2) — they're O(1) checks that guarantee correctness and save MCTS time. Everything else → MCTS. This is "pure MCTS for strategy + tactical safety net."

---

## Files to Create/Modify

### New File
1. `src/game/ai_pure_mcts.ts` — New module, exports `chooseMove`, `configureMCTS`, `setMCTSDifficulty`

### Modified Files
2. `src/App.tsx` — Switch import from `ai_mcts` to `ai_pure_mcts`
3. `package.json` — (Optional) add `test:pure-mcts` script if we add tests

---

## Implementation Details

### `ai_pure_mcts.ts` Structure
```typescript
// Imports: same as ai_mcts + flatBoard helpers needed
// - fromPublicBoard, getValidMoves, applyMove, undoMove
// - checkConnectionWin, checkSurroundWin, hashBoard
// - MAX_TILES, NEIGHBORS, CELL, BOARD_SIZE, CELL_COUNT

// Reuse MCTS engine wholesale (runMCTS, strategicRanking, scoreMove, pickGuidedMove, etc.)

// Pure chooseMove:
export function chooseMove(board, player, tilesPlaced, gameOver): Move | null {
  if (gameOver) return null
  // Convert board
  // Get legal moves
  
  // Opening: either MCTS with strong priors, OR keep openingMoves() for move 0
  if (tilesPlaced[player] === 0) {
    // Option 1: MCTS with huge prior weight on opening squares
    // Option 2: Keep openingMoves() — it's just move 0
    return idxToMove(openingMoves(EVAL_BOARD, pCode)[rand])
  }
  
  // Tactical safety net (optional but recommended)
  // Step 1: Immediate win
  if (winningMovesInto(EVAL_BOARD, pCode, WINS_LIST) > 0) 
    return idxToMove(WINS_LIST[0])
  
  // Step 2: Block immediate opponent win
  if (winningMovesInto(EVAL_BOARD, oCode, WINS_LIST) > 0)
    for (w of WINS_LIST) if (LEGAL.includes(w)) return idxToMove(w)
  
  // Everything else → MCTS
  const mctsMove = runMCTS(EVAL_BOARD, pCode, tilesPlaced.red, tilesPlaced.white)
  if (mctsMove >= 0) return idxToMove(mctsMove)
  
  // Fallback (should never happen)
  return idxToMove(pickBestStrategic(EVAL_BOARD, pCode))
}
```

### Opening Move Handling
- **Simplest**: Keep `openingMoves()` for move 0 (as current). MCTS takes over from move 1.
- **Purest**: Remove opening book entirely; let MCTS with priors choose. The strategic ranking already puts opening squares at the top (they connect to edge tokens). With 5000ms budget it will find them.
- **Middle ground**: If `tilesPlaced[player] <= 1`, use opening book; else MCTS.

**Recommendation**: Keep opening book for move 0 only. It's 10 lines, zero cost, guarantees reasonable first move.

### Priors for Pure MCTS
The existing `strategicRanking` → `PRIOR_MEAN` → 24 virtual visits is already strong. For pure MCTS:
- Increase `PRIOR_VISITS` to 32–48 (stronger prior = less random exploration needed)
- Consider adding a small "policy" prior from `tilesToConnect` delta for all moves (already indirectly captured in ranking)

### Time Budget
- Pure MCTS needs full budget every turn
- Hard preset (5000ms) is appropriate
- Could add `maxIterations` cap for deterministic testing

---

## Testing Strategy

### New Tests (in `ai_pure_mcts.test.ts` or extend `ai_mcts.test.ts`)
1. **Opening move** still respects opening book
2. **Immediate win** still found instantly
3. **Immediate block** still works
4. **Strategic moves** (UC15, UC16) now come from MCTS — verify they still pass
5. **Determinism** with fixed seed/iterations
6. **No regression** on all 16 original heuristic test cases

### Run Both Test Suites
- `test:mcts` → hybrid tests
- `test:pure-mcts` → pure tests (new script)
- Both should pass the same behavioral tests (UC1–UC16)

---

## Migration Steps

| Step | Action | Risk |
|------|--------|------|
| 1 | Copy `ai_mcts.ts` → `ai_pure_mcts.ts` | Low |
| 2 | Strip heuristic steps 3–8 from `chooseMove`, keep steps 1–2 + opening | Low |
| 3 | Tune `PRIOR_VISITS` higher (e.g., 48) | Low |
| 4 | Add/verify tests pass | Medium |
| 5 | Update `App.tsx` import to `ai_pure_mcts` | Low |
| 6 | Verify build + all test suites | Low |

---

## Open Questions for Clarification

1. **Opening book**: Keep for move 0 only, or remove entirely?
2. **Tactical safety net**: Keep instant win/block (steps 1–2), or go fully pure?
3. **Difficulty**: Keep hard (5000ms) or adjust?
4. **Test file**: Create separate `ai_pure_mcts.test.ts` or extend existing `ai_mcts.test.ts` with a config flag?
5. **Exports**: Need both `chooseMove` and config functions (`configureMCTS`, `setMCTSDifficulty`) — confirm same API.

---

## Estimated Effort
- Code: ~1 hour (mostly deletion + minor tuning)
- Testing: ~30 min
- Total: **~1.5 hours**

---

## Acceptance Criteria
- [ ] `ai_pure_mcts.ts` compiles and exports `chooseMove`
- [ ] All 16 original heuristic test cases pass (UC1–UC16)
- [ ] MCTS runs from move 1 onward (opening book only for move 0)
- [ ] Instant win/block still work
- [ ] App.tsx uses pure MCTS
- [ ] Build passes, lint passes, both test suites pass