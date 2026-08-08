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
  const opponent = OPPONENT[player]
  for (const move of getValidMoves(board, player, false)) {
    const after = place(board, move, player)
    if (winningMoves(after, player).length >= 2) return move
    if (chainsWithSinglePlayableLiberty(after, opponent, player).length >= 2) return move
  }
  return null
}

function createsFork(board: Board, move: Move, attacker: Player, defender: Player): boolean {
  if (board[move.row][move.col] !== null) return false
  const after = place(board, move, attacker)
  return (
    winningMoves(after, attacker).length >= 2 ||
    chainsWithSinglePlayableLiberty(after, defender, attacker).length >= 2
  )
}

function boxSupportCells(
  board: Board,
  winningMove: Move,
  opponent: Player,
  ai: Player
): Set<string> {
  const after = place(board, winningMove, opponent)
  const escapable: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Array<{ row: number; col: number }> = []
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (const [r, c] of [
      [0, i],
      [BOARD_SIZE - 1, i],
      [i, 0],
      [i, BOARD_SIZE - 1],
    ] as Array<[number, number]>) {
      if (after[r][c] !== opponent && !escapable[r][c]) {
        escapable[r][c] = true
        queue.push({ row: r, col: c })
      }
    }
  }
  while (queue.length > 0) {
    const { row, col } = queue.shift() as { row: number; col: number }
    for (const [dr, dc] of DIRS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (after[nr][nc] !== opponent && !escapable[nr][nc]) {
        escapable[nr][nc] = true
        queue.push({ row: nr, col: nc })
      }
    }
  }
  const support = new Set<string>()
  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      if (after[r][c] !== ai || escapable[r][c]) continue
      for (const [dr, dc] of DIRS) {
        const nr = r + dr
        const nc = c + dc
        if (after[nr][nc] === null) support.add(`${nr},${nc}`)
      }
    }
  }
  return support
}

function findForkBlock(board: Board, player: Player): Move | null {
  const opponent = OPPONENT[player]
  const legal = getValidMoves(board, player, false)

  for (const fork of getValidMoves(board, opponent, false)) {
    const afterFork = place(board, fork, opponent)
    const wins = winningMoves(afterFork, opponent)
    const threatened = chainsWithSinglePlayableLiberty(afterFork, player, opponent)
    if (wins.length < 2 && threatened.length < 2) continue

    const candidates: Move[] = []
    const addCandidate = (move: Move): void => {
      if (candidates.some((m) => m.row === move.row && m.col === move.col)) return
      candidates.push(move)
    }

    if (wins.length >= 2) {
      const coverage = new Map<string, number>()
      for (const win of wins) {
        for (const key of boxSupportCells(afterFork, win, opponent, player)) {
          coverage.set(key, (coverage.get(key) ?? 0) + 1)
        }
      }
      legal
        .map((move) => ({ move, count: coverage.get(`${move.row},${move.col}`) ?? 0 }))
        .filter((candidate) => candidate.count >= 1)
        .sort((a, b) => b.count - a.count)
        .forEach(({ move }) => addCandidate(move))
      if (legal.some((m) => m.row === fork.row && m.col === fork.col)) {
        addCandidate(fork)
      }
    } else {
      if (legal.some((m) => m.row === fork.row && m.col === fork.col)) {
        addCandidate(fork)
      }
      for (const component of threatened) {
        for (const liberty of componentLiberties(afterFork, component, player)) {
          addCandidate(liberty)
        }
      }
    }

    let bestMove: Move | null = null
    let bestHealth = Infinity
    for (const move of candidates) {
      const next = place(board, move, player)
      if (winningMoves(next, opponent).length === 0 && !createsFork(next, fork, opponent, player)) {
        const health = chainsWithSinglePlayableLiberty(next, player, opponent).length
        if (health < bestHealth) {
          bestHealth = health
          bestMove = move
        }
      }
    }
    if (bestMove !== null) return bestMove
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

function componentOpenNeighbors(board: Board, component: Move[]): Move[] {
  const seen = new Set<string>()
  const neighbors: Move[] = []
  for (const cell of component) {
    for (const [dr, dc] of DIRS) {
      const nr = cell.row + dr
      const nc = cell.col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] !== null) continue
      const key = `${nr},${nc}`
      if (seen.has(key)) continue
      seen.add(key)
      neighbors.push({ row: nr, col: nc })
    }
  }
  return neighbors
}

function chainLibertyInfo(
  board: Board,
  component: Move[],
  defender: Player,
  attacker: Player
): { playable: number; boxable: boolean } {
  let playable = 0
  let boxable = true
  for (const cell of componentOpenNeighbors(board, component)) {
    if (isCellPlayable(board, cell.row, cell.col, defender, false)) {
      playable++
    }
    if (!isCellPlayable(board, cell.row, cell.col, attacker, false)) {
      boxable = false
    }
  }
  return { playable, boxable }
}

