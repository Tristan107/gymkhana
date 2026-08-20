import { BOARD_SIZE, OPPONENT } from '../constants'
import type { Board, Orientation, Player } from '../types'

const ORTHOGONAL_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

interface Cell {
  row: number
  col: number
}

function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => {
      if ((row + col) % 2 === 0) return null
      return row % 2 === 0 ? 'red' : 'white'
    })
  )
}

export function isFixedPeg(row: number, col: number): boolean {
  return (row + col) % 2 !== 0
}

export function getTileOrientation(
  board: Board,
  row: number,
  col: number,
  targetColor?: Player
): Orientation {
  const color = targetColor ?? board[row][col]
  if (row - 1 >= 0 && board[row - 1][col] === color) return 'vertical'
  if (col - 1 >= 0 && board[row][col - 1] === color) return 'horizontal'
  if (row + 1 < BOARD_SIZE && board[row + 1][col] === color) return 'vertical'
  if (col + 1 < BOARD_SIZE && board[row][col + 1] === color) return 'horizontal'
  return color === 'red' ? 'vertical' : 'horizontal'
}

export function isCellPlayable(
  board: Board,
  row: number,
  col: number,
  player: Player,
  gameOver: boolean
): boolean {
  if (gameOver || board[row][col] !== null) return false
  if (player === 'red') return col !== 0 && col !== BOARD_SIZE - 1
  return row !== 0 && row !== BOARD_SIZE - 1
}

function reachableFrom(
  _board: Board,
  isStart: (row: number, col: number) => boolean,
  isPassable: (row: number, col: number) => boolean
): boolean[][] {
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Cell[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isStart(row, col)) {
        visited[row][col] = true
        queue.push({ row, col })
      }
    }
  }

  let head = 0
  while (head < queue.length) {
    const { row, col } = queue[head]
    head++
    for (const [dr, dc] of ORTHOGONAL_DIRECTIONS) {
      const nr = row + dr
      const nc = col + dc
      if (isInsideBoard(nr, nc) && !visited[nr][nc] && isPassable(nr, nc)) {
        visited[nr][nc] = true
        queue.push({ row: nr, col: nc })
      }
    }
  }

  return visited
}

export function checkConnectionWin(board: Board, player: Player): boolean {
  const crossesRows = player === 'red'
  const onEdge = (r: number, c: number, edge: number) =>
    crossesRows ? r === edge : c === edge
  const startEdge = 0
  const endEdge = BOARD_SIZE - 1

  const visited = reachableFrom(
    board,
    (r, c) => board[r][c] === player && onEdge(r, c, startEdge),
    (r, c) => board[r][c] === player
  )

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (crossesRows ? visited[endEdge][i] : visited[i][endEdge]) return true
  }
  return false
}

export function checkSurroundWin(board: Board, player: Player): boolean {
  const opponent = OPPONENT[player]
  const isBorder = (r: number, c: number) =>
    r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1

  const escapable = reachableFrom(
    board,
    (r, c) => isBorder(r, c) && board[r][c] !== player,
    (r, c) => board[r][c] !== player
  )

  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === opponent && !escapable[r][c]) return true
    }
  }
  return false
}