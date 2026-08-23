# Track A: Optimization Groundwork for Hybrid MCTS

**Goal**: Make the core game logic 50-100x faster to enable hybrid MCTS (heuristics + MCTS) at 50k+ iterations/sec.  
**Scope**: Data structures, hot paths, win detection, flood fill, AI evaluation inlining.  
**Constraint**: Public API unchanged; all existing tests pass.

---

## File Impact Summary

| File | Change Type | Lines Added | Lines Removed |
|------|-------------|-------------|---------------|
| `src/types.ts` | Modified | ~30 | ~0 |
| `src/constants.ts` | Modified | ~180 | ~0 |
| `src/game/logic.ts` | Rewritten | ~400 | ~131 |
| `src/game/reducer.ts` | Modified | ~50 | ~30 |
| `src/game/ai_v2.ts` | Rewritten | ~600 | ~870 |
| `src/game/flatBoard.ts` | **New** | ~250 | — |
| `src/game/winDetection.ts` | **New** | ~200 | — |
| `src/game/floodFill.ts` | **New** | ~150 | — |
| `src/game/evaluation.ts` | **New** | ~300 | — |
| `src/game/tests/logic.test.ts` | Modified | ~50 | ~20 |
| **Total** | | **~2,210** | **~1,051** |

---

## 1. Type System & Encoding (`src/types.ts`)

### New Types
```typescript
// Branded types for compile-time safety
type FlatBoard = Uint8Array & { readonly __brand: 'FlatBoard' };
type PlayerCode = 0 | 1 | 2;  // 0=empty, 1=red, 2=white (matches CELL encoding)
type FixedCode = 3 | 4;       // 3=fixed_red, 4=fixed_white
type CellCode = PlayerCode | FixedCode;

// Move encoded as single uint16: row * 11 + col (0-120)
type MoveIndex = number & { readonly __brand: 'MoveIndex' };

// Adapter types for public API compatibility
interface PublicBoard { /* existing Board type */ }
interface PublicMove { row: number; col: number; }
```

### Encoding Convention (Documented in `constants.ts`)
```typescript
// CELL.EMPTY = 0
// CELL.RED   = 1  (placed red token)
// CELL.WHITE = 2  (placed white token)
// CELL.FIXED_RED   = 3  (immutable)
// CELL.FIXED_WHITE = 4  (immutable)
// Index = row * BOARD_SIZE + col  (row 0=top, col 0=left)
```

---

## 2. Lookup Tables (`src/constants.ts`)

### Pre-computed at Module Load (Zero Runtime Cost)
```typescript
// Board geometry
export const BOARD_SIZE = 11;
export const CELL_COUNT = 121;
export const INDEX_TO_RC: readonly [number, number][] = new Array(121);  // idx -> [row, col]
export const RC_TO_INDEX: number[][] = Array.from({length: 11}, () => new Array(11));

// Orthogonal neighbors: NEIGHBORS[idx] = [up, down, left, right] ( -1 = off-board )
export const NEIGHBORS: readonly (readonly [number, number, number, number])[] = new Array(121);

// Fixed peg mask: 1 = fixed peg, 0 = playable cell
export const FIXED_PEG_MASK: Readonly<Uint8Array> = new Uint8Array(121);

// Playable masks per player (excludes edges per rules)
export const PLAYABLE_MASK_RED: Readonly<Uint8Array> = new Uint8Array(121);
export const PLAYABLE_MASK_WHITE: Readonly<Uint8Array> = new Uint8Array(121);

// Edge target cells for connection win
export const EDGE_INDICES_RED: Readonly<Uint16Array>;    // row 10 (bottom)
export const EDGE_INDICES_WHITE: Readonly<Uint16Array>;  // col 10 (right)

// Opening move restrictions
export const OPENING_MASK_RED: Readonly<Uint8Array>;
export const OPENING_MASK_WHITE: Readonly<Uint8Array>;

// Zobrist hashing keys (for future MCTS transposition table)
export const ZOBRIST_KEYS: readonly [Uint32Array, Uint32Array, Uint32Array, Uint32Array];  // [empty, red, white, fixed]
export const ZOBRIST_TURN: [number, number];  // [red_to_move, white_to_move]
```

### Initialization
- All tables built once in module scope via `initLookupTables()` IIFE
- No runtime computation, no allocations after module load
- `verbatimModuleSyntax` compatible (all `const` exports)

---

## 3. Flat Board Operations (`src/game/flatBoard.ts`)

