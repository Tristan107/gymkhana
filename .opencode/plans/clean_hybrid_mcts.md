# Clean Hybrid MCTS - Final Implementation Plan

## Goal
- Remove pure MCTS implementation and its dishonest relaxed tests
- Switch game to use hybrid `ai_mcts` with hard difficulty (5000ms)
- Remove **single/best liberty defense** from hybrid pipeline (let MCTS handle those cases)
- Delete UC15/UC16 tests (strategic preferences, not tactical certainties)
- Add logging when fallback triggers
- All remaining tests pass strictly

---

## Files to Delete
1. `src/game/ai_pure_mcts.ts`
2. `src/game/tests/ai_pure_mcts.test.ts`

---

## Files to Modify

### `src/game/ai_mcts.ts`
**Remove single/best liberty defense** (lines 1142-1146):
```typescript
// REMOVE these lines:
const singleDefense = findSingleLibertyDefense(EVAL_BOARD, pCode)
if (singleDefense >= 0) return idxToMove(singleDefense)

const bestDefense = findBestLibertyDefense(EVAL_BOARD, pCode)
if (bestDefense >= 0) return idxToMove(bestDefense)
```

**Add fallback logging** (after `runMCTS` call):
```typescript
const mctsMove = runMCTS(EVAL_BOARD, pCode, tilesPlaced.red, tilesPlaced.white)
if (mctsMove >= 0) return idxToMove(mctsMove)

console.warn('[AI] MCTS failed to select move (unexpected), falling back to pickBestStrategic')
return idxToMove(pickBestStrategic(EVAL_BOARD, pCode))
```

### `src/App.tsx`
Switch import:
```typescript
import { chooseMove, setMCTSDifficulty } from './game/ai_mcts'
```
Keep `setMCTSDifficulty('hard')`

### `src/game/tests/ai_mcts.test.ts`
**Delete these two test cases entirely** (not relax — remove):
- `it('expands strategically (red plays F4)', ...)` — UC15
- `it('expands strategically (red plays C9, D8 or E9)', ...)` — UC16

All other 17 tests remain strict.

### `package.json`
Remove pure MCTS references:
```json
"test": "vitest run --exclude=src/game/tests/ai_v2.test.ts --exclude=src/game/tests/ai_mcts.test.ts",
```
(Remove `--exclude=src/game/tests/ai_pure_mcts.test.ts` and remove `"test:pure-mcts"` line)

---

## Verification Steps
Run in order:
1. `npm run lint` — must pass
2. `npm run build` — must pass
3. `npm run test:ai` — 19/19 (ai_v2 baseline unchanged)
4. `npm run test:mcts` — 19/19 (hybrid: 14 tactical UCs + opening ×2 + determinism + time-budget)
5. `npm test` — 105/105 (rest of suite)

---

## What Remains in Hybrid Pipeline
| Step | Check | Status |
|------|-------|--------|
| 0 | Opening book (move 0) | Kept |
| 1 | Immediate win | Kept |
| 2 | Block immediate opponent win | Kept |
| 3 | Forced win near edge (offense) | Kept |
| 4 | Defend forced win near edge | Kept |
| 5 | Create immediate fork | Kept |
| 6 | Block immediate fork | Kept |
| 7 | Create general fork | Kept |
| 8 | Block general fork | Kept |
| — | **Single liberty defense** | **REMOVED → MCTS** |
| — | **Best liberty defense** | **REMOVED → MCTS** |
| 10 | **MCTS** (strategic expansion) | **Now handles liberty defense + strategy** |

---

## Expected MCTS Behavior
- Runs on moves where no tactical trigger fires (typically move 2+ in quiet positions)
- Uses `strategicRanking` priors (48 virtual visits) → favors moves that extend own connection, block opponent connection
- With 5000ms budget (~1800 iterations), converges to same top-ranked moves as `pickBestStrategic` for UC15/16 positions
- Fallback log triggers only if bug (zero iterations run)

---

## Notes
- UC1-14 remain genuine strict tests (tactical certainties)
- UC15/16 deleted (strategic preferences — MCTS free to choose)
- No guidance added to MCTS; no relaxation of remaining tests
- Hybrid `ai_mcts.ts` is the only AI module kept