import { BOARD_SIZE, CELL_COUNT, CELL, FIXED_PEG_MASK, NEIGHBORS, PLAYABLE_MASK_RED, PLAYABLE_MASK_WHITE, OPENING_MASK_RED, OPENING_MASK_WHITE, ZOBRIST_KEYS, ZOBRIST_TURN, EDGE_INDICES_RED, EDGE_INDICES_WHITE, EDGE_INDICES_RED_START, EDGE_INDICES_WHITE_START, EDGE_INDICES_RED_FIXED, EDGE_INDICES_WHITE_FIXED, EDGE_INDICES_RED_START_FIXED, EDGE_INDICES_WHITE_START_FIXED, INDEX_TO_RC } from '../constants'
import type { FlatBoard, PlayerCode, MoveIndex, Board, PublicMove } from '../types'

function createInitialFlatBoard(): Uint8Array {
  const board = new Uint8Array(CELL_COUNT)
  for (let i = 0; i < CELL_COUNT; i++) {
    if (FIXED_PEG_MASK[i]) {
      const row = INDEX_TO_RC[i][0]
      board[i] = row % 2 === 0 ? CELL.FIXED_RED : CELL.FIXED_WHITE
    }
  }
  return board
}

const INITIAL_BOARD_TEMPLATE = createInitialFlatBoard()

export function createFlatBoard(): FlatBoard {
  return INITIAL_BOARD_TEMPLATE.slice() as FlatBoard
}

export function cloneBoard(board: FlatBoard): FlatBoard {
  return board.slice() as FlatBoard
}

export function applyMove(board: FlatBoard, idx: MoveIndex, player: PlayerCode): void {
  board[idx] = player
}

export function undoMove(board: FlatBoard, idx: MoveIndex): void {
  board[idx] = CELL.EMPTY
}

export function getValidMoves(board: FlatBoard, player: PlayerCode, out: MoveIndex[]): number {
  const mask = player === 1 ? PLAYABLE_MASK_RED : PLAYABLE_MASK_WHITE
  let count = 0
  for (let i = 0; i < CELL_COUNT; i++) {
    if (mask[i] && board[i] === CELL.EMPTY) {
      out[count++] = i as MoveIndex
    }
  }
  return count
}

export interface GameOverResult {
  gameOver: boolean
  winner: PlayerCode | 0
  reason: 'connection' | 'surround' | 'draw' | 'none'
}

export function checkGameOver(board: FlatBoard, tilesRed: number, tilesWhite: number): GameOverResult {
  if (tilesRed > 0 || tilesWhite > 0) {
    if (checkConnectionWin(board, 1)) return { gameOver: true, winner: 1, reason: 'connection', }
    if (checkConnectionWin(board, 2)) return { gameOver: true, winner: 2, reason: 'connection', }
    if (checkSurroundWin(board, 1)) return { gameOver: true, winner: 1, reason: 'surround', }
    if (checkSurroundWin(board, 2)) return { gameOver: true, winner: 2, reason: 'surround', }
  }
  if (tilesRed === 20 && tilesWhite === 20) {
    return { gameOver: true, winner: 0, reason: 'draw' }
  }
  return { gameOver: false, winner: 0, reason: 'none' }
}

const SURR_VISITED = new Uint8Array(CELL_COUNT)
const SURR_QUEUE = new Uint16Array(CELL_COUNT)
let SURR_GEN = 0

export function checkConnectionWin(board: FlatBoard, player: PlayerCode): boolean {
  const uf = WIN_UF
  uf.reset()
  const playerCode = player
  const fixedCode = player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE

  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = board[i]
    if (cell !== playerCode && cell !== fixedCode) continue
    const neighbors = NEIGHBORS[i]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n !== -1) {
        const nCell = board[n]
        if (nCell === playerCode || nCell === fixedCode) {
          uf.union(i, n)
        }
      }
    }
  }

  const startEdges = player === 1 ? EDGE_INDICES_RED_START : EDGE_INDICES_WHITE_START
  const endEdges = player === 1 ? EDGE_INDICES_RED : EDGE_INDICES_WHITE
  const startEdgesFixed = player === 1 ? EDGE_INDICES_RED_START_FIXED : EDGE_INDICES_WHITE_START_FIXED
  const endEdgesFixed = player === 1 ? EDGE_INDICES_RED_FIXED : EDGE_INDICES_WHITE_FIXED

  for (let i = 0; i < startEdges.length; i++) {
    const s = startEdges[i]
    const sCell = board[s]
    if (sCell !== playerCode && sCell !== fixedCode) continue
    const rootS = uf.find(s)
    for (let j = 0; j < endEdges.length; j++) {
      const e = endEdges[j]
      const eCell = board[e]
      if (eCell !== playerCode && eCell !== fixedCode) continue
      if (uf.find(e) === rootS) return true
    }
  }

  for (let i = 0; i < startEdgesFixed.length; i++) {
    const s = startEdgesFixed[i]
    const sCell = board[s]
    if (sCell !== fixedCode && sCell !== playerCode) continue
    const rootS = uf.find(s)
    for (let j = 0; j < endEdges.length; j++) {
      const e = endEdges[j]
      const eCell = board[e]
      if (eCell !== playerCode && eCell !== fixedCode) continue
      if (uf.find(e) === rootS) return true
    }
    for (let j = 0; j < endEdgesFixed.length; j++) {
      const e = endEdgesFixed[j]
      const eCell = board[e]
      if (eCell !== fixedCode && eCell !== playerCode) continue
      if (uf.find(e) === rootS) return true
    }
  }
  return false
}

