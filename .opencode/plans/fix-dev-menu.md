# Fix Dev Menu Issues

## Problems to Fix

1. **Dev menu appears really small** - `w-fit` on fixed-positioned flex container causes width collapse
2. **Dev menu behind non-fixed tokens** - Tiles have `z-index: 2`, dialog has no explicit z-index
3. **Buttons not evenly spaced vertically** - Conditional elements break consistent rhythm; user wants buttons distributed evenly in available space

## Root Cause Analysis

**File: `src/components/DevMenu.tsx`**
- Line 61: `className="fixed inset-0 m-auto max-w-[320px] w-fit flex-col gap-4 ..."`
  - `w-fit` doesn't work reliably on `fixed` + `flex-col` elements
  - No explicit `z-index` - tokens in Board.css (line 99) use `z-index: 2`
- Lines 66-122: Button container uses `flex flex-col gap-3` but conditional rendering (`{copied && ...}`, `{importOpen && ...}`, `{error !== null && ...}`) creates inconsistent spacing

**File: `src/components/Board.css`**
- Line 99: `.tile { z-index: 2; }` - tokens sit above default stacking context

## Solution

### 1. Fix Width & Z-Index (DevMenu.tsx line 61)
Replace problematic classes:
```tsx
// Before
className="fixed inset-0 m-auto max-w-[320px] w-fit flex-col gap-4 rounded-lg border border-white/20 bg-[#151515] p-6 shadow-xl [font-family:Arial,sans-serif] backdrop:bg-black/60"

// After
className="fixed inset-0 m-auto w-[320px] max-w-[90vw] flex flex-col gap-4 rounded-lg border border-white/20 bg-[#151515] p-6 shadow-xl z-[100] [font-family:Arial,sans-serif] backdrop:bg-black/60"
```
- Change `w-fit` → `w-[320px]` for explicit width
- Add `max-w-[90vw]` for mobile responsiveness
- Add `z-[100]` to sit above tokens (z-index: 2)
- Add explicit `flex` (Tailwind 4 requires it for flex-col)

### 2. Distribute Buttons Evenly Vertically (DevMenu.tsx lines 66-135)
Restructure to use flexbox distribution:
```tsx
// Wrap all button-like elements in a single flex container that fills available space
<div className="flex flex-col flex-1 justify-between gap-4">
  <div className="flex flex-col gap-3">
    {/* Top group: checkbox + export + import toggle */}
    <label>...</label>
    <button>Export board</button>
    <button>Import board</button>
  </div>
  
  <div className="flex flex-col gap-3">
    {/* Middle group: conditional import form (when open) */}
    {importOpen && (
      <>
        <textarea>...</textarea>
        <button>Load board</button>
      </>
    )}
    {/* Error message (when present) */}
    {error !== null && <p>...</p>}
    {/* Copied confirmation (when present) */}
    {copied && <p>...</p>}
  </div>
  
  <div className="flex flex-col gap-3">
    {/* Bottom group: close button */}
    <button>Close</button>
  </div>
</div>
```

**Alternative simpler approach** - Make the main dialog content area `flex-1` with `justify-between`:
```tsx
<dialog className="... flex flex-col gap-4 ...">
  <h2>...</h2>
  <div className="flex flex-col flex-1 justify-between gap-4">
    <div className="flex flex-col gap-3">
      <label>...</label>
      <button>Export board</button>
      <button>Import board</button>
    </div>
    <div className="flex flex-col gap-3">
      {importOpen && (<>...</>)}
      {error && <p>...</p>}
      {copied && <p>...</p>}
    </div>
    <div className="flex flex-col gap-3">
      <button>Close</button>
    </div>
  </div>
</dialog>
```

This distributes the three groups (top controls, middle conditional, bottom close) evenly in the available vertical space.

## Files to Modify

1. **`src/components/DevMenu.tsx`** - Primary fix for all three issues
   - Line 61: Fix dialog width and add z-index
   - Lines 66-135: Restructure button layout for even vertical distribution

## Testing

Run existing e2e tests to verify no regressions:
```bash
npm run test -- e2e/dev-menu.spec.ts
```

Or run all tests:
```bash
npm run test:all
```

## Visual Verification Checklist

- [ ] Dev menu opens at proper width (~320px, responsive on mobile)
- [ ] Dev menu appears above board tokens (not behind them)
- [ ] Buttons/controls distributed evenly from top to bottom of dialog
- [ ] Conditional elements (import form, error, copied message) don't break spacing
- [ ] All existing functionality works (export, import, toggle coordinates, close)