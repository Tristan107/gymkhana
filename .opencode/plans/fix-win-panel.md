# Fix Win Panel

## Problem
Game over overlay (`GameOverOverlay.tsx`) renders as an absolute-positioned dialog covering the entire board, hiding the final game state. It also has a close button and action buttons the user doesn't want.

## Solution
Replace the overlay with a simple panel in the right sidebar, below the "tiles left" section. No close button, no action buttons — just the win message.

## Layout Change

**Before (overlay covers board):**
```
┌─────────────────────────────────────┐
│ Header                              │
├──────────────────────┬──────────────┤
│ StatusBar            │ Menu         │
│ ┌────────────────┐   │ How to Play  │
│ │    BOARD       │   │ Play Again   │
│ │  [OVERLAY]     │   │ Undo         │
│ └────────────────┘   │ Rematch      │
│                      ├──────────────┤
│                      │ 🔴 Red: 12   │
│                      │ ⚪ White: 15  │
└──────────────────────┴──────────────┘
```

**After (panel in sidebar):**
```
┌─────────────────────────────────────┐
│ Header                              │
├──────────────────────┬──────────────┤
│ StatusBar            │ Menu         │
│ ┌────────────────┐   │ How to Play  │
│ │    BOARD       │   │ Play Again   │
│ │  (visible)     │   │ Undo         │
│ └────────────────┘   │ Rematch      │
│                      ├──────────────┤
│                      │ 🔴 Red: 12   │
│                      │ ⚪ White: 15  │
│                      ├──────────────┤
│                      │ ┌──────────┐ │
│                      │ │ RED WINS │ │  ← GameOverPanel
│                      │ └──────────┘ │
└──────────────────────┴──────────────┘
```

## Files to Change

1. **Create** `src/components/GameOverPanel.tsx`
   - Simple div (not dialog) with win message only
   - No close button, no action buttons
   - Styled to match sidebar: `bg-white/5 border border-white/10 rounded-md p-3`
   - Winner accent: Red `#ff9999`, White `#fff`, Draw `#ccc`
   - Full width of sidebar

2. **Modify** `src/components/GameScreen.tsx`
   - Remove `<GameOverOverlay>` from board container (lines 75-84)
   - Import and add `<GameOverPanel>` in right sidebar, after tiles-left section (line 142)
   - Pass `gameOver`, `alertMessage`, `winner`

3. **Delete** `src/components/GameOverOverlay.tsx`
   - Only used by GameScreen, no longer needed

## Styling for GameOverPanel
```
panel: bg-white/5 border border-white/10 rounded-md p-3 text-center w-full
text:  text-xl font-bold tracking-wide uppercase
colors: red=#ff9999, white=#fff, draw=#ccc
font:  [font-family:Arial,sans-serif]
```

## Verification
- Run `npm run lint`
- Run `npm run build`
- Visual check: board visible after game over, panel appears in sidebar