export function checkSurroundWin(board: FlatBoard, player: PlayerCode): boolean {
  const opponent = player === 1 ? 2 : 1
  const playerFixed = player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE
  const opponentFixed = opponent === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE
  SURR_GEN++
  if (SURR_GEN >= 250) {
    SURR_VISITED.fill(0)
    SURR_GEN = 1
  }
  const gen = SURR_GEN
  const visited = SURR_VISITED
  const queue = SURR_QUEUE
  let head = 0
  let tail = 0

  for (let i = 0; i < CELL_COUNT; i++) {
    const row = Math.floor(i / BOARD_SIZE)
    const col = i % BOARD_SIZE
    if (row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1) {
      const cell = board[i]
      if (cell !== player && cell !== playerFixed) {
        visited[i] = gen
        queue[tail++] = i
      }
    }
  }

  while (head < tail) {
    const idx = queue[head++]
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n !== -1 && visited[n] !== gen) {
        const cell = board[n]
        if (cell !== player && cell !== playerFixed) {
          visited[n] = gen
          queue[tail++] = n
        }
      }
    }
  }

  for (let i = 0; i < CELL_COUNT; i++) {
    if (
      (board[i] === opponent || board[i] === opponentFixed) &&
      visited[i] !== gen
    ) {
      return true
    }
  }
  return false
}

class UnionFind {
  parent: Uint16Array
  rank: Uint8Array

  constructor() {
    this.parent = new Uint16Array(CELL_COUNT)
    this.rank = new Uint8Array(CELL_COUNT)
    this.reset()
  }

  reset(): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      this.parent[i] = i
      this.rank[i] = 0
    }
  }

  find(x: number): number {
    let root = x
    while (this.parent[root] !== root) {
      root = this.parent[root]
    }
    while (this.parent[x] !== root) {
      const next = this.parent[x]
      this.parent[x] = root
      x = next
    }
    return root
  }

  union(x: number, y: number): void {
    const rx = this.find(x)
    const ry = this.find(y)
    if (rx === ry) return
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx
    } else {
      this.parent[ry] = rx
      this.rank[rx]++
    }
  }
}

const WIN_UF = new UnionFind()

export function hashBoard(board: FlatBoard, currentPlayer: PlayerCode): number {
  let hash = 0
  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = board[i]
    if (cell !== CELL.EMPTY) {
      const keyIndex = cell === CELL.RED ? 1 : cell === CELL.WHITE ? 2 : 3
      hash ^= ZOBRIST_KEYS[keyIndex][i]
    }
  }
  hash ^= ZOBRIST_TURN[currentPlayer === 1 ? 0 : 1]
  return hash >>> 0
}

export function toPublicBoard(flat: FlatBoard): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null))
  for (let i = 0; i < CELL_COUNT; i++) {
    const row = Math.floor(i / BOARD_SIZE)
    const col = i % BOARD_SIZE
    const cell = flat[i]
    if (cell === CELL.RED || cell === CELL.FIXED_RED) board[row][col] = 'red'
    else if (cell === CELL.WHITE || cell === CELL.FIXED_WHITE) board[row][col] = 'white'
  }
  return board
}

export function fromPublicBoard(board: Board, out: Uint8Array): void {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const idx = row * BOARD_SIZE + col
      if (FIXED_PEG_MASK[idx]) {
        const cell = board[row][col]
        if (cell === 'red') out[idx] = CELL.RED
        else if (cell === 'white') out[idx] = CELL.WHITE
        else out[idx] = row % 2 === 0 ? CELL.FIXED_RED : CELL.FIXED_WHITE
      } else {
        const cell = board[row][col]
        out[idx] = cell === 'red' ? CELL.RED : cell === 'white' ? CELL.WHITE : CELL.EMPTY
      }
    }
  }
}

export function toPublicMove(idx: MoveIndex): PublicMove {
  const row = Math.floor(idx / BOARD_SIZE)
  const col = idx % BOARD_SIZE
  return { row, col }
}

export function fromPublicMove(move: PublicMove): MoveIndex {
  return (move.row * BOARD_SIZE + move.col) as MoveIndex
}

export function getOpeningMoves(board: FlatBoard, player: PlayerCode, out: MoveIndex[]): number {
  const mask = player === 1 ? OPENING_MASK_RED : OPENING_MASK_WHITE
  let count = 0
  for (let i = 0; i < CELL_COUNT; i++) {
    if (mask[i] && board[i] === CELL.EMPTY) {
      out[count++] = i as MoveIndex
    }
  }
  return count
}