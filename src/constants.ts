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

function initLookupTables() {
  const indexToRC: [number, number][] = new Array(CELL_COUNT)
  const rcToIndex: number[][] = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(-1))
  const neighbors: [number, number, number, number][] = new Array(CELL_COUNT)
  const fixedPegMask = new Uint8Array(CELL_COUNT)
  const playableMaskRed = new Uint8Array(CELL_COUNT)
  const playableMaskWhite = new Uint8Array(CELL_COUNT)
  const openingMaskRed = new Uint8Array(CELL_COUNT)
  const openingMaskWhite = new Uint8Array(CELL_COUNT)
  const edgeIndicesRed: number[] = []
  const edgeIndicesWhite: number[] = []
  const edgeIndicesRedStart: number[] = []
  const edgeIndicesWhiteStart: number[] = []
  const edgeIndicesRedFixed: number[] = []
  const edgeIndicesWhiteFixed: number[] = []
  const edgeIndicesRedStartFixed: number[] = []
  const edgeIndicesWhiteStartFixed: number[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const idx = row * BOARD_SIZE + col
      indexToRC[idx] = [row, col]
      rcToIndex[row][col] = idx

      const isFixed = (row + col) % 2 !== 0
      if (isFixed) {
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

      const isRedEdge = row === BOARD_SIZE - 1
      const isWhiteEdge = col === BOARD_SIZE - 1
      const isRedStartEdge = row === 0
      const isWhiteStartEdge = col === 0
      const isRedCorner = (row === 0 || row === BOARD_SIZE - 1) && (col === 0 || col === BOARD_SIZE - 1)
      const isWhiteCorner = isRedCorner

      if (!isFixed && !isRedCorner) {
        if (col !== 0 && col !== BOARD_SIZE - 1) {
          playableMaskRed[idx] = 1
        }
        if (row !== 0 && row !== BOARD_SIZE - 1) {
          playableMaskWhite[idx] = 1
        }
      }

      if (isRedEdge && !isRedCorner && !isFixed) {
        edgeIndicesRed.push(idx)
      }
      if (isWhiteEdge && !isWhiteCorner && !isFixed) {
        edgeIndicesWhite.push(idx)
      }
      if (isRedStartEdge && !isRedCorner && !isFixed) {
        edgeIndicesRedStart.push(idx)
      }
      if (isWhiteStartEdge && !isWhiteCorner && !isFixed) {
        edgeIndicesWhiteStart.push(idx)
      }
      if (isRedEdge && isFixed) {
        edgeIndicesRedFixed.push(idx)
      }
      if (isWhiteEdge && isFixed) {
        edgeIndicesWhiteFixed.push(idx)
      }
      if (isRedStartEdge && isFixed) {
        edgeIndicesRedStartFixed.push(idx)
      }
      if (isWhiteStartEdge && isFixed) {
        edgeIndicesWhiteStartFixed.push(idx)
      }

      if (!isFixed) {
        if (row === 1 || row === BOARD_SIZE - 2) {
          if (col % 2 === 1) {
            openingMaskRed[idx] = 1
          }
        }
        if (col === 1 || col === BOARD_SIZE - 2) {
          if (row % 2 === 1) {
            openingMaskWhite[idx] = 1
          }
        }
      }
    }
  }

  const zobristKeys: [Uint32Array, Uint32Array, Uint32Array, Uint32Array] = [
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
    new Uint32Array(CELL_COUNT),
  ]
  let seed = 0x9e3779b9
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < CELL_COUNT; j++) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      zobristKeys[i][j] = seed
    }
  }
  const zobristTurn: [number, number] = [
    ((seed * 1664525 + 1013904223) >>> 0),
    ((seed * 1664525 + 1013904223) >>> 0),
  ]

  return {
    INDEX_TO_RC: indexToRC as readonly [number, number][],
    RC_TO_INDEX: rcToIndex,
    NEIGHBORS: neighbors as readonly (readonly [number, number, number, number])[],
    FIXED_PEG_MASK: fixedPegMask as Readonly<Uint8Array>,
    PLAYABLE_MASK_RED: playableMaskRed as Readonly<Uint8Array>,
    PLAYABLE_MASK_WHITE: playableMaskWhite as Readonly<Uint8Array>,
    EDGE_INDICES_RED: new Uint16Array(edgeIndicesRed) as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE: new Uint16Array(edgeIndicesWhite) as Readonly<Uint16Array>,
    EDGE_INDICES_RED_START: new Uint16Array(edgeIndicesRedStart) as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_START: new Uint16Array(edgeIndicesWhiteStart) as Readonly<Uint16Array>,
    EDGE_INDICES_RED_FIXED: new Uint16Array(edgeIndicesRedFixed) as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_FIXED: new Uint16Array(edgeIndicesWhiteFixed) as Readonly<Uint16Array>,
    EDGE_INDICES_RED_START_FIXED: new Uint16Array(edgeIndicesRedStartFixed) as Readonly<Uint16Array>,
    EDGE_INDICES_WHITE_START_FIXED: new Uint16Array(edgeIndicesWhiteStartFixed) as Readonly<Uint16Array>,
    OPENING_MASK_RED: openingMaskRed as Readonly<Uint8Array>,
    OPENING_MASK_WHITE: openingMaskWhite as Readonly<Uint8Array>,
    ZOBRIST_KEYS: zobristKeys as readonly [Uint32Array, Uint32Array, Uint32Array, Uint32Array],
    ZOBRIST_TURN: zobristTurn,
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