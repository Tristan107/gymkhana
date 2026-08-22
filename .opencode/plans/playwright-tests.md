# Playwright E2E Test Plan for Gymkhana

## Overview
- **Game**: Hex-like strategy (11×11, orthogonal adjacency, 20 tokens/player)
- **Modes**: Local PvP, vs AI (rule-based), Online (Firebase RTDB) — *Online tests NOT included per user request*
- **Win**: Connection (Red vertical, White horizontal) or Boxing In
- **Stack**: Vite + React 19 + TypeScript + Tailwind 4

## Existing Tests
- Unit: `src/game/tests/` (6 files: logic, reducer, ai_v2, replay, boardFile, specRules)
- E2E: `e2e/smoke.spec.ts` (basic board render only)
- Playwright config: `playwright.config.ts` → runs against `npm run dev` (port 5173), Chromium + Firefox

---

## Required Code Changes for Testability

### 1. Add `data-testid` / `data-row` / `data-col` to Cell (`src/components/Cell.tsx`)
```tsx
<div
  className={className}
  data-testid={`cell-${row}-${col}`}
  data-row={row}
  data-col={col}
  {...cellProps}
>
```

### 2. Add `data-testid` to key UI elements
| Component | Elements |
|-----------|----------|
| `MenuScreen.tsx` | Play PvP, Play AI, Play Online, How to Play buttons; side picker Red/White/Cancel |
| `GameScreen.tsx` | Menu, How to Play, Play Again, Undo, Rematch buttons; tiles remaining |
| `StatusBar.tsx` | Turn indicator, timer |
| `GameOverOverlay.tsx` | Message, Play Again, Rematch, Close |
| `Board.tsx` | Board container, coordinates toggle |
| `DevMenu.tsx` | Export, Import, Toggle Coordinates, Close |
| `OnlineScreen.tsx` | Create/Join buttons, code input, copy link, cancel |
| `RulesScreen.tsx` | Back button, images |

### 3. Add `data-testid` to screens for routing verification
- `MenuScreen`: `data-testid="menu-screen"`
- `GameScreen`: `data-testid="game-screen"`
- `OnlineScreen`: `data-testid="online-screen"`
- `RulesScreen`: `data-testid="rules-screen"`

---

## Test Files to Create

### P0 — Core Gameplay (no external deps)

#### `e2e/menu-navigation.spec.ts`
- Load `/` → verify MenuScreen visible
- Click "Play local game" → GameScreen (PvP mode), Red to move
- Click "Play vs AI" → side picker dialog opens
  - Select Red → GameScreen (AI mode, human=Red, AI=White moves first after ~400ms)
  - Select White → GameScreen (AI mode, human=White, human moves first)
  - Cancel → back to MenuScreen
- Click "Play online game" → OnlineScreen
- Click "How to Play" → RulesScreen → Back → MenuScreen
- Escape key closes side picker

#### `e2e/local-pvp.spec.ts`
- Start PvP, verify Red starts, tiles: Red 20/White 20
- Alternate placements: Red → White → Red...
- Verify StatusBar turn indicator updates
- Verify tiles remaining decrement
- Verify last-move dot on most recent placement
- **Invalid moves rejected** (state unchanged, turn unchanged):
  - Occupied cell
  - Corners (0,0) and (10,10)
  - Red on col 0 or 10 (A/K)
  - White on row 0 or 10 (1/11)
  - After game over
- **Valid moves accepted**
- **Win conditions** (mirror `reducer.test.ts`):
  - Red connection: `[[1,1],[2,10],[3,1],[4,10],[5,1],[6,10],[7,1],[8,10],[9,1]]`
  - White connection: `[[2,2],[1,1],[4,2],[1,3],[6,2],[1,5],[8,2],[1,7],[10,2],[1,9]]`
  - Red box-in: `[[0,4],[2,10],[2,4],[4,10],[1,3],[6,10],[1,5]]`
  - White box-in: `[[4,6],[1,3],[6,6],[3,3],[8,6],[2,2],[10,6],[2,4]]`
  - Draw: 40 moves filling board, no winner
- GameOverOverlay shows correct message + winner color accent
- "Play Again" → fresh PvP game
- "Menu" → MenuScreen
- "How to Play" → RulesScreen → Back → game preserved
- DevMenu (Ctrl+Shift+X) → Toggle Coordinates → A-K / 1-11 labels appear

