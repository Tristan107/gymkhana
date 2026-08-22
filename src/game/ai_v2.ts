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

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function chooseMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null {
  const moves = getValidMoves(board, player, gameOver)
  if (moves.length === 0) return null

  if (tilesPlaced[player] === 0) {
    const opening = openingMoves(board, player, moves)
    return pickRandom(opening.length > 0 ? opening : moves)
  }

  const winning = winningMoves(board, player)
  if (winning.length > 0) return winning[0]

  const opponent = OPPONENT[player]
  const block = winningMoves(board, opponent).find((move) =>
    moves.some((m) => m.row === move.row && m.col === move.col)
  )
  if (block) return block

  const forcedWin = findForcedWinMove(board, player)
  if (forcedWin) return forcedWin

  const ownForks = findForkMove(board, player)
  if (ownForks.immediate) return ownForks.immediate

  const oppForks = findForkBlock(board, player)
  if (oppForks.immediate) return oppForks.immediate

  if (ownForks.general) return ownForks.general

  if (oppForks.general) return oppForks.general

  const defense = findLibertyDefense(board, player, moves)
  if (defense) return defense

  return pickBestStrategic(board, moves, player)
}

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

function hasAdjacentToken(board: Board, row: number, col: number): boolean {
  for (const [dr, dc] of DIRS) {
    const nr = row + dr
    const nc = col + dc
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
    if (board[nr][nc] !== null) return true
  }
  return false
}

function findForkMove(
  board: Board,
  player: Player
): { immediate: Move | null; general: Move | null } {
  const opponent = OPPONENT[player]
  let immediate: Move | null = null
  let general: Move | null = null
  let bestImmWins = -1
  let bestImmThreat = -1
  let bestGenWins = -1
  let bestGenThreat = -1
  for (const move of getValidMoves(board, player, false)) {
    if (!hasAdjacentToken(board, move.row, move.col)) continue
    const after = place(board, move, player)
    const w = winningMoves(after, player).length
    const t = chainsWithSinglePlayableLiberty(after, opponent, player).length
    if (w >= 2 && (w > bestImmWins || (w === bestImmWins && t > bestImmThreat))) {
      bestImmWins = w
      bestImmThreat = t
      immediate = move
    }
    if ((w >= 1 || t >= 2) && (w > bestGenWins || (w === bestGenWins && t > bestGenThreat))) {
      bestGenWins = w
      bestGenThreat = t
      general = move
    }
  }
  return { immediate, general }
}

function findForcedWinMove(board: Board, player: Player): Move | null {
  const opponent = OPPONENT[player]
  for (const component of getComponents(board, opponent)) {
    for (const liberty of componentOpenNeighbors(board, component)) {
      if (!isCellPlayable(board, liberty.row, liberty.col, player, false)) continue
      const after = place(board, liberty, player)
      const info = chainLibertyInfo(after, component, opponent, player)
      if (info.playable !== 0 || !info.boxable) continue
      if (winningMoves(after, opponent).length === 0) return liberty
    }
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

function seedEscapableBoundaries(
  board: Board,
  blocked: Player,
  escapable: boolean[][],
  queue: Array<{ row: number; col: number }>
): void {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (const [r, c] of [
      [0, i],
      [BOARD_SIZE - 1, i],
      [i, 0],
      [i, BOARD_SIZE - 1],
    ] as Array<[number, number]>) {
      if (board[r][c] !== blocked && !escapable[r][c]) {
        escapable[r][c] = true
        queue.push({ row: r, col: c })
      }
    }
  }
}

function floodEscapable(board: Board, blocked: Player): boolean[][] {
  const escapable: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  )
  const queue: Array<{ row: number; col: number }> = []
  seedEscapableBoundaries(board, blocked, escapable, queue)
  while (queue.length > 0) {
    const { row, col } = queue.shift() as { row: number; col: number }
    for (const [dr, dc] of DIRS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] !== blocked && !escapable[nr][nc]) {
        escapable[nr][nc] = true
        queue.push({ row: nr, col: nc })
      }
    }
  }
  return escapable
}

function collectSupport(board: Board, ai: Player, escapable: boolean[][]): Set<string> {
  const support = new Set<string>()
  for (let r = 1; r < BOARD_SIZE - 1; r++) {
    for (let c = 1; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] !== ai || escapable[r][c]) continue
      for (const [dr, dc] of DIRS) {
        const nr = r + dr
        const nc = c + dc
        if (board[nr][nc] === null) support.add(`${nr},${nc}`)
      }
    }
  }
  return support
}

