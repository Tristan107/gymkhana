# Hybrid MCTS AI Implementation Plan

## Overview
Replace "Step 7: Strategic Path Expansion" in `ai_v2.ts` with a hybrid Monte Carlo Tree Search (MCTS) algorithm. The AI will first attempt heuristic steps 1-6 (immediate wins, blocks, forced wins, forks, defenses), and only invoke MCTS when those heuristics are exhausted.

---

## Files to Create/Modify

### New Files
1. `src/game/ai_mcts.ts` - Copy of `ai_v2.ts` with Step 7 replaced by MCTS
2. `src/game/tests/ai_mcts.test.ts` - Copy of `ai_v2.test.ts` updated for new module

### Modified Files
3. `package.json` - Add `ai_mcts.test.ts` to test exclusion (like `ai_v2.test.ts`)

---

## Architecture

### Decision Pipeline (Preserved from ai_v2)
```
chooseMove(board, player, tilesPlaced, gameOver):
  1. Opening move (tilesPlaced === 0)
  2. Immediate win (connection or box-in)
  3. Block opponent immediate win
  4. Forced win near edge (offense)
  5. Defend forced win near edge (defense)
  6. Create double-threat (fork offense)
  7. Block opponent double-threat (fork defense)
  8. Single liberty defense
  9. Best liberty defense
  10. ★ HYBRID MCTS (replaces pickBestStrategic) ★
```

---

## MCTS Design

### Configuration
```typescript
const MCTS_CONFIG = {
  maxTimeMs: 2000,              // 2 second time budget per move
  explorationConstant: Math.sqrt(2),  // UCB1 C parameter
  simulationDepth: 40,          // Max plies per simulation
  heuristicPlies: 4,            // First 4 plies use heuristic-guided moves
  seed: 0x9e3779b9,             // Fixed seed for determinism
  difficulty: 'medium',         // 'easy' | 'medium' | 'hard'
};
```

### Difficulty Presets
| Difficulty | Time Budget | Effective Iterations |
|------------|-------------|---------------------|
| easy       | 500ms       | ~2,000              |
| medium     | 2000ms      | ~10,000             |
| hard       | 5000ms      | ~25,000             |

### Node Structure
```typescript
interface MCTSNode {
  board: FlatBoard;                    // Cloned Uint8Array(121)
  player: PlayerCode;                  // 1 | 2 (player to move)
  parent: MCTSNode | null;
  children: Map<number, MCTSNode>;     // moveIdx -> child
  visits: number;
  wins: number;                        // From perspective of player who made move to reach this
  moveIdx: number;                     // Move that led here
  unvisitedMoves: number[];            // Legal moves not yet expanded
  isTerminal: boolean;
  winner: PlayerCode | 0;              // 0 = draw/ongoing
  depth: number;                       // Ply depth from root
}
```

### Transposition Table
- **Key**: Zobrist hash (`hashBoard(board, player)` from `flatBoard.ts`)
- **Value**: `{ visits, wins, bestMove, depth }`
- **Size**: LRU cache, max 500,000 entries
- **Usage**: On selection/expansion, check TT first; on backpropagation, update TT

---

## Four Phases

### 1. Selection (UCB1)
```
while node has no unvisited moves and not terminal:
  node = argmax_child(UCB1(child))
UCB1 = (wins/visits) + C * sqrt(ln(parent.visits) / visits)
```
- If winning move found during selection → return immediately

### 2. Expansion
- Pick random move from `node.unvisitedMoves`
- Apply move via `applyMove(board, move, player)`
- Create child node with cloned board
- Check terminal: `checkConnectionWin` / `checkSurroundWin` / draw
- Add child to `node.children`, remove from `unvisitedMoves`

### 3. Simulation (Hybrid Playout)
```
function simulate(board, player, depth):
  if depth >= simulationDepth or terminal: return evaluate(board)
  
  moves = getValidMoves(board, player)
  if moves.length === 0: return evaluate(board)
  
  if depth < heuristicPlies:
    // Heuristic-guided: score moves, pick from top 3 with weighted random
    move = pickHeuristicMove(board, player, moves)
  else:
    // Pure random
    move = moves[randomIndex(moves.length)]
  
  applyMove(board, move, player)
  result = simulate(board, other(player), depth + 1)
  undoMove(board, move)
  return result
```

**Heuristic Move Scoring** (reuse existing functions):
- `tilesToConnect(board, player)` - lower = better
- `tilesToConnect(board, opponent)` - higher = better (blocking)
- `countVulnerableChains(board, player, opponent)` - lower = better
- `axisAdjacency(board, player)` - higher = better

### 4. Backpropagation
```
while node !== null:
  node.visits++
  node.wins += result  // 1 = win, 0.5 = draw, 0 = loss
  node = node.parent
```
- Also update transposition table entry

---

## Integration Point

In `chooseMove()` (after Step 9 - `bestDefense`):
```typescript
// Step 10: Hybrid MCTS
const mctsMove = runMCTS(EVAL_BOARD, pCode, oCode, tilesPlaced, MCTS_CONFIG)
if (mctsMove >= 0) return idxToMove(mctsMove)

// Fallback (should rarely trigger)
return idxToMove(pickBestStrategic(EVAL_BOARD, pCode))
```

