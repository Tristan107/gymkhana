# Refactor Plan: Good_connections_v7.html → Modular React App

Refactor `Good_connections_v7.html` into standard modular files inside `src/`,
overwriting/deleting the default Vite starter files. Stack: React, strict
TypeScript, native CSS for the complex board layout, Tailwind for basic layout.
Preserve the original game behavior byte-for-byte (including quirks such as the
draw rendering a white-themed alert and the 448px status bar width).

## 1. Obfuscation (build only, balanced)

- `npm install -D vite-plugin-javascript-obfuscator`
- Update `vite.config.ts`:

  ```ts
  import obfuscator from 'vite-plugin-javascript-obfuscator'
  export default defineConfig({
    plugins: [react(), obfuscator({
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        identifierNamesGenerator: 'hexadecimal',
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        selfDefending: false,
        debugProtection: false,
        deadCodeInjection: false,
      },
    })],
    build: { sourcemap: false },
  })
  ```

- The default `include` regex (`/.jsx?|tsx?|cjs|mjs$/`) covers all emitted
  chunks, so React components, game logic, and reducer are all obfuscated.
  `sourcemap: false` prevents readable source in devtools / HTML source.

## 2. Install Tailwind v4

- `npm install tailwindcss @tailwindcss/vite`
- Add the `tailwindcss()` plugin to `vite.config.ts`
- Replace `src/index.css` with `@import "tailwindcss";` plus global body
  styling (radial-gradient background, Arial Black font)

## 3. Config

- `tsconfig.app.json`: add `"strict": true`
- `index.html`: update title to "Connections Game (1991)"

## 4. Game core (pure logic, no DOM)

- `src/types.ts` — `Player = 'red' | 'white'`, `CellValue`, `Board`, etc.
- `src/constants.ts` — `BOARD_SIZE = 11`, `MAX_TILES = 21`, `OPPONENT`
- `src/game/logic.ts` — `initBoard`, `getTileOrientation`, `isValidConnection`,
  `isForbiddenEdgePlacement`, `isCellPlayable`, `checkConnectionWin`,
  `hasPath`, `checkSurroundWin`, `isBoardFull`
- `src/game/reducer.ts` — `GameState` (`board`, `currentPlayer`, `gameOver`,
  `winner`, `tilesPlaced`, `alertMessage`), `gameReducer` handling
  `PLACE {row,col}` (win/draw detection) and `RESET`, `initialState`

## 5. Components (React, Tailwind for layout)

- `src/components/Header.tsx` — "Connections" title with alternating red/white
  letters + Restart button (dispatches `RESET`)
- `src/components/StatusBar.tsx` — Red Left / Turn / White Left (tile counts)
- `src/components/Alert.tsx` — win/draw message (faithful quirk: draw renders
  white-themed)
- `src/components/Board.tsx` — 11×11 CSS grid, holds `hovered` state,
  `onMouseEnter/Leave` previews
- `src/components/Cell.tsx` — renders anchor `.square`, placed `.tile`/
  `.tile-rect`, or playable cell with hover preview
- `src/components/RulesPanel.tsx` — static objectives/definitions/how-to-play
- `src/App.tsx` — `useReducer` state, composes all components; responsive
  layout via Tailwind

## 6. CSS

- `src/components/Board.css` — ALL native CSS for the board (grid vars
  `--cell/--x/--ext/--tile-size/--cut`, `.cell`, `.square`, `.tile`, octagon
  `clip-path`, `.tile-rect`, `.preview`) — faithful port of HTML lines 97–176
- Tailwind handles top bar, columns, status bar, alert, rules panel, buttons

## 7. Cleanup

- Delete `src/App.css`, `src/assets/*` (hero.png, react.svg, vite.svg)

## 8. Verify

- `npm run build` (strict tsc + vite)
- `npm run lint` (oxlint)
- `npm run dev` smoke test
- Confirm `dist/` contains no `.map` files and the bundle is obfuscated