function boxSupportCells(
  board: Board,
  winningMove: Move,
  opponent: Player,
  ai: Player
): Set<string> {
  const after = place(board, winningMove, opponent)
  const escapable = floodEscapable(after, opponent)
  return collectSupport(after, ai, escapable)
}

function findForkBlock(
  board: Board,
  player: Player
): { immediate: Move | null; general: Move | null } {
  const legal = getValidMoves(board, player, false)
  const immediate = findForkBlockMode(board, player, legal, 'immediate')
  const general = findForkBlockMode(board, player, legal, 'general')
  return { immediate, general }
}

function forkQualifies(
  wins: Move[],
  threatened: Move[][],
  mode: 'immediate' | 'general'
): boolean {
  if (mode === 'immediate') return wins.length >= 2
  return wins.length >= 1 || threatened.length >= 2
}

function candidatesFromWins(
  afterFork: Board,
  fork: Move,
  wins: Move[],
  legal: Move[],
  opponent: Player,
  player: Player,
  addCandidate: (move: Move) => void
): void {
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
}

function candidatesFromThreats(
  afterFork: Board,
  fork: Move,
  threatened: Move[][],
  legal: Move[],
  player: Player,
  addCandidate: (move: Move) => void
): void {
  if (legal.some((m) => m.row === fork.row && m.col === fork.col)) {
    addCandidate(fork)
  }
  for (const component of threatened) {
    for (const liberty of componentLiberties(afterFork, component, player)) {
      addCandidate(liberty)
    }
  }
}

function buildForkCandidates(
  afterFork: Board,
  fork: Move,
  wins: Move[],
  threatened: Move[][],
  legal: Move[],
  opponent: Player,
  player: Player
): Move[] {
  const candidates: Move[] = []
  const addCandidate = (move: Move): void => {
    if (candidates.some((m) => m.row === move.row && m.col === move.col)) return
    candidates.push(move)
  }

  if (wins.length >= 2) {
    candidatesFromWins(afterFork, fork, wins, legal, opponent, player, addCandidate)
  } else {
    candidatesFromThreats(afterFork, fork, threatened, legal, player, addCandidate)
  }
  return candidates
}

function pickBestForkBlock(
  board: Board,
  fork: Move,
  candidates: Move[],
  opponent: Player,
  player: Player
): Move | null {
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
  return bestMove
}

function findForkBlockMode(
  board: Board,
  player: Player,
  legal: Move[],
  mode: 'immediate' | 'general'
): Move | null {
  const opponent = OPPONENT[player]

  for (const fork of getValidMoves(board, opponent, false)) {
    if (!hasAdjacentToken(board, fork.row, fork.col)) continue
    const afterFork = place(board, fork, opponent)
    const wins = winningMoves(afterFork, opponent)
    const threatened = chainsWithSinglePlayableLiberty(afterFork, player, opponent)
    if (!forkQualifies(wins, threatened, mode)) continue

    const candidates = buildForkCandidates(
      afterFork,
      fork,
      wins,
      threatened,
      legal,
      opponent,
      player
    )
    const bestMove = pickBestForkBlock(board, fork, candidates, opponent, player)
    if (bestMove !== null) return bestMove
  }
  return null
}

function floodComponent(
  board: Board,
  color: Player,
  startRow: number,
  startCol: number,
  visited: Set<string>
): Move[] {
  const cells: Move[] = []
  const queue: Move[] = [{ row: startRow, col: startCol }]
  visited.add(`${startRow},${startCol}`)
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
  return cells
}

function getComponents(board: Board, color: Player): Move[][] {
  const visited = new Set<string>()
  const components: Move[][] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== color || visited.has(`${row},${col}`)) continue
      components.push(floodComponent(board, color, row, col, visited))
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

function findSingleLibertyDefense(board: Board, player: Player, moves: Move[]): Move | null {
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

function findBestLibertyDefense(
  board: Board,
  player: Player,
  opponent: Player,
  moves: Move[]
): Move | null {
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

function findLibertyDefense(board: Board, player: Player, moves: Move[]): Move | null {
  const opponent = OPPONENT[player]

  const single = findSingleLibertyDefense(board, player, moves)
  if (single !== null) return single

  return findBestLibertyDefense(board, player, opponent, moves)
}

function adjacentCells(board: Board, component: Move[]): { cells: Move[]; seen: Set<string> } {
  const seen = new Set<string>()
  const cells: Move[] = []
  for (const cell of component) {
    for (const [dr, dc] of DIRS) {
      const nr = cell.row + dr
      const nc = cell.col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] !== null) continue
      const key = `${nr},${nc}`
      if (seen.has(key)) continue
      seen.add(key)
      cells.push({ row: nr, col: nc })
    }
  }
  return { cells, seen }
}

