import { BOARD_SIZE, CELL_COUNT, NEIGHBORS, EDGE_INDICES_RED, EDGE_INDICES_WHITE } from '../constants'
import type { FlatBoard, PlayerCode } from '../types'

export class UnionFind {
  parent: Uint16Array
  rank: Uint8Array

  constructor() {
    this.parent = new Uint16Array(CELL_COUNT)
    this.rank = new Uint8Array(CELL_COUNT)
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

const VISITED = new Uint8Array(CELL_COUNT)
const QUEUE = new Uint16Array(CELL_COUNT)
let VISIT_GEN = 1

export function checkConnectionWin(board: FlatBoard, player: PlayerCode): boolean {
  const uf = new UnionFind()
  const playerCode = player

  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== playerCode) continue
    const neighbors = NEIGHBORS[i]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n !== -1 && board[n] === playerCode) {
        uf.union(i, n)
      }
    }
  }

  const startEdges = player === 1 ? EDGE_INDICES_RED : EDGE_INDICES_WHITE
  const endEdges = player === 1 ? EDGE_INDICES_RED : EDGE_INDICES_WHITE

  for (let i = 0; i < startEdges.length; i++) {
    const s = startEdges[i]
    if (board[s] !== playerCode) continue
    const rootS = uf.find(s)
    for (let j = 0; j < endEdges.length; j++) {
      const e = endEdges[j]
      if (board[e] !== playerCode) continue
      if (uf.find(e) === rootS) return true
    }
  }
  return false
}

export function checkSurroundWin(board: FlatBoard, player: PlayerCode): boolean {
  const opponent = player === 1 ? 2 : 1

  VISIT_GEN++
  if (VISIT_GEN === 255) {
    VISITED.fill(0)
    VISIT_GEN = 1
  }
  const gen = VISIT_GEN

  let head = 0
  let tail = 0

  for (let i = 0; i < CELL_COUNT; i++) {
    const row = Math.floor(i / BOARD_SIZE)
    const col = i % BOARD_SIZE
    if (row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1) {
      if (board[i] !== player) {
        VISITED[i] = gen
        QUEUE[tail++] = i
      }
    }
  }

  while (head < tail) {
    const idx = QUEUE[head++]
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n !== -1 && VISITED[n] !== gen && board[n] !== player) {
        VISITED[n] = gen
        QUEUE[tail++] = n
      }
    }
  }

  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] === opponent && VISITED[i] !== gen) return true
  }
  return false
}

export function checkSurroundWinWithVisited(
  board: FlatBoard,
  player: PlayerCode,
  visited: Uint8Array,
  queue: Uint16Array,
  gen: number
): boolean {
  const opponent = player === 1 ? 2 : 1

  let head = 0
  let tail = 0

  for (let i = 0; i < CELL_COUNT; i++) {
    const row = Math.floor(i / BOARD_SIZE)
    const col = i % BOARD_SIZE
    if (row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1) {
      if (board[i] !== player) {
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
      if (n !== -1 && visited[n] !== gen && board[n] !== player) {
        visited[n] = gen
        queue[tail++] = n
      }
    }
  }

  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] === opponent && visited[i] !== gen) return true
  }
  return false
}