### Core Functions (Zero Allocation)
```typescript
// Create initial board with fixed pegs pre-placed
export function createFlatBoard(): FlatBoard;

// Fast copy: single Uint8Array allocation + memcpy
export function cloneBoard(board: FlatBoard): FlatBoard;

// Apply move in-place (mutates board, returns void for speed)
export function applyMove(board: FlatBoard, idx: MoveIndex, player: PlayerCode): void;

// Undo move (for MCTS simulation backtracking)
export function undoMove(board: FlatBoard, idx: MoveIndex): void;

// Get valid moves into pre-allocated output array
export function getValidMoves(board: FlatBoard, player: PlayerCode, out: MoveIndex[]): number;

// Check if game over (win or draw)
export function checkGameOver(board: FlatBoard, tilesRed: number, tilesWhite: number): 
  { gameOver: boolean; winner: PlayerCode | 0; reason: 'connection' | 'surround' | 'draw' | 'none' };

// Board hashing for transposition table
export function hashBoard(board: FlatBoard, currentPlayer: PlayerCode): number;

// Convert between public and internal representations
export function toPublicBoard(flat: FlatBoard): Board;
export function fromPublicBoard(board: Board): FlatBoard;
export function toPublicMove(idx: MoveIndex): { row: number; col: number };
export function fromPublicMove(move: { row: number; col: number }): MoveIndex;
```

### Performance Characteristics
- `cloneBoard`: ~50ns (single `Uint8Array.slice()`)
- `applyMove`: ~5ns (single array write)
- `getValidMoves`: ~200ns (no allocation, writes to pre-allocated array)

---

## 4. Win Detection (`src/game/winDetection.ts`)

### Connection Win: Union-Find (Disjoint Set)
```typescript
// Union-Find structure reused across calls (avoids allocation)
class UnionFind {
  parent: Uint16Array;  // 121 elements
  rank: Uint8Array;     // 121 elements
  constructor() { ... }
  reset(): void;
  find(x: number): number;
  union(x: number, y: number): void;
}

// Single-pass connection check
export function checkConnectionWin(board: FlatBoard, player: PlayerCode): boolean;
// Returns true if player connects their two edges
```

**Algorithm**:
1. Reset UnionFind
2. Iterate all cells; if `board[idx] === player`, union with same-color neighbors
3. Check if any start-edge cell connects to any end-edge cell
4. **No BFS queue, no visited array, no allocations**

### Surround Win: Optimized Flood Fill
```typescript
// Reuses single visited array via generation counter
const VISITED = new Uint8Array(121);
let VISIT_GEN = 1;

export function checkSurroundWin(board: FlatBoard, player: PlayerCode): boolean;
// Returns true if opponent has no path to board edge
```

**Algorithm**:
1. `VISIT_GEN++` (wraps at 255, then `VISITED.fill(0)`)
2. Seed queue with all border cells NOT owned by `player`
3. BFS using ring buffer in `Uint16Array[121]` (pre-allocated)
4. If any opponent token unvisited → not surrounded
5. **Single Uint8Array, single Uint16Array, no Set<string>, no allocations**

---

## 5. Flood Fill Utilities (`src/game/floodFill.ts`)

### Generic Reusable Flood Fill
```typescript
// Configuration for flood fill behavior
interface FloodConfig {
  blockedBy: PlayerCode | FixedCode | null;  // null = only empty cells pass
  targetColor?: PlayerCode;                   // if set, only traverse this color
  stopAtEdge?: boolean;                       // stop when reaching board edge
  maxDepth?: number;                          // early exit
}

// Result written to output arrays (no allocation)
interface FloodResult {
  visitedCount: number;
  touchesEdge: boolean;
  liberties: MoveIndex[];  // pre-allocated array, length returned
  components: Component[]; // component info
}

// Main entry point
export function floodFill(
  board: FlatBoard, 
  startIndices: MoveIndex[], 
  config: FloodConfig,
  visited: Uint8Array,      // caller provides (reused)
  queue: Uint16Array,       // caller provides (ring buffer)
  outLiberties: MoveIndex[], // caller provides
  outComponents: Component[] // caller provides
): FloodResult;
```

### Specialized Helpers (Inlined in Evaluation)
```typescript
// Count liberties of a component
export function countLiberties(board: FlatBoard, componentStart: MoveIndex, player: PlayerCode, visited: Uint8Array): number;

// Check if component touches board edge
export function componentTouchesEdge(board: FlatBoard, componentStart: MoveIndex, player: PlayerCode, visited: Uint8Array): boolean;

// Get all components of a color
export function getComponents(board: FlatBoard, player: PlayerCode, visited: Uint8Array, outComponents: Component[]): number;
```

---

## 6. Strategic Evaluation (`src/game/evaluation.ts`)

