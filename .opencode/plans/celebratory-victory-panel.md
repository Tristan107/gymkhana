# Celebratory Victory Panel — Design Plan

## Goal
Replace the plain win panel with something distinctive and celebratory that feels native to Gymkhana's visual language.

## Current Panel (baseline)
```tsx
<div className="w-full rounded-md border border-white/10 bg-white/5 p-3 text-center">
  <div className="text-xl font-bold tracking-wide uppercase [font-family:Arial,sans-serif] text-[accent]">
    {message}
  </div>
</div>
```

---

## New Design

### Visual Structure
```
┌─────────────────────────────────────┐
│ █ RED WINS                          │  ← token square + message
│ ████████████████████████████        │  ← animated underline (draws L→R)
└─────────────────────────────────────┘
```

### Token Indicator
- **Shape**: 12×12px square, `rounded-[2px]` — matches board tokens exactly
- **Placement**: Inline, left of message, 8px gap
- **Color**: Winner's token color (`#ff3344` red, `#fff` white, `#888` draw)
- **Glow**: Subtle inner glow matching token (`box-shadow: inset 0 0 4px currentColor`)

### Animated Underline
- **Height**: 3px
- **Color**: Same as token
- **Animation**: Draws from left to right over **500ms, ease-out**
- **Delay**: Starts **100ms after panel mount** (lets token/message settle first)
- **Reduced motion**: Instantly full-width, no animation

### Panel Styling
```css
/* Base */
w-full rounded-md border border-white/10 bg-white/5 p-4 text-left relative overflow-hidden

/* Winner-tinted left border (3px) — the "signature" */
border-l-[3px] border-[accent]

/* Subtle radial glow behind panel (winner color, very low opacity) */
bg-[radial-gradient(ellipse_at_left_center,theme(colors.accent)/5,transparent_70%)]

/* Entrance: slide up + fade (200ms, ease-out) */
animate-slide-up-fade
```

### Entrance Animation (panel mount)
```css
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up-fade { animation: slide-up-fade 200ms ease-out forwards; }
```

### Message Typography
- `text-xl font-bold tracking-wide uppercase [font-family:Arial,sans-serif]`
- Color = accent (token color)
- Letter-spacing slightly tighter than default (`tracking-wide` is good)

---

## Color Tokens

| Winner | Token/Accent | Left Border | Glow Radial |
|--------|--------------|-------------|-------------|
| Red    | `#ff3344`    | `#ff3344`   | `rgba(255,51,68,0.08)` |
| White  | `#ffffff`    | `#ffffff`   | `rgba(255,255,255,0.06)` |
| Draw   | `#888888`    | `#888888`   | `rgba(136,136,136,0.06)` |

---

## Respects `prefers-reduced-motion`
- No slide-up-fade on panel
- No underline draw animation (instant full width)
- Token + message appear immediately

---

## Files to Change

1. **`src/components/GameOverPanel.tsx`** — new markup, inline styles for dynamic colors
2. **`src/index.css`** — keyframe animations + utility classes

---

## ASCII Wireframe (Desktop ≥901px)

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
├──────────────────────────────────┬──────────────────────────┤
│ StatusBar                        │ Menu                     │
│ ┌────────────────────────────┐   │ How to Play              │
│ │         BOARD              │   │ Play Again               │
│ │     (fully visible)        │   │ Undo                     │
│ └────────────────────────────┘   │ Rematch                  │
│                                  ├──────────────────────────┤
│                                  │ 🔴 Red tiles left: 12    │
│                                  │ ⚪ White tiles left: 15  │
│                                  ├──────────────────────────┤
│                                  │ ┌─────────────────────┐  │
│                                  │ │ █ RED WINS          │  │  ← panel
│                                  │ │ ████████████████████│  │
│                                  │ └─────────────────────┘  │
└──────────────────────────────────┴──────────────────────────┘
```

---

## Implementation Notes

- All dynamic colors via inline `style={{}}` (only 3 values, no CSS vars needed)
- No new dependencies
- Animation CSS in `index.css` keeps component clean
- `data-testid="game-over-panel"` preserved for tests
- Panel only mounts when `gameOver && message` (existing logic)

---

## Risk / Edge Cases

| Case | Handling |
|------|----------|
| Very long message | `text-wrap: balance` or `whitespace-nowrap overflow-hidden text-ellipsis` — but messages are short ("RED WINS", "WHITE WINS", "DRAW") |
| Mobile (<901px) | Sidebar stacks below board; panel still full-width in column — works |
| Rapid remount | Animations use `forwards` fill; keyframes are idempotent |
| SSR | No SSR in this project (Vite SPA) |

---

## Acceptance Criteria

- [ ] Token square renders inline, matches board token style
- [ ] Underline draws L→R in winner color over 500ms
- [ ] Panel has 3px left border in winner color
- [ ] Subtle radial glow behind panel (winner tint)
- [ ] Panel slides up + fades in on mount (200ms)
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Lint, build, tests pass
- [ ] No visual regression on mobile layout