**`runMCTS` Signature:**
```typescript
function runMCTS(
  board: FlatBoard,
  player: PlayerCode,
  opponent: PlayerCode,
  tilesPlaced: Record<Player, number>,
  config: MCTSConfig
): number  // Returns move index or -1
```

**Root Node Initialization:**
- Clone `board` → root.board
- `root.player = player`
- `root.unvisitedMoves = LEGAL.slice()` (all legal moves)
- Run MCTS loop until `config.maxTimeMs` elapsed
- Return `bestChild(root).moveIdx` (highest visit count)

---

## Performance Optimizations

1. **Object Pooling**: Pre-allocate `MCTSNode[]` pool (size ~50,000), reuse via free list
2. **Board Cloning**: `board.slice()` - native Uint8Array copy (~0.01ms)
3. **Move Application**: Reuse `applyMove`/`undoMove` from `flatBoard.ts`
4. **Pre-allocated Buffers**: Reuse `TMP_MOVES_A`, `LEGAL`, `WINS_LIST`, etc. from ai_v2
5. **Heuristic Move Ordering**: Sort `unvisitedMoves` by heuristic score before expansion
6. **Early Terminal Check**: In selection, if child is immediate win → return immediately

---

## Testing Strategy

### Existing Tests (Must Pass - Copy from ai_v2.test.ts)
All 16 tests verifying Steps 1-6, opening, single/best liberty defense:
- Immediate win (connection & box-in)
- Block opponent immediate win (2 tests)
- Forced win near edge (2 tests)
- Defend forced win near edge
- Create double-threat (4 tests)
- Block opponent double-threat (4 tests)
- Strategic expansion (2 tests) - now uses MCTS but should produce same/similar moves

### New MCTS-Specific Tests
```typescript
describe('ai_mcts MCTS behavior', () => {
  it('uses MCTS when heuristics exhausted (falls back to strategic)', () => {})
  it('MCTS finds connection win in 2 moves', () => {})
  it('MCTS prefers shorter path to victory', () => {})
  it('MCTS respects time budget (completes within 2100ms)', () => {})
  it('MCTS is deterministic with fixed seed', () => {})
  it('MCTS transposition table reuses positions', () => {})
  it('difficulty levels affect search depth', () => {})
})
```

### Test Execution
- Default `npm test` excludes both `ai_v2.test.ts` and `ai_mcts.test.ts`
- `npm run test:ai` runs `ai_v2.test.ts`
- Add `npm run test:mcts` for `ai_mcts.test.ts`
- `npm run test:all` runs everything

---

## Implementation Phases

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Copy & Setup | Copy ai_v2.ts → ai_mcts.ts, copy tests, update package.json | 30 min |
| 2. MCTS Core | Node pool, selection (UCB1), expansion, backpropagation | 2-3 hrs |
| 3. Simulation | Hybrid playout (heuristic 4 plies → random), terminal eval | 1-2 hrs |
| 4. Transposition Table | Zobrist integration, LRU cache, lookup/update | 1 hr |
| 5. Integration | Replace pickBestStrategic with runMCTS in chooseMove | 30 min |
| 6. Testing | Run existing tests, add MCTS tests, verify no regression | 1-2 hrs |
| 7. Tuning | Benchmark, adjust constants, verify difficulty presets | 1-2 hrs |
| **Total** | | **6-11 hrs** |

---

## Key Code References (Read-Only)

| File | Exports Used |
|------|--------------|
| `src/game/flatBoard.ts` | `applyMove`, `undoMove`, `getValidMoves`, `checkConnectionWin`, `checkSurroundWin`, `hashBoard`, `fromPublicBoard` |
| `src/constants.ts` | `NEIGHBORS`, `PLAYABLE_MASK_RED/WHTIE`, `CELL_COUNT`, `ZOBRIST_KEYS`, `ZOBRIST_TURN`, `BOARD_SIZE`, `CELL` |
| `src/game/ai_v2.ts` | All helper fns: `scanComponents`, `chainInfo`, `tilesToConnect`, `countVulnerableChains`, `axisAdjacency`, `boxInTilesNeeded`, `winningMovesInto`, `findForcedWinMove`, `findForkMove`, `findForkBlockMode`, `findSingleLibertyDefense`, `findBestLibertyDefense`, `pickBestStrategic` |

---

## Open Implementation Decisions

1. **Node Pool Size**: Start with 50,000, monitor peak usage
2. **TT Eviction**: Simple LRU or keep all (121 bytes/entry ≈ 60MB for 500k)
3. **Virtual Loss**: For parallelization (not needed single-threaded)
4. **Progressive Widening**: Limit branching factor in early tree (optional)
5. **RAVE/MAST**: Move-value heuristics for simulation bias (optional, v2)

---

## Acceptance Criteria

- [ ] All existing ai_v2 tests pass with ai_mcts
- [ ] MCTS activates only after Steps 1-9 exhausted
- [ ] MCTS completes within 2000ms (99th percentile)
- [ ] Deterministic output with fixed seed
- [ ] Three difficulty levels functional
- [ ] Transposition table hit rate > 10% in midgame
- [ ] No memory leaks over 100 games
- [ ] Code passes `npm run lint` and `npm run build`