### Inlined Metrics (No Function Call Overhead)
```typescript
// All metrics computed in single pass where possible
interface StrategicMetrics {
  connect: number;        // tiles to connect (0 = already connected)
  oppConnect: number;     // opponent tiles to connect
  zigzag: number;         // axis adjacency count
  health: number;         // own vulnerable components (≤2 liberties)
  box: number;            // min tiles to box opponent
}

// Main evaluation: computes all metrics for a candidate move
export function evaluateMove(
  board: FlatBoard,
  moveIdx: MoveIndex,
  player: PlayerCode,
  opponent: PlayerCode,
  tilesPlaced: [number, number],
  // Reusable buffers (caller provides)
  visited: Uint8Array,
  queue: Uint16Array,
  uf: UnionFind,
  outComponents: Component[]
): StrategicMetrics;

// Comparison: lower is better (lexicographic)
export function compareMetrics(a: StrategicMetrics, b: StrategicMetrics): -1 | 0 | 1;

// Pick best move from array of candidates
export function pickBestMove(
  board: FlatBoard,
  candidates: MoveIndex[],
  player: PlayerCode,
  opponent: PlayerCode,
  tilesPlaced: [number, number],
  // Reusable buffers
  visited: Uint8Array,
  queue: Uint16Array,
  uf: UnionFind,
  outComponents: Component[],
  outMetrics: StrategicMetrics
): MoveIndex;
```

### Optimizations vs Current `ai_v2.ts`
| Current | Optimized |
|---------|-----------|
| `place()` allocates new board per move | In-place apply/undo on single board |
| `winningMoves()` calls `place()` + `hasWin()` per move | Union-find updated incrementally |
| `tilesToConnect()` runs 0-1 BFS per eval | Cached distance map, updated incrementally |
| `chainsWithSinglePlayableLiberty()` multiple `getComponents()` | Single `getComponents()` pass per eval |
| `Set<string>` for visited | `Uint8Array` + generation counter |
| `queue.shift()` O(n) | Ring buffer O(1) |
| 15+ function call depth | 3-4 function calls, rest inlined |

---

## 7. AI Entry Point (`src/game/ai_v2.ts`)

### Public API Unchanged
```typescript
// Existing signature preserved exactly
export function chooseMove(
  board: Board,           // public Board type (CellValue[][])
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null;           // public Move type { row, col }
```

### Internal Implementation
```typescript
// Module-level reusable buffers (avoid per-call allocation)
const EVAL_BOARD = new Uint8Array(121);
const VISITED = new Uint8Array(121);
const QUEUE = new Uint16Array(121);
const UF = new UnionFind();
const COMPONENTS = new Array<Component>(60);
const METRICS: StrategicMetrics = { connect: 0, oppConnect: 0, zigzag: 0, health: 0, box: 0 };
const CANDIDATES = new Array<MoveIndex>(61);

export function chooseMove(board: Board, player: Player, tilesPlaced: Record<Player, number>, gameOver: boolean): Move | null {
  if (gameOver) return null;
  
  // Convert to flat board (once)
  fromPublicBoard(board, EVAL_BOARD);
  const pCode = player === 'red' ? 1 : 2;
  const oCode = pCode === 1 ? 2 : 1;
  const tiles = [tilesPlaced.red, tilesPlaced.white];
  
  // Get valid moves into pre-allocated array
  const nMoves = getValidMoves(EVAL_BOARD, pCode, CANDIDATES);
  if (nMoves === 0) return null;
  
  // Opening book
  if (tiles[pCode - 1] === 0) {
    const openingMoves = filterOpeningMoves(CANDIDATES, nMoves, pCode);
    return toPublicMove(pickRandom(openingMoves));
  }
  
  // Winning move check (immediate)
  for (let i = 0; i < nMoves; i++) {
    applyMove(EVAL_BOARD, CANDIDATES[i], pCode);
    if (checkConnectionWin(EVAL_BOARD, pCode) || checkSurroundWin(EVAL_BOARD, pCode)) {
      undoMove(EVAL_BOARD, CANDIDATES[i]);
      return toPublicMove(CANDIDATES[i]);
    }
    undoMove(EVAL_BOARD, CANDIDATES[i]);
  }
  
  // Block opponent win
  for (let i = 0; i < nMoves; i++) {
    applyMove(EVAL_BOARD, CANDIDATES[i], oCode);
    if (checkConnectionWin(EVAL_BOARD, oCode) || checkSurroundWin(EVAL_BOARD, oCode)) {
      undoMove(EVAL_BOARD, CANDIDATES[i]);
      return toPublicMove(CANDIDATES[i]);
    }
    undoMove(EVAL_BOARD, CANDIDATES[i]);
  }
  
  // Forced win, forks, liberty defense - all use in-place apply/undo + evaluation
  // ... (same logic, zero allocations)
  
  // Strategic evaluation
  const bestIdx = pickBestMove(EVAL_BOARD, CANDIDATES, pCode, oCode, tiles as [number, number], 
    VISITED, QUEUE, UF, COMPONENTS, METRICS);
  
  return toPublicMove(bestIdx);
}
```