#### `e2e/ai-game.spec.ts`
- Start as Red (human first) — verify human moves, then AI responds (~400ms)
- Start as White (AI first) — AI moves immediately after load
- AI only plays valid, playable cells
- **Undo button** (AI mode only):
  - After human+AI move: Undo removes both, back to human turn
  - During AI thinking (human moved, AI pending): Undo removes human move + previous AI move
  - From game-over: Undo clears win, restores playable state
  - Empty history: no-op
- Human wins by connection / box-in
- AI wins by connection / box-in
- Draw at 20 tiles each
- "Play Again" restarts with same human color

---

### P1 — Mechanics & UI Coverage

#### `e2e/win-conditions.spec.ts`
Explicit verification of each win type (independent tests, not full game flows):
- Red connection: vertical path top→bottom using fixed pegs + placements
- White connection: horizontal path left→right
- Red box-in: surround single White token (4 orthogonal Red)
- White box-in: surround single Red token
- Box-in rejected with open side
- Box-in rejected for edge-touching group
- Draw: both at MAX_TILES, no winner

#### `e2e/board-interactions.spec.ts`
- Cell states:
  - Empty playable: hover shows preview tile (correct orientation)
  - Occupied fixed peg: renders as square (not tile rect)
  - Occupied placed token: renders as tile rect with orientation
  - Unplayable: no hover preview, no click handler
- Last-move indicator (small dot) on most recent placement
- Keyboard: Tab focuses playable cells, Enter/Space places token
- Click places token
- Responsive: board scales, no overflow
- Coordinates overlay when enabled (DevMenu)

#### `e2e/rules-screen.spec.ts`
- Open from Menu → RulesScreen visible
- Open from GameScreen → RulesScreen visible
- Both win conditions displayed with images:
  - Red connection, White connection
  - Red box-in, White box-in
- Images load (naturalWidth > 0)
- "Back" returns to originating screen

#### `e2e/dev-menu.spec.ts`
- Ctrl+Shift+X opens DevMenu (local game only)
- Export → clipboard contains board text
- Import valid text → loads board, preserves mode+human
- Import invalid text → error toast, board unchanged
- Toggle Coordinates → board shows/hides A-K / 1-11
- Close → DevMenu hidden

#### `e2e/responsive.spec.ts`
- Viewport < 901px: stacked layout, board full width, sidebar stacks
- Viewport ≥ 901px: side-by-side, sidebar fixed ~160px
- Buttons wrap/unwrap correctly
- Text readable at all sizes
- RulesScreen images scale

---

### P2 — Visual Regression (Screenshots)

#### `e2e/visual-regression.spec.ts`
**Baseline screenshots** (update with `npx playwright test --update-snapshots`):
- MenuScreen (desktop + mobile)
- GameScreen initial (PvP, AI-as-Red, AI-as-White)
- GameScreen mid-game (tokens placed, last-move dot)
- GameOverOverlay: Red connection win, White connection win, Red box-in, White box-in, Draw
- RulesScreen (all 4 images visible)
- OnlineScreen create/join forms
- DevMenu open

**Test matrix**: Chromium + Firefox, desktop (1280×720) + mobile (375×667)

---

## Test Helpers (`e2e/fixtures/`)

### `e2e/fixtures/game-helpers.ts`
```typescript
import { Page, Locator, expect } from '@playwright/test';

export const WINNING_MOVES = {
  redConnection: [[1,1], [2,10], [3,1], [4,10], [5,1], [6,10], [7,1], [8,10], [9,1]] as [number, number][],
  whiteConnection: [[2,2], [1,1], [4,2], [1,3], [6,2], [1,5], [8,2], [1,7], [10,2], [1,9]] as [number, number][],
  redBoxIn: [[0,4], [2,10], [2,4], [4,10], [1,3], [6,10], [1,5]] as [number, number][],
  whiteBoxIn: [[4,6], [1,3], [6,6], [3,3], [8,6], [2,2], [10,6], [2,4]] as [number, number][],
};

export async function clickCell(page: Page, row: number, col: number): Promise<void> {
  await page.locator(`[data-testid="cell-${row}-${col}"]`).click();
}

export async function playMoves(page: Page, moves: [number, number][]): Promise<void> {
  for (const [row, col] of moves) {
    await clickCell(page, row, col);
    await expect(page.locator(`[data-testid="cell-${row}-${col}"] .tile`)).toBeVisible({ timeout: 2000 });
  }
}

export async function startPvP(page: Page): Promise<void> {
  await page.getByTestId('btn-play-pvp').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
}

export async function startAI(page: Page, human: 'red' | 'white'): Promise<void> {
  await page.getByTestId('btn-play-ai').click();
  await page.getByTestId(`ai-side-${human}`).click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
}

export async function openRules(page: Page): Promise<void> {
  await page.getByTestId('btn-rules').click();
  await expect(page.getByTestId('rules-screen')).toBeVisible();
}

export async function openDevMenu(page: Page): Promise<void> {
  await page.keyboard.press('Control+Shift+X');
  await expect(page.getByTestId('dev-menu')).toBeVisible();
}

export async function expectGameOver(page: Page, winner: 'red' | 'white' | 'draw'): Promise<void> {
  const overlay = page.getByTestId('game-over-overlay');
  await expect(overlay).toBeVisible();
  if (winner === 'draw') {
    await expect(overlay.getByTestId('win-message')).toContainText(/draw/i);
  } else {
    await expect(overlay.getByTestId('win-message')).toContainText(new RegExp(winner, 'i'));
  }
}
```

