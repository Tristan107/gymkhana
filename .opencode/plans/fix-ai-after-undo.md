# Fix AI Not Playing After Undo in AI Mode

## Problem
After using the UNDO button in a game vs AI:
1. UNDO removes the last AI move and the human's previous move
2. Human makes a new move
3. **AI doesn't play** - game is frozen

## Root Cause
In `src/App.tsx`, the `useEffect` (lines 42-63) that triggers AI moves has a **stale closure** issue:

```typescript
useEffect(() => {
  if (!isAiTurn || state.humanPlayer === null) return
  const aiPlayer = OPPONENT[state.humanPlayer]
  const timeout = setTimeout(() => {
    const move = chooseMove(
      state.board,        // ← Captured at render time
      aiPlayer,
      state.tilesPlaced,  // ← Captured at render time
      state.gameOver
    )
    if (move) dispatch({ type: 'PLACE', row: move.row, col: move.col })
  }, 400)
  return () => clearTimeout(timeout)
}, [
  isAiTurn,
  state.board,        // ← New object every render (toPublicState creates new)
  state.currentPlayer,
  state.gameMode,
  state.gameOver,
  state.humanPlayer,
  state.tilesPlaced,  // ← New object every render
])
```

**Why it fails after UNDO:**
1. `toPublicState()` creates **new objects** for `board` and `tilesPlaced` on every state change
2. The dependency array includes these objects → effect re-runs on **every** state change
3. When human moves after UNDO:
   - State updates → `currentPlayer` becomes AI
   - Effect runs, sets 400ms timeout with **current** state
   - But React may re-render again before timeout fires (due to other state changes)
   - Effect re-runs → cleanup clears the pending timeout
   - New timeout set with potentially stale state
   - AI move never dispatches

## Solution
Use a **ref** to store the latest game state, so the `setTimeout` callback always accesses current values without depending on object references in the dependency array.

## Implementation Plan

### 1. Add a ref for latest state in App.tsx
```typescript
const stateRef = useRef(state)
stateRef.current = state
```

### 2. Simplify useEffect dependencies
Only depend on `isAiTurn` and `state.humanPlayer` (for `aiPlayer` calculation):
```typescript
useEffect(() => {
  if (!isAiTurn || state.humanPlayer === null) return
  
  const aiPlayer = OPPONENT[state.humanPlayer]
  const timeout = setTimeout(() => {
    // Use ref to get LATEST state
    const currentState = stateRef.current
    const move = chooseMove(
      currentState.board,
      aiPlayer,
      currentState.tilesPlaced,
      currentState.gameOver
    )
    if (move) dispatch({ type: 'PLACE', row: move.row, col: move.col })
  }, 400)
  return () => clearTimeout(timeout)
}, [isAiTurn, state.humanPlayer])  // ← Simplified
```

### 3. Add test for AI behavior after UNDO
Create a test in `src/game/tests/reducer.test.ts` (or integration test) that:
- Sets up AI game
- Makes human move, AI move, human move
- Calls UNDO
- Makes new human move
- Verifies AI responds (or at least that state allows AI turn)

## Files to Modify
1. **`src/App.tsx`** - Fix the useEffect with ref pattern
2. **`src/game/tests/reducer.test.ts`** - Add regression test (optional but recommended)

## Testing
- Run existing tests: `npm test` (should still pass)
- Manual test: Play AI game, make moves, click UNDO, make new move, verify AI responds
- Consider adding `npm run test:ai` if AI-specific tests needed

## Risk Assessment
- **Low risk**: Only changes the AI trigger mechanism, not game logic
- **Ref pattern** is standard React practice for avoiding stale closures in callbacks
- Existing reducer tests cover UNDO logic thoroughly