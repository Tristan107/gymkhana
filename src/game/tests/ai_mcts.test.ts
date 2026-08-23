import { beforeEach, describe, expect, it } from 'vitest'
import { BOARD_SIZE } from '../../constants'
import type { Board, CellValue, Player } from '../../types'
import { createBoard } from '../logic'
import { chooseMove, configureMCTS } from '../ai_mcts'
import type { Move } from '../ai_mcts'

const COLS = 'ABCDEFGHIJK'

function idx(coord: string): { row: number; col: number } {
  const col = COLS.indexOf(coord[0].toUpperCase())
  const displayRow = parseInt(coord.slice(1), 10)
  return { row: BOARD_SIZE - displayRow, col }
}

type PlacedToken = [coord: string, value: CellValue]

function boardWith(placedTokens: PlacedToken[]): Board {
  const board = createBoard()
  for (const [coord, value] of placedTokens) {
    const { row, col } = idx(coord)
    board[row][col] = value
  }
  return board
}

function tilesPlacedFor(board: Board): Record<Player, number> {
  let red = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === 'red') red++
      else if (cell === 'white') white++
    }
  }
  return { red: red - 30, white: white - 30 }
}

function expectMove(board: Board, player: Player, accepted: string[]): void {
  const placed = tilesPlacedFor(board)
  const move = chooseMove(board, player, placed, false)
  expect(move).not.toBeNull()
  const expected: Move[] = accepted.map(idx)
  expect(move).toBeDefined()
  expect(expected).toContainEqual(move)
}