### `e2e/fixtures/visual-helpers.ts`
```typescript
import { Page, expect } from '@playwright/test';

export async function screenshotMatch(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    maxDiffPixels: 100,
    threshold: 0.2,
  });
}
```

---

## AI Strategic Behavior Tests

Since AI is deterministic *given the same board state* (only `pickRandom` introduces randomness among equally-scored moves), test specific scenarios where AI has a **forced best move**:

| Scenario | Expected AI Move | Rationale |
|----------|------------------|-----------|
| Opening (tilesPlaced=0) | Adjacent to fixed peg on home lane | `openingMoves()` filter |
| Immediate win available | Takes winning move | `winningMoves()` priority 1 |
| Opponent has immediate win | Blocks it | `block` priority 2 |
| Fork (2+ winning moves) | Creates fork | `findForkMove()` immediate |
| Opponent fork threat | Blocks fork | `findForkBlock()` immediate |
| Own chain 1 liberty | Defends liberty | `findLibertyDefense()` single |
| No tactics | Strategic: minimize `tilesToConnect`, maximize opp connect, minimize zigzag, health, box | `pickBestStrategic()` |

**Test approach**: Set up board via `LOAD_BOARD` (DevMenu import) → verify AI chooses expected move.

Example test:
```typescript
test('AI blocks immediate opponent win', async ({ page }) => {
  await startAI(page, 'white'); // human=White, AI=Red moves first
  // Set up board where White has winning move at (5,5)
  await openDevMenu(page);
  await page.getByTestId('dev-import').fill(boardTextWithWhiteThreatAt55);
  await page.getByTestId('dev-import-submit').click();
  await page.getByTestId('dev-close').click();
  // AI (Red) should play at (5,5) to block
  await expect(page.locator('[data-testid="cell-5-5"] .tile.red')).toBeVisible({ timeout: 3000 });
});
```

---

## Running Tests

```bash
# All E2E
npm run test:e2e

# Specific file
npx playwright test e2e/local-pvp.spec.ts

# With UI mode
npx playwright test --ui

# Debug (headed, slow)
npx playwright test --debug

# Update visual baselines
npx playwright test --update-snapshots

# Headed (see browser)
npx playwright test --headed
```

---

## CI Integration (Future)
- `.github/workflows/e2e.yml`:
  - `npm ci && npx playwright install --with-deps`
  - `npm run build && npm run test:e2e`
  - Upload `e2e-results/` as artifact on failure
  - Visual regression: store baselines in repo, fail on diff

---

## Dependencies
- `@playwright/test` already in `devDependencies`
- No new packages needed

---

## File Structure After Implementation
```
e2e/
├── fixtures/
│   ├── game-helpers.ts
│   └── visual-helpers.ts
├── menu-navigation.spec.ts
├── local-pvp.spec.ts
├── ai-game.spec.ts
├── win-conditions.spec.ts
├── board-interactions.spec.ts
├── rules-screen.spec.ts
├── dev-menu.spec.ts
├── responsive.spec.ts
├── visual-regression.spec.ts
└── snapshots/  (auto-generated visual baselines)
```

---

## Notes
- **No online tests** per user request
- **Visual regression** enabled with snapshot testing
- **AI strategic tests** verify specific forced-move scenarios, not just validity
- **Test IDs** added to components for reliable, maintainable selectors
- **Helpers** reduce duplication, make tests readable