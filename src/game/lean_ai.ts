import { BOARD_SIZE, OPPONENT } from '../constants'
import type { Board, CellValue, Player } from '../types'
import {
  checkConnectionWin,
  checkSurroundWin,
  isCellPlayable,
  isFixedPeg,
} from './logic'

export interface Move {
  row: number
  col: number
}

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
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
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

function largestComponentSize(board: Board, color: Player): number {
  let largest = 0
  for (const component of getComponents(board, color)) {
    largest = Math.max(largest, component.length)
  }
  return largest
}

function advanceTowardWin(board: Board, color: Player): number {
  let advance = 0
  for (const component of getComponents(board, color)) {
    let touchesStart = false
    let max = -Infinity
    if (color === 'red') {
      for (const cell of component) {
        if (cell.row === 0) touchesStart = true
        max = Math.max(max, cell.row)
      }
    } else {
      for (const cell of component) {
        if (cell.col === 0) touchesStart = true
        max = Math.max(max, cell.col)
      }
    }
    if (touchesStart && max !== -Infinity) {
      advance = Math.max(advance, max + 1)
    }
  }
  return advance
}

function nearEdge(cell: Move): boolean {
  return (
    cell.row <= 1 ||
    cell.row >= BOARD_SIZE - 2 ||
    cell.col <= 1 ||
    cell.col >= BOARD_SIZE - 2
  )
}

function escapeRoutes(board: Board, component: Move[], color: Player): number {
  const seen = new Set<string>()
  let routes = 0
  for (const cell of component) {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = cell.row + dr
      const nc = cell.col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (isFixedPeg(nr, nc)) continue
      const key = `${nr},${nc}`
      if (board[nr][nc] === null && isCellPlayable(board, nr, nc, color, false) && !seen.has(key)) {
        seen.add(key)
        routes++
      }
    }
  }
  return routes
}

// Counts connected components of `color` sitting near the board edge that have
// too few outward escape routes left, leaving them vulnerable to a box-in.
function edgeTrapVulnerability(board: Board, color: Player): number {
  const danger = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  for (const component of getComponents(board, color)) {
    if (!component.some(nearEdge)) continue
    if (escapeRoutes(board, component, color) <= 1) {
      for (const cell of component) danger[cell.row][cell.col] = true
    }
  }
  return danger.flat().filter(Boolean).length
}

function extendScore(board: Board, move: Move, player: Player): number {
  const next = place(board, move, player)
  const opponent = OPPONENT[player]

  let adjacency = 0
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const nr = move.row + dr
    const nc = move.col + dc
    if (
      nr >= 0 &&
      nr < BOARD_SIZE &&
      nc >= 0 &&
      nc < BOARD_SIZE &&
      board[nr][nc] === player &&
      !isFixedPeg(nr, nc)
    ) {
      adjacency++
    }
  }

  const largest = largestComponentSize(next, player)
  const advance = advanceTowardWin(next, player)
  const threat = winningMoves(next, opponent).length
  const ownTrap = edgeTrapVulnerability(next, player)

  return (
    60 * adjacency + 4 * largest + 25 * advance - 150 * threat - 300 * ownTrap
  )
}

function pickBestExtend(board: Board, moves: Move[], player: Player): Move {
  let bestScore = -Infinity
  let bestMoves: Move[] = []
  for (const move of moves) {
    const score = extendScore(board, move, player)
    if (score > bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }
  return pickRandom(bestMoves)
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
    if (safe.length > 0) return pickBestExtend(board, safe, player)
  }

  return pickBestExtend(board, moves, player)
}