describe('ai_mcts chooseMove', () => {
  beforeEach(() => {
    configureMCTS({ maxIterations: 5000, maxTimeMs: Number.POSITIVE_INFINITY })
  })

  it('opening move for red is restricted to rows 10 and 2 on cols B,D,F,H,J', () => {
    const placed = tilesPlacedFor(createBoard())
    const allowed = ['B10', 'D10', 'F10', 'H10', 'J10', 'B2', 'D2', 'F2', 'H2', 'J2'].map(idx)
    for (let i = 0; i < 50; i++) {
      const move = chooseMove(createBoard(), 'red', placed, false)
      expect(move).not.toBeNull()
      expect(allowed).toContainEqual(move)
    }
  })

  it('opening move for white is restricted to cols B and J on rows 2,4,6,8,10', () => {
    const placed = tilesPlacedFor(createBoard())
    const allowed = ['B2', 'B4', 'B6', 'B8', 'B10', 'J2', 'J4', 'J6', 'J8', 'J10'].map(idx)
    for (let i = 0; i < 50; i++) {
      const move = chooseMove(createBoard(), 'white', placed, false)
      expect(move).not.toBeNull()
      expect(allowed).toContainEqual(move)
    }
  })

  it('wins immediately by connection (red plays F10 or H10)', () => {
    expectMove(
      boardWith([
        ['G9', 'red'],
        ['F8', 'red'],
        ['C7', 'white'],
        ['B6', 'white'],
        ['F6', 'red'],
        ['J6', 'white'],
        ['E5', 'red'],
        ['I5', 'white'],
        ['D4', 'red'],
        ['H4', 'white'],
        ['J4', 'white'],
        ['D2', 'red'],
      ]),
      'red',
      ['F10', 'H10']
    )
  })

  it('wins immediately by box-in (red plays G11)', () => {
    expectMove(
      boardWith([
        ['F10', 'red'],
        ['H10', 'red'],
        ['G9', 'red'],
        ['E7', 'white'],
        ['D4', 'white'],
        ['H4', 'white'],
      ]),
      'red',
      ['G11']
    )
  })

  it('blocks an immediate opponent win (white plays H2)', () => {
    expectMove(
      boardWith([
        ['F10', 'red'],
        ['G9', 'red'],
        ['F8', 'white'],
        ['H8', 'red'],
        ['E7', 'white'],
        ['D6', 'white'],
        ['H6', 'red'],
        ['H4', 'red'],
        ['C3', 'white'],
      ]),
      'white',
      ['H2']
    )
  })

  it('blocks an immediate opponent win (white plays E9)', () => {
    expectMove(
      boardWith([
        ['G9', 'red'],
        ['D8', 'red'],
        ['F8', 'white'],
        ['H8', 'red'],
        ['J8', 'red'],
        ['E7', 'white'],
        ['G7', 'red'],
        ['D6', 'red'],
        ['F6', 'red'],
        ['E5', 'red'],
        ['K5', 'white'],
        ['B4', 'white'],
        ['G3', 'white'],
        ['I3', 'white'],
        ['D2', 'white'],
      ]),
      'white',
      ['E9']
    )
  })

  it('takes a forced win near the edge (red plays F10)', () => {
    expectMove(
      boardWith([
        ['D10', 'red'],
        ['E9', 'red'],
        ['G5', 'white'],
        ['D4', 'white'],
      ]),
      'red',
      ['F10']
    )
  })

  it('takes a forced win near the edge (red plays E1 or G1)', () => {
    expectMove(
      boardWith([
        ['E5', 'red'],
        ['I5', 'white'],
        ['D6', 'white'],
        ['F6', 'white'],
        ['D4', 'white'],
        ['F4', 'red'],
        ['H4', 'white'],
        ['E3', 'red'],
        ['G3', 'red'],
        ['D2', 'red'],
        ['F2', 'white'],
        ['H2', 'red'],
      ]),
      'red',
      ['E1', 'G1']
    )
  })

  it('defends against a forced win near the edge (white plays F10)', () => {
    expectMove(
      boardWith([
        ['D10', 'red'],
        ['E9', 'red'],
        ['G5', 'white'],
      ]),
      'white',
      ['F10']
    )
  })

  it('creates a double-threat (red plays F8)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['J8', 'white'],
        ['F6', 'red'],
        ['H6', 'white'],
        ['I5', 'white'],
        ['F4', 'red'],
        ['I3', 'white'],
        ['F2', 'red'],
      ]),
      'red',
      ['F8']
    )
  })

  it('creates a double-threat (red plays E7)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['F8', 'red'],
        ['F6', 'red'],
        ['J6', 'white'],
        ['E5', 'red'],
        ['H4', 'white'],
        ['G3', 'white'],
        ['D2', 'white'],
      ]),
      'red',
      ['E7']
    )
  })

  it('creates a double-threat (red plays E9)', () => {
    expectMove(
      boardWith([
        ['D10', 'red'],
        ['D8', 'red'],
        ['E7', 'red'],
        ['H4', 'white'],
        ['D2', 'white'],
        ['J2', 'white'],
      ]),
      'red',
      ['E9']
    )
  })

  it('creates a double-threat (red plays F10)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['G9', 'red'],
        ['D4', 'white'],
        ['G3', 'white'],
      ]),
      'red',
      ['F10']
    )
  })

  it('blocks an opponent double-threat (white plays F8)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['J8', 'white'],
        ['F6', 'red'],
        ['H6', 'white'],
        ['I5', 'white'],
        ['F4', 'red'],
        ['F2', 'red'],
      ]),
      'white',
      ['F8']
    )
  })

  it('blocks an opponent double-threat (white plays E7, D6 or D8)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['F8', 'red'],
        ['F6', 'red'],
        ['I6', 'white'],
        ['E5', 'red'],
        ['H4', 'white'],
        ['G3', 'white'],
        ['D2', 'white'],
      ]),
      'white',
      ['E7', 'D6', 'D8']
    )
  })

  it('blocks an opponent double-threat (white plays E9, F8 or F10)', () => {
    expectMove(
      boardWith([
        ['D10', 'red'],
        ['D8', 'red'],
        ['E7', 'red'],
        ['D2', 'white'],
        ['J2', 'white'],
      ]),
      'white',
      ['E9', 'F8', 'F10']
    )
  })

  it('blocks an opponent double-threat (white plays F10, H10 or D10)', () => {
    expectMove(
      boardWith([
        ['E9', 'red'],
        ['G9', 'red'],
        ['G3', 'white'],
      ]),
      'white',
      ['F10', 'H10', 'D10']
    )
  })

  it('is deterministic for repeated calls with fixed seed', () => {
    const board = boardWith([
      ['F6', 'red'],
      ['H4', 'white'],
    ])
    const placed = tilesPlacedFor(board)
    configureMCTS({ maxIterations: 2000, maxTimeMs: Number.POSITIVE_INFINITY })
    const first = chooseMove(board, 'red', placed, false)
    const second = chooseMove(board, 'red', placed, false)
    expect(first).toEqual(second)
  })

  it('respects the time budget in timed mode', () => {
    const board = boardWith([
      ['F6', 'red'],
      ['H4', 'white'],
    ])
    const placed = tilesPlacedFor(board)
    configureMCTS({ maxIterations: Number.POSITIVE_INFINITY, maxTimeMs: 300 })
    const start = Date.now()
    const move = chooseMove(board, 'red', placed, false)
    const elapsed = Date.now() - start
    expect(move).not.toBeNull()
    expect(elapsed).toBeLessThan(2000)
  })
})
