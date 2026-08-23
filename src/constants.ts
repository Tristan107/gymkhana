import type { Player } from './types'

export const BOARD_SIZE = 11
export const MAX_TILES = 20
export const CELL_COUNT = 121

export const OPPONENT: Record<Player, Player> = {
  red: 'white',
  white: 'red',
}

export const PLAYER_COLORS: Record<Player, string> = {
  red: '#ff3344',
  white: '#ffffff',
}

export const CELL = {
  EMPTY: 0,
  RED: 1,
  WHITE: 2,
  FIXED_RED: 3,
  FIXED_WHITE: 4,
} as const

const ORTHOGONAL_DIRS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

function buildSpatialTables(): {
  indexToRC: [number, number][]
  rcToIndex: number[][]
  neighbors: [number, number, number, number][]
  fixedPegMask: Uint8Array
} {
  const indexToRC: [number, number][] = new Array(CELL_COUNT)
  const rcToIndex: number[][] = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(-1))
  const neighbors: [number, number, number, number][] = new Array(CELL_COUNT)
  const fixedPegMask = new Uint8Array(CELL_COUNT)

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const idx = row * BOARD_SIZE + col
      indexToRC[idx] = [row, col]
      rcToIndex[row][col] = idx

      if ((row + col) % 2 !== 0) {
        fixedPegMask[idx] = 1
      }

      const neighborIndices: number[] = []
      for (const [dr, dc] of ORTHOGONAL_DIRS) {
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          neighborIndices.push(nr * BOARD_SIZE + nc)
        } else {
          neighborIndices.push(-1)
        }
      }
      neighbors[idx] = [neighborIndices[0], neighborIndices[1], neighborIndices[2], neighborIndices[3]]
    }
  }

  return { indexToRC, rcToIndex, neighbors, fixedPegMask }
}

interface EdgeTables {
  red: number[]
  white: number[]
  redStart: number[]
  whiteStart: number[]
  redFixed: number[]
  whiteFixed: number[]
  redStartFixed: number[]
  whiteStartFixed: number[]
}

function classifyEdges(
  row: number,
  col: number,
  idx: number,
  isFixed: boolean,
  isCorner: boolean,
  edges: EdgeTables
): void {
  if (isCorner) return
  const checks: [boolean, number[]][] = [
    [row === BOARD_SIZE - 1, isFixed ? edges.redFixed : edges.red],
    [col === BOARD_SIZE - 1, isFixed ? edges.whiteFixed : edges.white],
    [row === 0, isFixed ? edges.redStartFixed : edges.redStart],
    [col === 0, isFixed ? edges.whiteStartFixed : edges.whiteStart],
  ]
  for (const [cond, arr] of checks) {
    if (cond) arr.push(idx)
  }
}

function markPlayable(
  playableRed: Uint8Array,
  playableWhite: Uint8Array,
  idx: number,
  row: number,
  col: number,
  isFixed: boolean,
  isCorner: boolean
): void {
  if (isFixed || isCorner) return
  if (col !== 0 && col !== BOARD_SIZE - 1) playableRed[idx] = 1
  if (row !== 0 && row !== BOARD_SIZE - 1) playableWhite[idx] = 1
}

function markOpening(
  openingRed: Uint8Array,
  openingWhite: Uint8Array,
  idx: number,
  row: number,
  col: number,
  isFixed: boolean
): void {
  if (isFixed) return
  if ((row === 1 || row === BOARD_SIZE - 2) && col % 2 === 1) openingRed[idx] = 1
  if ((col === 1 || col === BOARD_SIZE - 2) && row % 2 === 1) openingWhite[idx] = 1
}

function buildPlayabilityAndEdgeTables(): {
  playableRed: Uint8Array
  playableWhite: Uint8Array
  openingRed: Uint8Array
  openingWhite: Uint8Array
  edgeRed: Uint16Array
  edgeWhite: Uint16Array
  edgeRedStart: Uint16Array
  edgeWhiteStart: Uint16Array
  edgeRedFixed: Uint16Array
  edgeWhiteFixed: Uint16Array
  edgeRedStartFixed: Uint16Array
  edgeWhiteStartFixed: Uint16Array
} {
  const playableRed = new Uint8Array(CELL_COUNT)
  const playableWhite = new Uint8Array(CELL_COUNT)
  const openingRed = new Uint8Array(CELL_COUNT)
  const openingWhite = new Uint8Array(CELL_COUNT)
  const edges: EdgeTables = {
    red: [], white: [], redStart: [], whiteStart: [],
    redFixed: [], whiteFixed: [], redStartFixed: [], whiteStartFixed: [],
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const idx = row * BOARD_SIZE + col
      const isFixed = (row + col) % 2 !== 0
      const isCorner = (row === 0 || row === BOARD_SIZE - 1) && (col === 0 || col === BOARD_SIZE - 1)

      markPlayable(playableRed, playableWhite, idx, row, col, isFixed, isCorner)
      classifyEdges(row, col, idx, isFixed, isCorner, edges)
      markOpening(openingRed, openingWhite, idx, row, col, isFixed)
    }
  }

  return {
    playableRed, playableWhite, openingRed, openingWhite,
    edgeRed: new Uint16Array(edges.red),
    edgeWhite: new Uint16Array(edges.white),
    edgeRedStart: new Uint16Array(edges.redStart),
    edgeWhiteStart: new Uint16Array(edges.whiteStart),
    edgeRedFixed: new Uint16Array(edges.redFixed),
    edgeWhiteFixed: new Uint16Array(edges.whiteFixed),
    edgeRedStartFixed: new Uint16Array(edges.redStartFixed),
    edgeWhiteStartFixed: new Uint16Array(edges.whiteStartFixed),
  }
}

