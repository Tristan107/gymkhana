# Plan: Introduce Computer Opponent

## Goal
Add a "Play vs computer" button on the right of the "Restart" button. When clicked, present a picker offering "Play Red" or "Play White" (Red always makes the first move). Implement a computer AI engine for both colors with color-specific heuristics and opening book.

---

## Strategy Details (Red vs White AI)

Because Red always moves first, the AI role adapts based on color:

- **Computer as Red (when human chooses "Play White"):**
  - **Initiative & Forcing Strategy:** Red starts with the first-move advantage. Red plays aggressively to force the win rather than merely survive.
  - **Opening Book:** Plays a fixed, high-value opening move in the central strip (or randomly among 2-3 top central openings) to seize center control and set tempo immediately.
  - **Forcing Logic:** Win now → block now → build a "threat-of-two" (two simultaneous winning paths so opponent cannot block both) → maximize connectivity and advancement toward the top-bottom (N–S) borders.

- **Computer as White (when human chooses "Play Red"):**
  - **Defensive & Counter-Surround Strategy:** White lacks first-move initiative, so it focuses on stopping Red's forcing plays while looking for counter-attacks.
  - **Surround / Boxing-In Wins:** White leverages its horizontal orientation to enclose Red islands. In Gymkhana, surround wins are often easier for White to set up than a full E–W connection.
  - **Defensive Logic:** Win now → block every immediate Red win / emerging threat → prioritize boxing-in Red clusters → accept draw over risky losses.

---

## Technical Tasks

### 1. Game State & Reducer (`src/game/reducer.ts`)
- Extend `GameState`:
  - `gameMode: 'pvp' | 'ai'`
  - `humanPlayer: Player | null`
- Add Action:
  - `{ type: 'START_AI'; human: Player }`: sets `gameMode: 'ai'`, `humanPlayer: human`, resets the board (`currentPlayer: 'red'`). Red always makes the first move.
- Update Action:
  - `{ type: 'RESET' }`: resets board and returns game to `'pvp'` mode (2-player mode).

### 2. AI Engine (`src/game/ai.ts`)
- **Opening Book:** If AI is Red and `tilesPlaced.red === 0`, select from pre-defined high-value central opening cells.
- **Move Selection (`chooseMove`):**
  1. **Terminal Win Check:** Scan all valid moves for immediate `checkConnectionWin` or `checkSurroundWin`.
  2. **Forced Block Check:** Scan all valid opponent moves. If opponent can win on their next move, pick the tile that blocks it.
  3. **Heuristic Evaluation:** For each playable move, compute a weighted score:
     - `connectivity`: size of merged peg clusters.
     - `advance`: reduction in distance to target boundaries (N–S for Red, E–W for White).
     - `flexibility`: maintaining multiple active threat paths.
     - `role modifier`: White prioritizes surround potential and threat blocking; Red prioritizes central dominance and path forcing.

### 3. AI Turn Execution (`src/App.tsx`)
- `useEffect` listening to `state.currentPlayer`, `state.gameOver`, `state.gameMode`, and `state.humanPlayer`.
- When `gameMode === 'ai'`, `!gameOver`, and `currentPlayer !== humanPlayer`:
  - Schedule `setTimeout(~350ms)` to allow UI render of human move.
  - Compute `row, col` via `chooseMove` and dispatch `{ type: 'PLACE', row, col }`.

### 4. UI Modifications
- **Header (`src/components/Header.tsx`):**
  - Add "Play vs computer" button to the right of "Restart Game".
  - Open modal/dialog when clicked.
- **Picker Modal (`src/components/GameModeModal.tsx` or inline):**
  - Prompt: "Choose your side (Red always starts first)"
  - Option 1: **Play Red** (Human = Red, AI = White, Human moves first)
  - Option 2: **Play White** (Human = White, AI = Red, AI moves first)
- **Status Bar (`src/components/StatusBar.tsx`):**
  - Indicate when playing vs Computer and indicate who is computer/human if helpful.

---

## Verification Plan
1. `npm run build`: Ensure TypeScript compilation and Vite build succeed.
2. `npm run lint`: Ensure oxlint passes without errors.
3. Smoke test AI as Red and AI as White.
