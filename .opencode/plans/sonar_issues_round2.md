# Plan: SonarQube round 2 — fix remaining/new issues

Follow-up to `.opencode/plans/sonar_issues_cleanup.md`. The 08:25 scan proved:
- S6819 fixed, S2245 marked false-positive by user (no action needed).
- S3776 persists: the earlier refactor *moved* complexity into `collectEdgeTokens` (still exactly 18) instead of reducing it.
- Our DevMenu fix introduced two new issues: S6848 + S1082 (clickable div with no keyboard support).

## Fix 1 — `src/game/ai_v2.ts`: flatten `collectEdgeTokens` (~line 686)

Replace the two-branch nested-loop body with a single loop covering both edges. Behavior identical.

```ts
function collectEdgeTokens(board: Board, player: Player): Set<string> {
  const tokens = new Set<string>()
  const edge = BOARD_SIZE - 1
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (player === 'red') {
      if (board[0][i] === player) tokens.add(`0,${i}`)
      if (board[edge][i] === player) tokens.add(`${edge},${i}`)
    } else {
      if (board[i][0] === player) tokens.add(`${i},0`)
      if (board[i][edge] === player) tokens.add(`${i},${edge}`)
    }
  }
  return tokens
}
```

Cognitive complexity ≈ 11 (< 15). `openingMoves` and its callers stay unchanged.

## Fix 2 — `src/components/DevMenu.tsx`: native `<button>` backdrop (~line 45)

Replace the backdrop div with a full-screen native button (satisfies S6848, S1082, S6819 at once):

```tsx
<button
  type="button"
  aria-label="Close developer menu"
  className="absolute inset-0 bg-black/60"
  onClick={onClose}
/>
```

Tailwind preflight resets default button styling; no extra reset needed.

## Verification

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `npm run test:ai`
5. Re-run `./sonar-scan.sh` (requires SONAR_TOKEN + local SonarQube on :9000) — expect empty `sonar_issues.json`.

## Files touched

- `src/game/ai_v2.ts`
- `src/components/DevMenu.tsx`