function generateZobrist(): {
  keys: [Uint32Array, Uint32Array, Uint32Array, Uint32Array]
  turn: [number, number]
} {
  const keys: [Uint32Array, Uint32Array, Uint32Array, Uint32Array] = [
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
  ]
  let seed = 0x9e3779b9
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < CELL_COUNT; j++) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      keys[i][j] = seed
    }
  }
  const turn: [number, number] = [
    ((seed * 1664525 + 1013904223) >>> 0),
    ((seed * 1664525 + 1013904223) >>> 0),
  ]
  return { keys, turn }
}

function initLookupTables() {
  const spatial = buildSpatialTables()
  const edgeTables = buildPlayabilityAndEdgeTables()
  const zobrist = generateZobrist()

  return {
    INDEX_TO_RC: spatial.indexToRC as readonly [number, number][],
    RC_TO_INDEX: spatial.rcToIndex,
    NEIGHBORS: spatial.neighbors as readonly (readonly [number, number, number, number])[],
    FIXED_PEG_MASK: spatial.fixedPegMask as Readonly<Uint8Array>,
    PLAYABLE_MASK_RED: edgeTables.playableRed as Readonly<Uint8Array>,
    PLAYABLE_MASK_WHITE: edgeTables.playableWhite as Readonly<Uint8Array>,
    EDGE_INDICES_RED: edgeTables.edgeRed as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE: edgeTables.edgeWhite as Readonly<Uint16Array>,
    EDGE_INDICES_RED_START: edgeTables.edgeRedStart as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_START: edgeTables.edgeWhiteStart as Readonly<Uint16Array>,
    EDGE_INDICES_RED_FIXED: edgeTables.edgeRedFixed as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_FIXED: edgeTables.edgeWhiteFixed as Readonly<Uint16Array>,
    EDGE_INDICES_RED_START_FIXED: edgeTables.edgeRedStartFixed as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_START_FIXED: edgeTables.edgeWhiteStartFixed as Readonly<Uint16Array>,
    OPENING_MASK_RED: edgeTables.openingRed as Readonly<Uint8Array>,
    OPENING_MASK_WHITE: edgeTables.openingWhite as Readonly<Uint8Array>,
    ZOBRIST_KEYS: zobrist.keys as readonly [Uint32Array, Uint32Array, Uint32Array, Uint32Array],
    ZOBRIST_TURN: zobrist.turn,
  }
}

const tables = initLookupTables()

export const INDEX_TO_RC = tables.INDEX_TO_RC
export const RC_TO_INDEX = tables.RC_TO_INDEX
export const NEIGHBORS = tables.NEIGHBORS
export const FIXED_PEG_MASK = tables.FIXED_PEG_MASK
export const PLAYABLE_MASK_RED = tables.PLAYABLE_MASK_RED
export const PLAYABLE_MASK_WHITE = tables.PLAYABLE_MASK_WHITE
export const EDGE_INDICES_RED = tables.EDGE_INDICES_RED
export const EDGE_INDICES_WHITE = tables.EDGE_INDICES_WHITE
export const EDGE_INDICES_RED_START = tables.EDGE_INDICES_RED_START
export const EDGE_INDICES_WHITE_START = tables.EDGE_INDICES_WHITE_START
export const EDGE_INDICES_RED_FIXED = tables.EDGE_INDICES_RED_FIXED
export const EDGE_INDICES_WHITE_FIXED = tables.EDGE_INDICES_WHITE_FIXED
export const EDGE_INDICES_RED_START_FIXED = tables.EDGE_INDICES_RED_START_FIXED
export const EDGE_INDICES_WHITE_START_FIXED = tables.EDGE_INDICES_WHITE_START_FIXED
export const OPENING_MASK_RED = tables.OPENING_MASK_RED
export const OPENING_MASK_WHITE = tables.OPENING_MASK_WHITE
export const ZOBRIST_KEYS = tables.ZOBRIST_KEYS
export const ZOBRIST_TURN = tables.ZOBRIST_TURN
