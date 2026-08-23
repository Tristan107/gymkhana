import { BOARD_SIZE, CELL_COUNT, CELL, NEIGHBORS, EDGE_INDICES_RED, EDGE_INDICES_WHITE, EDGE_INDICES_RED_START, EDGE_INDICES_WHITE_START } from '../constants'
import type { FlatBoard, PlayerCode, MoveIndex } from '../types'
import { UnionFind } from './winDetection'
import type { Component } from './floodFill'
import { getComponents } from './floodFill'

export interface StrategicMetrics {
  connect: number
  oppConnect: number
  zigzag: number
  health: number
  box: number
}

function tilesToConnect(board: FlatBoard, player: PlayerCode, uf: UnionFind): number {
  uf.reset()
  const playerCode = player
  const horizontal = player === 2

  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = board[i]
    if (cell === playerCode || cell === (player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE)) {
      const neighbors = NEIGHBORS[i]
      for (let d = 0; d < 4; d++) {
        const n = neighbors[d]
        if (n !== -1) {
          const nCell = board[n]
          if (nCell === playerCode || nCell === (player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE)) {
            uf.union(i, n)
          }
        }
      }
    }
  }

  const dist = new Uint8Array(CELL_COUNT)
  for (let i = 0; i < CELL_COUNT; i++) dist[i] = 255
  const deque: number[] = []

  const startEdges = horizontal ? EDGE_INDICES_WHITE_START : EDGE_INDICES_RED_START
  for (let i = 0; i < startEdges.length; i++) {
    const idx = startEdges[i]
    const cell = board[idx]
    if (cell === playerCode || cell === (player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE)) {
      dist[idx] = 0
      deque.unshift(idx)
    }
  }

  while (deque.length > 0) {
    const idx = deque.shift()!
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1) continue
      const nCell = board[n]
      if (nCell === CELL.EMPTY) {
        if (dist[idx] + 1 < dist[n]) {
          dist[n] = dist[idx] + 1
          deque.push(n)
        }
      } else if (nCell === playerCode || nCell === (player === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE)) {
        if (dist[idx] < dist[n]) {
          dist[n] = dist[idx]
          deque.unshift(n)
        }
      }
    }
  }

  let minimum = 255
  const endEdges = horizontal ? EDGE_INDICES_WHITE : EDGE_INDICES_RED
  for (let i = 0; i < endEdges.length; i++) {
    const idx = endEdges[i]
    if (dist[idx] < minimum) minimum = dist[idx]
  }
  return minimum === 255 ? 99 : minimum
}

function axisAdjacency(board: FlatBoard, player: PlayerCode): number {
  let count = 0
  if (player === 1) {
    for (let row = 0; row < BOARD_SIZE - 1; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const idx = row * BOARD_SIZE + col
        const idxDown = idx + BOARD_SIZE
        if (board[idx] === CELL.RED && board[idxDown] === CELL.RED) count++
      }
    }
  } else {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        const idx = row * BOARD_SIZE + col
        const idxRight = idx + 1
        if (board[idx] === CELL.WHITE && board[idxRight] === CELL.WHITE) count++
      }
    }
  }
  return count
}

function boxInTilesNeeded(board: FlatBoard, player: PlayerCode, visited: Uint8Array, components: Component[]): number {
  const opponent = player === 1 ? 2 : 1
  const nComps = getComponents(board, opponent, visited, components)
  let minimum = 99

  for (let i = 0; i < nComps; i++) {
    const comp = components[i]
    if (comp.cells.length === 0) continue
    if (!comp.boxable) continue
    minimum = Math.min(minimum, comp.playableLibertyCount)
  }
  return minimum
}

export function evaluateMove(
  board: FlatBoard,
  moveIdx: MoveIndex,
  player: PlayerCode,
  opponent: PlayerCode,
  visited: Uint8Array,
  uf: UnionFind,
  outComponents: Component[]
): StrategicMetrics {
  applyMove(board, moveIdx, player)

  const connect = tilesToConnect(board, player, uf)
  const oppConnect = tilesToConnect(board, opponent, uf)
  const zigzag = axisAdjacency(board, player)
  const health = countVulnerableComponents(board, player, visited)
  const box = boxInTilesNeeded(board, player, visited, outComponents)

  undoMove(board, moveIdx)

  return { connect, oppConnect, zigzag, health, box }
}

function countVulnerableComponents(board: FlatBoard, player: PlayerCode, visited: Uint8Array): number {
  const tempComponents: Component[] = new Array(60)
  const nComps = getComponents(board, player, visited, tempComponents)
  let count = 0
  for (let i = 0; i < nComps; i++) {
    const comp = tempComponents[i]
    if (comp && comp.playableLibertyCount <= 2 && comp.boxable) count++
  }
  return count
}

function applyMove(board: FlatBoard, idx: MoveIndex, player: PlayerCode): void {
  board[idx] = player
}

function undoMove(board: FlatBoard, idx: MoveIndex): void {
  board[idx] = CELL.EMPTY
}

export function compareMetrics(a: StrategicMetrics, b: StrategicMetrics): -1 | 0 | 1 {
  if (a.connect !== b.connect) return a.connect < b.connect ? -1 : 1
  if (a.oppConnect !== b.oppConnect) return a.oppConnect > b.oppConnect ? -1 : 1
  if (a.zigzag !== b.zigzag) return a.zigzag < b.zigzag ? -1 : 1
  if (a.health !== b.health) return a.health < b.health ? -1 : 1
  if (a.box !== b.box) return a.box < b.box ? -1 : 1
  return 0
}

export function pickBestMove(
  board: FlatBoard,
  candidates: MoveIndex[],
  candidateCount: number,
  player: PlayerCode,
  opponent: PlayerCode,
  visited: Uint8Array,
  uf: UnionFind,
  outComponents: Component[],
  outMetrics: StrategicMetrics
): MoveIndex {
  let bestIdx = candidates[0]
  let bestMetrics: StrategicMetrics = { connect: 99, oppConnect: -1, zigzag: 99, health: 99, box: 99 }
  let hasBest = false

  for (let i = 0; i < candidateCount; i++) {
    const moveIdx = candidates[i]
    const metrics = evaluateMove(board, moveIdx, player, opponent, visited, uf, outComponents)

    if (!hasBest || compareMetrics(metrics, bestMetrics) < 0) {
      bestMetrics = metrics
      bestIdx = moveIdx
      hasBest = true
    }
  }

  outMetrics.connect = bestMetrics.connect
  outMetrics.oppConnect = bestMetrics.oppConnect
  outMetrics.zigzag = bestMetrics.zigzag
  outMetrics.health = bestMetrics.health
  outMetrics.box = bestMetrics.box

  return bestIdx
}

export function filterOpeningMoves(candidates: MoveIndex[], candidateCount: number, player: PlayerCode, out: MoveIndex[]): number {
  let count = 0
  for (let i = 0; i < candidateCount; i++) {
    const idx = candidates[i]
    const row = Math.floor(idx / BOARD_SIZE)
    const col = idx % BOARD_SIZE
    if (player === 1) {
      if ((row === 1 || row === BOARD_SIZE - 2) && col % 2 === 1) {
        out[count++] = idx
      }
    } else {
      if ((col === 1 || col === BOARD_SIZE - 2) && row % 2 === 1) {
        out[count++] = idx
      }
    }
  }
  return count
}

export function pickRandom(arr: MoveIndex[], count: number): MoveIndex {
  return arr[Math.floor(Math.random() * count)]
}