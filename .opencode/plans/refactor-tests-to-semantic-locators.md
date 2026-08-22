# Plan: Refactor Playwright Tests to Use Semantic Locators

## Overview
Replace all `data-testid` / `getByTestId` usage in e2e tests with Playwright's recommended semantic locators (`getByRole`, `getByText`, `getByLabel`, `getByAltText`, `getByPlaceholder`, `getByTitle`). This aligns with Playwright best practices and makes tests more resilient to UI changes.

**Exception:** Board cells (`cell-${row}-${col}`) will retain `data-testid` since they have no human-visible text and are internal game pieces.

---

## Phase 1: Add Accessibility Attributes to Components

### 1.1 MenuScreen.tsx
| Element | Current | Add |
|---------|---------|-----|
| "Play online game" button | `data-testid="play-online"` | (none needed - visible text) |
| "Play local game" button | `data-testid="play-pvp"` | (none needed - visible text) |
| "Play vs AI" button | `data-testid="play-ai"` | (none needed - visible text) |
| "How to Play" button | `data-testid="how-to-play"` | (none needed - visible text) |
| Side picker dialog | `data-testid="side-picker"` | `role="dialog" aria-labelledby="side-picker-title"` |
| "Choose your side" heading | - | `id="side-picker-title"` |
| Close side picker button | `data-testid="side-picker-close"` | `aria-label="Close side selection"` (already present) |
| "Play as Red" button | `data-testid="side-red"` | `aria-label="Play as Red"` (already present) |
| "Play as White" button | `data-testid="side-white"` | `aria-label="Play as White"` (already present) |
| "Cancel" button | `data-testid="side-picker-cancel"` | (none needed - visible text) |

### 1.2 GameScreen.tsx
| Element | Current | Add |
|---------|---------|-----|
| Game screen container | `data-testid="game-screen"` | `role="main"` |
| Header | (in Header.tsx) | — |
| "Menu" button | `data-testid="menu-button"` | (none needed - visible text) |
| "How to Play" button | `data-testid="how-to-play"` | (none needed - visible text) |
| "Play Again" button | `data-testid="play-again"` | (none needed - visible text) |
| "Undo" button | `data-testid="undo-button"` | (none needed - visible text) |
| "Rematch" button | `data-testid="rematch-button"` | (none needed - visible text) |
| "Red tiles left: X" | `data-testid="red-tiles-left"` | `role="status" aria-live="polite"` |
| "White tiles left: X" | `data-testid="white-tiles-left"` | `role="status" aria-live="polite"` |

### 1.3 Board.tsx
| Element | Current | Add |
|---------|---------|-----|
| Board container | `data-testid="board"` | `role="grid" aria-label="Game board"` |
| Coordinate row/col labels | (rendered when `showCoordinates`) | `role="rowheader"` / `role="columnheader"` |

### 1.4 Cell.tsx
- **Keep `data-testid="cell-${row}-${col}"`** (no human-visible text)
- Already has: `role="button"`, `tabIndex={0}`, keyboard handlers
- Add: `aria-label="${row}, ${col}"` or `aria-label="Cell ${colLabel}${rowLabel}"` for screen readers

### 1.5 GameOverOverlay.tsx
| Element | Current | Add |
|---------|---------|-----|
| Overlay container | `data-testid="game-over-overlay"` | `role="dialog" aria-modal="true" aria-labelledby="game-over-message"` |
| Close button | `data-testid="game-over-close"` | `aria-label="Close result"` (already present) |
| Win message | `data-testid="win-message"` | `id="game-over-message"` |
| "Play Again" button | `data-testid="game-over-play-again"` | (none needed - visible text) |
| "Rematch" button | `data-testid="game-over-rematch"` | (none needed - visible text) |

### 1.6 RulesScreen.tsx
| Element | Current | Add |
|---------|---------|-----|
| Rules screen container | `data-testid="rules-screen"` | `role="main"` |
| "Back" button | `data-testid="rules-back"` | (none needed - visible text) |
| Images | `data-testid="img-*"` | `alt` text (already present) |

