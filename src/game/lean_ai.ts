import { BOARD_SIZE, OPPONENT } from '../constants'
import type { Board, CellValue, Player } from '../types'
import {
  checkConnectionWin,
  checkSurroundWin,
  isCellPlayable,
} from './logic'

export interface Move {
  row: number
  col: number
}

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

function getValidMoves(board: Board, player: Player, gameOver: boolean): Move[] {
  const moves: Move[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
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

function hasWin(board: Board, player: Player): boolean {
  return checkConnectionWin(board, player) || checkSurroundWin(board, player)
}

function winningMoves(board: Board, player: Player): Move[] {
  const result: Move[] = []
  for (const move of getValidMoves(board, player, false)) {
    if (hasWin(place(board, move, player), player)) result.push(move)
  }
  return result
}

function findForkMove(board: Board, player: Player): Move | null {
  for (const move of getValidMoves(board, player, false)) {
    if (winningMoves(place(board, move, player), player).length >= 2) return move
  }
  return null
}

function hasFork(board: Board, player: Player): boolean {
  return findForkMove(board, player) !== null
}

function findBlockingMove(board: Board, player: Player): Move | null {
  const opponent = OPPONENT[player]
  for (const move of getValidMoves(board, player, false)) {
    if (winningMoves(place(board, move, player), opponent).length === 0) return move
  }
  return null
}

function getComponents(board: Board, color: Player): Move[][] {
  const visited = new Set<string>()
  const components: Move[][] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== color || visited.has(`${row},${col}`)) continue
      const cells: Move[] = []
      const queue: Move[] = [{ row, col }]
      visited.add(`${row},${col}`)
      while (queue.length > 0) {
        const current = queue.shift() as Move
        cells.push(current)
        for (const [dr, dc] of DIRS) {
          const nr = current.row + dr
          const nc = current.col + dc
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
      components.push(cells)
    }
  }
  return components
}

function isCorner(row: number, col: number): boolean {
  return (
    (row === 0 || row === BOARD_SIZE - 1) &&
    (col === 0 || col === BOARD_SIZE - 1)
  )
}

function componentLiberties(board: Board, component: Move[], color: Player): Move[] {
  const seen = new Set<string>()
  const liberties: Move[] = []
  for (const cell of component) {
    for (const [dr, dc] of DIRS) {
      const nr = cell.row + dr
      const nc = cell.col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] !== null) continue
      if (!isCellPlayable(board, nr, nc, color, false)) continue
      const key = `${nr},${nc}`
      if (seen.has(key)) continue
      seen.add(key)
      liberties.push({ row: nr, col: nc })
    }
  }
  return liberties
}

function findLibertyDefense(board: Board, player: Player, moves: Move[]): Move | null {
  for (const component of getComponents(board, player)) {
    const liberties = componentLiberties(board, component, player)
    if (liberties.length !== 1) continue
    const liberty = liberties[0]
    if (moves.some((move) => move.row === liberty.row && move.col === liberty.col)) {
      return liberty
    }
  }
  return null
}

function boxInTilesNeeded(board: Board, color: Player): number {
  const opponent = OPPONENT[color]
  let minimum = Infinity
  for (const component of getComponents(board, opponent)) {
    const seen = new Set<string>()
    let liberties = 0
    for (const cell of component) {
      for (const [dr, dc] of DIRS) {
        const nr = cell.row + dr
        const nc = cell.col + dc
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
        if (board[nr][nc] !== null || isCorner(nr, nc)) continue
        const key = `${nr},${nc}`
        if (seen.has(key)) continue
        seen.add(key)
        liberties++
      }
    }
    minimum = Math.min(minimum, liberties)
  }
  return minimum
}

function tilesToConnect(board: Board, color: Player): number {
  const horizontal = color === 'white'
  const dist: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => Infinity)
  )
  const deque: number[] = []

  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = horizontal ? i : 0
    const col = horizontal ? 0 : i
    const cell = board[row][col]
    if (cell === OPPONENT[color]) continue
    if (isCorner(row, col) && cell === null) continue
    const weight = cell === color ? 0 : 1
    dist[row][col] = weight
    if (weight === 0) deque.unshift(row * BOARD_SIZE + col)
    else deque.push(row * BOARD_SIZE + col)
  }

  while (deque.length > 0) {
    const index = deque.shift() as number
    const row = Math.floor(index / BOARD_SIZE)
    const col = index % BOARD_SIZE
    for (const [dr, dc] of DIRS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] === OPPONENT[color]) continue
      if (board[nr][nc] === null && isCorner(nr, nc)) continue
      const weight = board[nr][nc] === color ? 0 : 1
      if (dist[row][col] + weight < dist[nr][nc]) {
        dist[nr][nc] = dist[row][col] + weight
        if (weight === 0) deque.unshift(nr * BOARD_SIZE + nc)
        else deque.push(nr * BOARD_SIZE + nc)
      }
    }
  }

  let minimum = Infinity
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = horizontal ? i : BOARD_SIZE - 1
    const col = horizontal ? BOARD_SIZE - 1 : i
    minimum = Math.min(minimum, dist[row][col])
  }
  return minimum
}

function pickBestStrategic(board: Board, moves: Move[], player: Player): Move {
  const center = Math.floor(BOARD_SIZE / 2)
  let bestScore = Infinity
  let bestMoves: Move[] = []
  for (const move of moves) {
    const next = place(board, move, player)
    const score = Math.min(tilesToConnect(next, player), boxInTilesNeeded(next, player))
    if (score < bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }
  let bestCenter = Infinity
  let centered: Move[] = []
  for (const move of bestMoves) {
    const distance = (move.row - center) ** 2 + (move.col - center) ** 2
    if (distance < bestCenter) {
      bestCenter = distance
      centered = [move]
    } else if (distance === bestCenter) {
      centered.push(move)
    }
  }
  return pickRandom(centered)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function chooseMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null {
  const moves = getValidMoves(board, player, gameOver)
  if (moves.length === 0) return null

  if (tilesPlaced[player] === 0) return pickRandom(moves)

  const winning = winningMoves(board, player)
  if (winning.length > 0) return winning[0]

  const opponent = OPPONENT[player]
  if (winningMoves(board, opponent).length > 0) {
    const block = findBlockingMove(board, player)
    if (block) return block
  }

  const fork = findForkMove(board, player)
  if (fork) return fork

  if (hasFork(board, opponent)) {
    const safe = moves.filter((move) => {
      const next = place(board, move, player)
      return winningMoves(next, opponent).length === 0 && !hasFork(next, opponent)
    })
    if (safe.length > 0) {
      const defense = findLibertyDefense(board, player, safe)
      if (defense) return defense
      return pickBestStrategic(board, safe, player)
    }
  }

  const defense = findLibertyDefense(board, player, moves)
  if (defense) return defense

  return pickBestStrategic(board, moves, player)
}