---

## 8. Reducer Adaptation (`src/game/reducer.ts`)

### Changes
- Internal state uses `FlatBoard` instead of `Board`
- `applyPlace`: uses `cloneBoard()` + `applyMove()` (no `.map()`)
- `applyUndo`: rebuilds from move history using flat board ops
- Public `GameState.board` getter converts to `Board` for React components

```typescript
// Internal state
interface InternalGameState {
  board: FlatBoard;
  currentPlayer: PlayerCode;
  // ... other fields unchanged
}

// Public getter for React
function getPublicState(internal: InternalGameState): GameState {
  return {
    ...internal,
    board: toPublicBoard(internal.board),
    currentPlayer: internal.currentPlayer === 1 ? 'red' : 'white',
  };
}
```

---

## 9. Test Updates (`src/game/tests/logic.test.ts`)

### Helper Updates
```typescript
// Old: boardWith(overrides: Override[])
// New: uses flat board internally, converts for assertions
function flatBoardWith(overrides: [number, number, CellValue][]): FlatBoard {
  const board = createFlatBoard();
  for (const [row, col, value] of overrides) {
    if (value !== null) board[row * 11 + col] = value === 'red' ? 1 : 2;
  }
  return board;
}

// Assertions convert back to public board
function expectPublicBoard(flat: FlatBoard, expected: Override[]) { ... }
```

### Test Coverage
- All existing tests pass without logic changes
- Add 2-3 tests for flat board conversion round-trip
- Add benchmark test: `chooseMove` < 1ms (currently ~500µs → target < 10µs)

---

## 10. Build & Verification

### Commands
```bash
# Type check
npm run build

# Lint
npm run lint

# Tests (excludes ai_v2.test.ts per convention)
npm run test

# AI tests (includes new fast AI verification)
npm run test:ai

# All tests
npm run test:all
```

### Performance Validation
```typescript
// Manual benchmark (run in dev console)
import { createBoard } from './game/logic';
import { chooseMove } from './game/ai_v2';

const board = createBoard();
const tiles = { red: 10, white: 10 };
const start = performance.now();
for (let i = 0; i < 1000; i++) chooseMove(board, 'red', tiles, false);
console.log(`${(performance.now() - start) / 1000}ms per move`);
// Target: < 0.01ms (10µs) per move
```

---

## Migration Checklist

- [ ] `src/types.ts` - Add branded types
- [ ] `src/constants.ts` - Add all lookup tables + Zobrist keys
- [ ] `src/game/flatBoard.ts` - New file, core board ops
- [ ] `src/game/winDetection.ts` - New file, union-find + optimized surround
- [ ] `src/game/floodFill.ts` - New file, reusable flood fill
- [ ] `src/game/evaluation.ts` - New file, inlined strategic metrics
- [ ] `src/game/logic.ts` - Rewrite using flat board, delegate to new modules
- [ ] `src/game/reducer.ts` - Adapt to flat board internally
- [ ] `src/game/ai_v2.ts` - Rewrite using in-place ops, reusable buffers
- [ ] `src/game/tests/logic.test.ts` - Update helpers
- [ ] Verify `npm run build && npm run lint && npm run test:all` pass
- [ ] Benchmark: confirm 50-100x speedup on `chooseMove`

---

## Notes for Hybrid MCTS (Future Track B)

This groundwork enables your hybrid approach:
- **Heuristic policy**: `evaluateMove()` provides move quality scores for PUCT
- **Fast simulation**: `applyMove`/`undoMove` + `checkGameOver` for playouts
- **Transposition table**: `hashBoard()` + Zobrist keys ready
- **No allocations in hot path**: MCTS can run 50k+ iterations/sec
- **Modular**: Swap `evaluation.ts` for neural net policy later

---

## Questions / Decisions Needed

1. **Zobrist keys**: Generate at build time or runtime? (Runtime is fine, ~1ms)
2. **UnionFind allocation**: Module-level singleton vs per-evaluation? (Singleton with `reset()`)
3. **Opening book**: Keep current hardcoded or generate from lookup tables?
4. **Randomness**: `Math.random()` ok, or need seeded RNG for deterministic MCTS?
5. **Export visibility**: Mark internal modules as `export` for testing, or keep `internal`?

---

## Plan File
`.opencode/plans/mcts_optimization_track_a.md`