function chainsWithSinglePlayableLiberty(
  board: Board,
  defender: Player,
  attacker: Player
): Move[][] {
  return getComponents(board, defender).filter(
    (component) => {
      const info = chainLibertyInfo(board, component, defender, attacker)
      return info.playable === 1 && info.boxable
    }
  )
}

function chainsWithFewPlayableLiberties(
  board: Board,
  defender: Player,
  attacker: Player,
  maxCount: number
): Move[][] {
  return getComponents(board, defender).filter(
    (component) => {
      const info = chainLibertyInfo(board, component, defender, attacker)
      return info.playable <= maxCount && info.boxable
    }
  )
}

function findLibertyDefense(board: Board, player: Player, moves: Move[]): Move | null {
  const opponent = OPPONENT[player]

  for (const component of getComponents(board, player)) {
    const liberties = componentLiberties(board, component, player)
    if (liberties.length !== 1) continue
    const liberty = liberties[0]
    if (moves.some((move) => move.row === liberty.row && move.col === liberty.col)) {
      return liberty
    }
  }

  let bestMove: Move | null = null
  let bestScore = -1
  for (const component of chainsWithFewPlayableLiberties(board, player, opponent, 2)) {
    for (const liberty of componentLiberties(board, component, player)) {
      if (!moves.some((move) => move.row === liberty.row && move.col === liberty.col)) continue
      const next = place(board, liberty, player)
      const merged = getComponents(next, player).find((group) =>
        group.some((cell) => cell.row === liberty.row && cell.col === liberty.col)
      )
      if (merged === undefined) continue
      const score = componentLiberties(next, merged, player).length
      if (score > bestScore) {
        bestScore = score
        bestMove = liberty
      }
    }
  }
  return bestMove
}

function boxInTilesNeeded(board: Board, color: Player): number {
  const opponent = OPPONENT[color]
  let minimum = Infinity
  for (const component of getComponents(board, opponent)) {
    const seen = new Set<string>()
    const adjacent: Move[] = []
    for (const cell of component) {
      for (const [dr, dc] of DIRS) {
        const nr = cell.row + dr
        const nc = cell.col + dc
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
        if (board[nr][nc] !== null) continue
        const key = `${nr},${nc}`
        if (seen.has(key)) continue
        seen.add(key)
        adjacent.push({ row: nr, col: nc })
      }
    }
    if (adjacent.length === 0) continue

    const flooded = new Set<string>(seen)
    const queue: Move[] = [...adjacent]
    let boxable = true
    while (queue.length > 0) {
      const current = queue.shift() as Move
      if (
        current.row === 0 ||
        current.row === BOARD_SIZE - 1 ||
        current.col === 0 ||
        current.col === BOARD_SIZE - 1
      ) {
        boxable = false
        break
      }
      for (const [dr, dc] of DIRS) {
        const nr = current.row + dr
        const nc = current.col + dc
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
        if (board[nr][nc] !== null) continue
        const key = `${nr},${nc}`
        if (flooded.has(key)) continue
        flooded.add(key)
        queue.push({ row: nr, col: nc })
      }
    }
    if (!boxable) continue

    let count = 0
    for (const cell of adjacent) {
      if (isCellPlayable(board, cell.row, cell.col, color, false)) count++
    }
    minimum = Math.min(minimum, count)
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
    if (cell === null && !isCellPlayable(board, row, col, color, false)) continue
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
      if (board[nr][nc] === null && !isCellPlayable(board, nr, nc, color, false)) continue
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
  const opponent = OPPONENT[player]
  let bestScore = Infinity
  let bestTieBreak = Infinity
  let bestMoves: Move[] = []
  for (const move of moves) {
    const next = place(board, move, player)
    const score = Math.min(tilesToConnect(next, player), boxInTilesNeeded(next, player))
    const health = chainsWithFewPlayableLiberties(next, player, opponent, 2).length
    if (score < bestScore) {
      bestScore = score
      bestTieBreak = health
      bestMoves = [move]
    } else if (score === bestScore) {
      if (health < bestTieBreak) {
        bestTieBreak = health
        bestMoves = [move]
      } else if (health === bestTieBreak) {
        bestMoves.push(move)
      }
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
  const block = winningMoves(board, opponent).find((move) =>
    moves.some((m) => m.row === move.row && m.col === move.col)
  )
  if (block) return block

  const fork = findForkMove(board, player)
  if (fork) return fork

  const opponentFork = findForkBlock(board, player)
  if (opponentFork) return opponentFork

  const defense = findLibertyDefense(board, player, moves)
  if (defense) return defense

  return pickBestStrategic(board, moves, player)
}