function isBoxable(board: Board, adjacent: Move[], seen: Set<string>): boolean {
  const flooded = new Set<string>(seen)
  const queue: Move[] = [...adjacent]
  while (queue.length > 0) {
    const current = queue.shift() as Move
    if (
      current.row === 0 ||
      current.row === BOARD_SIZE - 1 ||
      current.col === 0 ||
      current.col === BOARD_SIZE - 1
    ) {
      return false
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
  return true
}

function countPlayable(board: Board, adjacent: Move[], color: Player): number {
  let count = 0
  for (const cell of adjacent) {
    if (isCellPlayable(board, cell.row, cell.col, color, false)) count++
  }
  return count
}

function boxInTilesNeeded(board: Board, color: Player): number {
  const opponent = OPPONENT[color]
  let minimum = Infinity
  for (const component of getComponents(board, opponent)) {
    const { cells, seen } = adjacentCells(board, component)
    if (cells.length === 0) continue
    if (!isBoxable(board, cells, seen)) continue
    minimum = Math.min(minimum, countPlayable(board, cells, color))
  }
  return minimum
}

function edgeWeight(board: Board, color: Player, r: number, c: number): number | null {
  if (board[r][c] === OPPONENT[color]) return null
  if (board[r][c] === null && !isCellPlayable(board, r, c, color, false)) return null
  return board[r][c] === color ? 0 : 1
}

function pushDeque(deque: number[], index: number, weight: number): void {
  if (weight === 0) deque.unshift(index)
  else deque.push(index)
}

function seedDistances(
  board: Board,
  color: Player,
  horizontal: boolean,
  dist: number[][],
  deque: number[]
): void {
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = horizontal ? i : 0
    const col = horizontal ? 0 : i
    const weight = edgeWeight(board, color, row, col)
    if (weight === null) continue
    dist[row][col] = weight
    pushDeque(deque, row * BOARD_SIZE + col, weight)
  }
}

function relaxNeighbors(
  board: Board,
  color: Player,
  row: number,
  col: number,
  dist: number[][],
  deque: number[]
): void {
  for (const [dr, dc] of DIRS) {
    const nr = row + dr
    const nc = col + dc
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
    const weight = edgeWeight(board, color, nr, nc)
    if (weight === null) continue
    if (dist[row][col] + weight < dist[nr][nc]) {
      dist[nr][nc] = dist[row][col] + weight
      pushDeque(deque, nr * BOARD_SIZE + nc, weight)
    }
  }
}

function minTargetDistance(dist: number[][], horizontal: boolean): number {
  let minimum = Infinity
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = horizontal ? i : BOARD_SIZE - 1
    const col = horizontal ? BOARD_SIZE - 1 : i
    minimum = Math.min(minimum, dist[row][col])
  }
  return minimum
}

function tilesToConnect(board: Board, color: Player): number {
  const horizontal = color === 'white'
  const dist: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => Infinity)
  )
  const deque: number[] = []

  seedDistances(board, color, horizontal, dist, deque)

  while (deque.length > 0) {
    const index = deque.shift() as number
    const row = Math.floor(index / BOARD_SIZE)
    const col = index % BOARD_SIZE
    relaxNeighbors(board, color, row, col, dist, deque)
  }

  return minTargetDistance(dist, horizontal)
}

function onHomeLane(move: Move, player: Player): boolean {
  return player === 'red'
    ? move.row === 0 || move.row === BOARD_SIZE - 1
    : move.col === 0 || move.col === BOARD_SIZE - 1
}

function collectRedEdgeTokens(board: Board, player: Player): Set<string> {
  const tokens = new Set<string>()
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[0][i] === player) tokens.add(`0,${i}`)
    if (board[BOARD_SIZE - 1][i] === player) tokens.add(`${BOARD_SIZE - 1},${i}`)
  }
  return tokens
}

function collectWhiteEdgeTokens(board: Board, player: Player): Set<string> {
  const tokens = new Set<string>()
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i][0] === player) tokens.add(`${i},0`)
    if (board[i][BOARD_SIZE - 1] === player) tokens.add(`${i},${BOARD_SIZE - 1}`)
  }
  return tokens
}

function openingMoves(board: Board, player: Player, moves: Move[]): Move[] {
  const edgeTokens = player === 'red' ? collectRedEdgeTokens(board, player) : collectWhiteEdgeTokens(board, player)
  return moves.filter((move) => {
    if (onHomeLane(move, player)) return false
    for (const [dr, dc] of DIRS) {
      if (edgeTokens.has(`${move.row + dr},${move.col + dc}`)) return true
    }
    return false
  })
}

