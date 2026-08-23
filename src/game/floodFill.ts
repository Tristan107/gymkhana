import { BOARD_SIZE, CELL_COUNT, CELL, NEIGHBORS } from '../constants'
import type { FlatBoard, PlayerCode, FixedCode, MoveIndex } from '../types'

export interface FloodConfig {
  blockedBy: PlayerCode | FixedCode | null
  targetColor?: PlayerCode
  stopAtEdge?: boolean
  maxDepth?: number
}

export interface Component {
  cells: MoveIndex[]
  liberties: MoveIndex[]
  touchesEdge: boolean
  libertyCount: number
  playableLibertyCount: number
  boxable: boolean
}

export interface FloodResult {
  visitedCount: number
  touchesEdge: boolean
  liberties: MoveIndex[]
  libertyCount: number
  components: Component[]
  componentCount: number
}

function isOnEdge(idx: MoveIndex): boolean {
  const row = Math.floor(idx / BOARD_SIZE)
  const col = idx % BOARD_SIZE
  return row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1
}

export function isPlayableFor(board: FlatBoard, idx: number, player: PlayerCode): boolean {
  const cell = board[idx]
  if (cell !== CELL.EMPTY) return false
  const row = Math.floor(idx / BOARD_SIZE)
  const col = idx % BOARD_SIZE
  if (player === 1) return col !== 0 && col !== BOARD_SIZE - 1
  return row !== 0 && row !== BOARD_SIZE - 1
}

export function floodFill(
  board: FlatBoard,
  startIndices: MoveIndex[],
  config: FloodConfig,
  visited: Uint8Array,
  queue: Uint16Array,
  outLiberties: MoveIndex[],
  outComponents: Component[]
): FloodResult {
  const { blockedBy, targetColor, stopAtEdge, maxDepth } = config
  const gen = Date.now() & 0xff
  let head = 0
  let tail = 0
  let visitedCount = 0
  let touchesEdge = false
  let libertyCount = 0
  let componentCount = 0

  for (const start of startIndices) {
    if (visited[start] === gen) continue
    if (targetColor !== undefined && board[start] !== targetColor) continue

    const componentCells: MoveIndex[] = []
    const componentLiberties: MoveIndex[] = []
    let componentTouchesEdge = false
    let componentLibertyCount = 0
    let componentPlayableLibertyCount = 0
    let componentBoxable = true

    visited[start] = gen
    queue[tail++] = start
    visitedCount++

    while (head < tail) {
      const idx = queue[head++]
      componentCells.push(idx)

      if (stopAtEdge && isOnEdge(idx)) {
        componentTouchesEdge = true
        touchesEdge = true
        continue
      }

      const neighbors = NEIGHBORS[idx]
      for (let d = 0; d < 4; d++) {
        const n = neighbors[d]
        if (n === -1) continue

        const cell = board[n]
        if (cell === CELL.EMPTY) {
          if (visited[n] !== gen) {
            visited[n] = gen
            if (isPlayableFor(board, n, targetColor ?? 1)) {
              componentPlayableLibertyCount++
            }
            componentLibertyCount++
            componentLiberties.push(n)
            libertyCount++
            if (libertyCount < outLiberties.length) {
              outLiberties[libertyCount - 1] = n
            }
          }
        } else if (blockedBy === null || cell !== blockedBy) {
          if (targetColor === undefined || cell === targetColor) {
            if (visited[n] !== gen) {
              visited[n] = gen
              queue[tail++] = n
              visitedCount++
            }
          }
        } else {
          componentBoxable = false
        }
      }

      if (maxDepth !== undefined && componentCells.length >= maxDepth) break
    }

    if (componentCells.length > 0) {
      const comp: Component = {
        cells: componentCells,
        liberties: componentLiberties,
        touchesEdge: componentTouchesEdge,
        libertyCount: componentLibertyCount,
        playableLibertyCount: componentPlayableLibertyCount,
        boxable: componentBoxable && !componentTouchesEdge,
      }
      outComponents[componentCount++] = comp
    }
  }

  return {
    visitedCount,
    touchesEdge,
    liberties: outLiberties,
    libertyCount,
    components: outComponents,
    componentCount,
  }
}

export function countLiberties(board: FlatBoard, componentStart: MoveIndex, player: PlayerCode, visited: Uint8Array): number {
  const gen = Date.now() & 0xff
  const queue = new Uint16Array(CELL_COUNT)
  let head = 0
  let tail = 0
  let count = 0

  visited[componentStart] = gen
  queue[tail++] = componentStart

  while (head < tail) {
    const idx = queue[head++]
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1) continue
      const cell = board[n]
      if (cell === CELL.EMPTY) {
        if (visited[n] !== gen) {
          visited[n] = gen
          if (isPlayableFor(board, n, player)) count++
        }
      } else if (cell === player) {
        if (visited[n] !== gen) {
          visited[n] = gen
          queue[tail++] = n
        }
      }
    }
  }
  return count
}

export function componentTouchesEdge(board: FlatBoard, componentStart: MoveIndex, player: PlayerCode, visited: Uint8Array): boolean {
  const gen = Date.now() & 0xff
  const queue = new Uint16Array(CELL_COUNT)
  let head = 0
  let tail = 0

  visited[componentStart] = gen
  queue[tail++] = componentStart

  while (head < tail) {
    const idx = queue[head++]
    if (isOnEdge(idx)) return true
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1) continue
      if (board[n] === player && visited[n] !== gen) {
        visited[n] = gen
        queue[tail++] = n
      }
    }
  }
  return false
}

export function getComponents(board: FlatBoard, player: PlayerCode, visited: Uint8Array, outComponents: Component[]): number {
  const gen = Date.now() & 0xff
  const queue = new Uint16Array(CELL_COUNT)
  let componentCount = 0

  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== player || visited[i] === gen) continue

    const componentCells: MoveIndex[] = []
    const componentLiberties: MoveIndex[] = []
    let componentTouchesEdge = false
    let componentLibertyCount = 0
    let componentPlayableLibertyCount = 0
    let componentBoxable = true

    let head = 0
    let tail = 0
    visited[i] = gen
    queue[tail++] = i

    while (head < tail) {
      const idx = queue[head++]
      componentCells.push(idx)

      if (isOnEdge(idx)) {
        componentTouchesEdge = true
        componentBoxable = false
      }

      const neighbors = NEIGHBORS[idx]
      for (let d = 0; d < 4; d++) {
        const n = neighbors[d]
        if (n === -1) continue

        const cell = board[n]
        if (cell === CELL.EMPTY) {
          if (visited[n] !== gen) {
            visited[n] = gen
            componentLibertyCount++
            componentLiberties.push(n)
            if (isPlayableFor(board, n, player)) {
              componentPlayableLibertyCount++
            }
          }
        } else if (cell === player) {
          if (visited[n] !== gen) {
            visited[n] = gen
            queue[tail++] = n
          }
        } else {
          componentBoxable = false
        }
      }
    }

    if (componentCells.length > 0) {
      outComponents[componentCount++] = {
        cells: componentCells,
        liberties: componentLiberties,
        touchesEdge: componentTouchesEdge,
        libertyCount: componentLibertyCount,
        playableLibertyCount: componentPlayableLibertyCount,
        boxable: componentBoxable && !componentTouchesEdge,
      }
    }
  }
  return componentCount
}