### 1.7 DevMenu.tsx
| Element | Current | Add |
|---------|---------|-----|
| Backdrop | `data-testid="dev-backdrop"` | (keep - no visible text, functional) |
| Dev menu dialog | `data-testid="dev-menu"` | `role="dialog" aria-labelledby="dev-menu-title"` |
| "Developer Menu" heading | - | `id="dev-menu-title"` |
| "Show coordinates" checkbox | `data-testid="dev-toggle-coordinates"` | `role="switch"`, associate with label |
| "Export board" button | `data-testid="dev-export"` | (none needed - visible text) |
| "Import board" button | `data-testid="dev-import"` | (none needed - visible text) |
| Import textarea | `data-testid="dev-import-textarea"` | `aria-label="Board data to import"` |
| "Load board" button | `data-testid="dev-import-submit"` | (none needed - visible text) |
| "Close" button | `data-testid="dev-close"` | (none needed - visible text) |

### 1.8 StatusBar.tsx
| Element | Current | Add |
|---------|---------|-----|
| Status bar container | `data-testid="status-bar"` | `role="status" aria-live="polite"` |
| "Your turn" indicator | `data-testid="turn-indicator"` | (none needed - visible text) |
| Timer | `data-testid="turn-timer"` | (none needed - visible text) |

---

## Phase 2: Refactor Test Files

### 2.1 e2e/fixtures/game-helpers.ts
Replace all `getByTestId` / `[data-testid=...]` with semantic locators:

| Current | New Locator |
|---------|-------------|
| `page.getByTestId('play-pvp')` | `page.getByRole('button', { name: 'Play local game' })` |
| `page.getByTestId('game-screen')` | `page.getByRole('main')` |
| `page.getByTestId('play-ai')` | `page.getByRole('button', { name: 'Play vs AI' })` |
| `page.getByTestId('side-red')` | `page.getByRole('button', { name: 'Play as Red' })` |
| `page.getByTestId('side-white')` | `page.getByRole('button', { name: 'Play as White' })` |
| `page.locator('[data-testid="cell-${row}-${col}"]')` | **Keep** - `page.getByTestId(\`cell-${row}-${col}\`)` |
| `page.getByTestId('how-to-play')` | `page.getByRole('button', { name: 'How to Play' })` |
| `page.getByTestId('rules-screen')` | `page.getByRole('main')` |
| `page.getByTestId('rules-back')` | `page.getByRole('button', { name: 'Back' })` |
| `page.getByTestId('dev-menu')` | `page.getByRole('dialog', { name: 'Developer Menu' })` |
| `page.getByTestId('dev-toggle-coordinates')` | `page.getByRole('switch', { name: 'Show coordinates' })` |
| `page.getByTestId('dev-close')` | `page.getByRole('button', { name: 'Close' })` |
| `page.getByTestId('game-over-overlay')` | `page.getByRole('dialog', { name: /game over|wins|draw/i })` |
| `page.getByTestId('win-message')` | `page.getByText(/red wins|white wins|draw/i)` |
| `page.getByTestId('game-over-play-again')` | `page.getByRole('button', { name: 'Play Again' })` |
| `page.getByTestId('game-over-close')` | `page.getByRole('button', { name: 'Close result' })` |
| `page.getByTestId('menu-button')` | `page.getByRole('button', { name: 'Menu' })` |
| `page.getByTestId('play-again')` | `page.getByRole('button', { name: 'Play Again' })` |
| `page.getByTestId('red-tiles-left')` | `page.getByRole('status', { name: /red tiles left/i })` |
| `page.getByTestId('white-tiles-left')` | `page.getByRole('status', { name: /white tiles left/i })` |
| `page.getByTestId('turn-indicator')` | `page.getByText('Your turn')` |
| `page.getByTestId('status-bar')` | `page.getByRole('status')` |
| `page.getByTestId('board')` | `page.getByRole('grid', { name: 'Game board' })` |