function isImminentBoxLiberty(board: Board, move: Move, player: Player): boolean {
  const opponent = OPPONENT[player]
  for (const component of getComponents(board, opponent)) {
    const info = chainLibertyInfo(board, component, opponent, player)
    if (info.playable > 2 || !info.boxable) continue
    if (componentLiberties(board, component, opponent).some((l) => l.row === move.row && l.col === move.col)) {
      return true
    }
  }
  return false
}

function countAxisNeighbor(board: Board, player: Player, r: number, c: number): number {
  if (player === 'red') {
    if (r + 1 < BOARD_SIZE && board[r + 1][c] === player) return 1
  } else if (c + 1 < BOARD_SIZE && board[r][c + 1] === player) {
    return 1
  }
  return 0
}

function axisAdjacency(board: Board, player: Player): number {
  let count = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== player) continue
      count += countAxisNeighbor(board, player, r, c)
    }
  }
  return count
}

function floodComponentWithPlaced(
  board: Board,
  player: Player,
  startRow: number,
  startCol: number,
  visited: Set<string>
): Move[] | null {
  const cells: Move[] = []
  const queue: Move[] = [{ row: startRow, col: startCol }]
  visited.add(`${startRow},${startCol}`)
  let hasPlaced = false
  while (queue.length > 0) {
    const current = queue.shift() as Move
    cells.push(current)
    if (!isFixedPeg(current.row, current.col)) hasPlaced = true
    for (const [dr, dc] of DIRS) {
      const nr = current.row + dr
      const nc = current.col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (board[nr][nc] !== player) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ row: nr, col: nc })
    }
  }
  return hasPlaced ? cells : null
}

function activeCells(board: Board, player: Player): Set<string> {
  const active = new Set<string>()
  const visited = new Set<string>()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== player || visited.has(`${r},${c}`)) continue
      const cells = floodComponentWithPlaced(board, player, r, c, visited)
      if (cells === null) continue
      for (const cell of cells) active.add(`${cell.row},${cell.col}`)
    }
  }
  return active
}

interface StrategicMetrics {
  connect: number
  oppConnect: number
  zigzag: number
  health: number
  box: number
}

function isNearActive(move: Move, activeSet: Set<string>): boolean {
  for (const [dr, dc] of DIRS) {
    const nr = move.row + dr
    const nc = move.col + dc
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
    if (activeSet.has(`${nr},${nc}`)) return true
  }
  return false
}

function isBetterMetrics(candidate: StrategicMetrics, best: StrategicMetrics): boolean {
  if (candidate.connect < best.connect) return true
  if (candidate.connect > best.connect) return false
  if (candidate.oppConnect > best.oppConnect) return true
  if (candidate.oppConnect < best.oppConnect) return false
  if (candidate.zigzag < best.zigzag) return true
  if (candidate.zigzag > best.zigzag) return false
  if (candidate.health < best.health) return true
  if (candidate.health > best.health) return false
  return candidate.box < best.box
}

function equalMetrics(a: StrategicMetrics, b: StrategicMetrics): boolean {
  return (
    a.connect === b.connect &&
    a.oppConnect === b.oppConnect &&
    a.zigzag === b.zigzag &&
    a.health === b.health &&
    a.box === b.box
  )
}

function pickBestStrategic(board: Board, moves: Move[], player: Player): Move {
  const opponent = OPPONENT[player]
  const candidates = moves.filter(
    (move) => !onHomeLane(move, player) || isImminentBoxLiberty(board, move, player)
  )
  const base = candidates.length > 0 ? candidates : moves
  const activeSet = activeCells(board, player)
  const active = base.filter((move) => isNearActive(move, activeSet))
  const pool = active.length > 0 ? active : base

  const best: StrategicMetrics = {
    connect: Infinity,
    oppConnect: -Infinity,
    zigzag: Infinity,
    health: Infinity,
    box: Infinity,
  }
  let bestMoves: Move[] = []
  for (const move of pool) {
    const next = place(board, move, player)
    const metrics: StrategicMetrics = {
      connect: tilesToConnect(next, player),
      oppConnect: tilesToConnect(next, opponent),
      zigzag: axisAdjacency(next, player),
      health: chainsWithFewPlayableLiberties(next, player, opponent, 2).length,
      box: boxInTilesNeeded(next, player),
    }
    if (isBetterMetrics(metrics, best)) {
      Object.assign(best, metrics)
      bestMoves = [move]
    } else if (equalMetrics(metrics, best)) {
      bestMoves.push(move)
    }
  }
  return pickRandom(bestMoves)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

