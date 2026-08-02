import { BOARD_SIZE, OPPONENT } from '../constants'
import type { Board, CellValue, Player } from '../types'
import {
  checkConnectionWin,
  checkSurroundWin,
  isCellPlayable,
} from './logic'

interface Move {
  row: number
  col: number
}

type Role = 'forcing' | 'defensive'

function getValidMoves(board: Board, player: Player, gameOver: boolean): Move[] {
  const moves: Move[] = []
  for (let row = 1; row < BOARD_SIZE - 1; row++) {
    for (let col = 1; col < BOARD_SIZE - 1; col++) {
      if (board[row][col] === null && isCellPlayable(board, row, col, player, gameOver)) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

function place(board: Board, move: Move, player: Player): Board {
  const next: CellValue[][] = board.map((row) => [...row])
  next[move.row][move.col] = player
  return next
}

function hasImmediateWin(board: Board, color: Player): boolean {
  for (const move of getValidMoves(board, color, false)) {
    const next = place(board, move, color)
    if (checkConnectionWin(next, color) || checkSurroundWin(next, color)) {
      return true
    }
  }
  return false
}

function winningMove(board: Board, color: Player): Move | null {
  for (const move of getValidMoves(board, color, false)) {
    const next = place(board, move, color)
    if (checkConnectionWin(next, color) || checkSurroundWin(next, color)) {
      return move
    }
  }
  return null
}

interface Component {
  cells: Move[]
}

function getComponents(board: Board, color: Player): Component[] {
  const visited = new Set<string>()
  const components: Component[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== color || visited.has(`${row},${col}`)) continue
      const cells: Move[] = []
      const queue: Move[] = [{ row, col }]
      visited.add(`${row},${col}`)
      while (queue.length > 0) {
        const cur = queue.shift() as Move
        cells.push(cur)
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          if (
            nr >= 0 &&
            nr < BOARD_SIZE &&
            nc >= 0 &&
            nc < BOARD_SIZE &&
            board[nr][nc] === color &&
            !visited.has(`${nr},${nc}`)
          ) {
            visited.add(`${nr},${nc}`)
            queue.push({ row: nr, col: nc })
          }
        }
      }
      components.push({ cells })
    }
  }
  return components
}

function evaluateMove(
  board: Board,
  move: Move,
  player: Player,
  role: Role
): number {
  const next = place(board, move, player)
  const myState = getComponents(next, player)
  const oppState = getComponents(next, OPPONENT[player])

  let largest = 0
  for (const comp of myState) largest = Math.max(largest, comp.cells.length)

  let advance = 0
  let onlineScore = 0
  for (const comp of myState) {
    let max = -Infinity
    let touchesStart = false
    if (player === 'red') {
      // red connects top (row 0) to bottom (row BOARD-1)
      for (const c of comp.cells) {
        max = Math.max(max, c.row)
        if (c.row === 0) touchesStart = true
      }
      if (touchesStart) advance = Math.max(advance, max + 1)
    } else {
      // white connects left (col 0) to right
      for (const c of comp.cells) {
        max = Math.max(max, c.col)
        if (c.col === 0) touchesStart = true
      }
      if (touchesStart) advance = Math.max(advance, max + 1)
    }
  }
  onlineScore = advance

  // opponent "online" toward their own win (book their progress)
  let oppAdvance = 0
  for (const comp of oppState) {
    if (OPPONENT[player] === 'red') {
      let touches = false
      let max = -Infinity
      for (const c of comp.cells) {
        if (c.row === 0) touches = true
        max = Math.max(max, c.row)
      }
      if (touches) oppAdvance = Math.max(oppAdvance, max + 1)
    } else {
      let touches = false
      let max = -Infinity
      for (const c of comp.cells) {
        if (c.col === 0) touches = true
        max = Math.max(max, c.col)
      }
      if (touches) oppAdvance = Math.max(oppAdvance, max + 1)
    }
  }

  // flexibility: number of separate groups we maintain (threat-of-two)
  const flexibility = myState.length

  if (role === 'forcing') {
    // Red presses its own path hard
    return 3 * onlineScore + 2 * largest + 1 * flexibility - 1 * oppAdvance
  }
  // defensive: prioritize containing opponent's advance
  return 2 * largest + 1 * onlineScore + 1 * flexibility + 3 * -oppAdvance
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const RED_OPENING_BOOK: Move[] = [
  { row: 4, col: 5 },
  { row: 5, col: 5 },
  { row: 6, col: 5 },
  { row: 4, col: 4 },
  { row: 5, col: 3 },
  { row: 5, col: 7 },
]

export function chooseMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null {
  const role: Role = player === 'red' ? 'forcing' : 'defensive'
  const moves = getValidMoves(board, player, gameOver)
  if (moves.length === 0) return null

  // 1. Immediate win
  const win = winningMove(board, player)
  if (win) return win

  // 2. Forced block: opponent can win now?
  if (hasImmediateWin(board, OPPONENT[player])) {
    // find our move that neutralizes the threat (removes opponent win)
    for (const move of moves) {
      const next = place(board, move, player)
      if (!hasImmediateWin(next, OPPONENT[player])) {
        return move
      }
    }
  }

  // 3. Opening book for red's first move
  if (player === 'red' && tilesPlaced.red === 0) {
    const validOpenings = RED_OPENING_BOOK.filter(
      (m) => board[m.row][m.col] === null && isCellPlayable(board, m.row, m.col, player, gameOver)
    )
    if (validOpenings.length > 0) return pickBest(validOpenings, board, player, role)
  }

  // 4. Greedy heuristic
  return pickBest(moves, board, player, role)
}

function pickBest(
  moves: Move[],
  board: Board,
  player: Player,
  role: Role
): Move {
  let bestScore = -Infinity
  let bestMoves: Move[] = []
  for (const move of moves) {
    const score = evaluateMove(board, move, player, role)
    if (score > bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }
  return pickRandom(bestMoves)
}