### 2.2 e2e/board-interactions.spec.ts
| Test | Current Selectors | New Selectors |
|------|-------------------|---------------|
| `cell-1-1` hover | `[data-testid="cell-1-1"]` | Keep `getByTestId('cell-1-1')` |
| `cell-1-1` occupied | `[data-testid="cell-1-1"]` | Keep `getByTestId('cell-1-1')` |
| board container | `getByTestId('board')` | `getByRole('grid', { name: 'Game board' })` |
| dev-menu | `getByTestId('dev-menu')` | `getByRole('dialog', { name: 'Developer Menu' })` |
| dev-toggle-coordinates | `getByTestId('dev-toggle-coordinates')` | `getByRole('switch', { name: 'Show coordinates' })` |

### 2.3 e2e/local-pvp.spec.ts
All `getByTestId` calls replaced per mapping in 2.1.

### 2.4 e2e/ai-game.spec.ts
Apply same mappings.

### 2.5 e2e/win-conditions.spec.ts
Apply same mappings.

### 2.6 e2e/rules-screen.spec.ts
| Current | New |
|---------|-----|
| `getByTestId('rules-screen')` | `getByRole('main')` |
| `getByTestId('rules-back')` | `getByRole('button', { name: 'Back' })` |
| `getByTestId('how-to-play')` | `getByRole('button', { name: 'How to Play' })` |
| `getByTestId('img-*')` | `getByAltText(...)` |

### 2.7 e2e/menu-navigation.spec.ts
Apply mappings from 2.1.

### 2.8 e2e/dev-menu.spec.ts
| Current | New |
|---------|-----|
| `getByTestId('dev-menu')` | `getByRole('dialog', { name: 'Developer Menu' })` |
| `getByTestId('dev-toggle-coordinates')` | `getByRole('switch', { name: 'Show coordinates' })` |
| `getByTestId('dev-export')` | `getByRole('button', { name: 'Export board' })` |
| `getByTestId('dev-import')` | `getByRole('button', { name: 'Import board' })` |
| `getByTestId('dev-import-textarea')` | `getByLabel('Board data to import')` |
| `getByTestId('dev-import-submit')` | `getByRole('button', { name: 'Load board' })` |
| `getByTestId('dev-close')` | `getByRole('button', { name: 'Close' })` |
| `getByTestId('dev-backdrop')` | Keep (functional, no visible text) |

### 2.9 e2e/responsive.spec.ts
Apply mappings.

### 2.10 e2e/smoke.spec.ts
Already minimal - update if needed.

### 2.11 e2e/visual-regression.spec.ts
Update any `data-testid` usage.

---

## Phase 3: Verification

### 3.1 Run Tests
```bash
npm run test  # Should pass (excludes ai_v2.test.ts)
```

### 3.2 Run All Tests
```bash
npm run test:all  # Including AI tests
```

### 3.3 Lint
```bash
npm run lint
```

---

## Files to Modify

### Component Files (Phase 1)
1. `src/components/MenuScreen.tsx`
2. `src/components/GameScreen.tsx`
3. `src/components/Board.tsx`
4. `src/components/Cell.tsx`
5. `src/components/GameOverOverlay.tsx`
6. `src/components/RulesScreen.tsx`
6. `src/components/DevMenu.tsx`
7. `src/components/StatusBar.tsx`

### Test Files (Phase 2)
1. `e2e/fixtures/game-helpers.ts`
2. `e2e/board-interactions.spec.ts`
3. `e2e/local-pvp.spec.ts`
4. `e2e/ai-game.spec.ts`
5. `e2e/win-conditions.spec.ts`
6. `e2e/rules-screen.spec.ts`
7. `e2e/menu-navigation.spec.ts`
8. `e2e/dev-menu.spec.ts`
9. `e2e/responsive.spec.ts`
10. `e2e/smoke.spec.ts`
11. `e2e/visual-regression.spec.ts`

---

## Notes

- **Cell locators:** Keep `data-testid` for cells as agreed. They are internal game pieces with no human-visible text.
- **Dev menu backdrop:** Keep `data-testid="dev-backdrop"` as it's a functional overlay with no visible text.
- **Dynamic text:** For buttons with dynamic labels (Play Again, Rematch), use `getByRole('button', { name: /play again|rematch/i })` with regex.
- **Status text:** Use `getByRole('status')` with `name` filter for tile counters and turn indicator.
- **Coordinate labels:** When `showCoordinates` is true, board shows A-K / 11-1 labels - these can be targeted with `getByText` if needed.