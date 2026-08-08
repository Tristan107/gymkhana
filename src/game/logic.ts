import { BOARD_SIZE, OPPONENT } from '../constants'
import type { Board, Orientation, Player } from '../types'

export function createBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )

  for (let row = 1; row < BOARD_SIZE; row += 2) {
    for (let col = 0; col < BOARD_SIZE; col += 2) {
      board[row][col] = 'white'
    }
  }

  for (let row = 0; row < BOARD_SIZE; row += 2) {
    for (let col = 1; col < BOARD_SIZE; col += 2) {
      board[row][col] = 'red'
    }
  }

  return board
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

export function checkConnectionWin(board: Board, player: Player): boolean {
  if (player === 'red') {
    return hasPath(board, 'red', 0, BOARD_SIZE - 1, false)
  }
  return hasPath(board, 'white', 0, BOARD_SIZE - 1, true)
}

function hasPath(
  board: Board,
  color: Player,
  start: number,
  end: number,
  isHorizontal: boolean
): boolean {
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Array<{ row: number; col: number }> = []

  if (!isHorizontal) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[start][col] === color) {
        queue.push({ row: start, col })
        visited[start][col] = true
      }
    }
  } else {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][start] === color) {
        queue.push({ row, col: start })
        visited[row][start] = true
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    const { row: r, col: c } = current

    if (!isHorizontal && r === end) return true
    if (isHorizontal && c === end) return true

    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr
      const nc = c + dc
      if (
        nr >= 0 &&
        nr < BOARD_SIZE &&
        nc >= 0 &&
        nc < BOARD_SIZE &&
        !visited[nr][nc] &&
        board[nr][nc] === color
      ) {
        visited[nr][nc] = true
        queue.push({ row: nr, col: nc })
      }
    }
  }
  return false
}

export function checkSurroundWin(board: Board, player: Player): boolean {
  const opponent = OPPONENT[player]
  const escapable = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Array<{ r: number; c: number }> = []

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[0][i] !== player) {
      escapable[0][i] = true
      queue.push({ r: 0, c: i })
    }
    if (board[BOARD_SIZE - 1][i] !== player) {
      escapable[BOARD_SIZE - 1][i] = true
      queue.push({ r: BOARD_SIZE - 1, c: i })
    }
    if (board[i][0] !== player) {
      escapable[i][0] = true
      queue.push({ r: i, c: 0 })
    }
    if (board[i][BOARD_SIZE - 1] !== player) {
      escapable[i][BOARD_SIZE - 1] = true
      queue.push({ r: i, c: BOARD_SIZE - 1 })
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    const { r, c } = current
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (!escapable[nr][nc] && board[nr][nc] !== player) {
          escapable[nr][nc] = true
          queue.push({ r: nr, c: nc })
        }
      }
    }
  }

  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === opponent && !escapable[r][c]) {
        return true
      }
    }
  }
  return false
}
