import { describe, expect, it } from 'vitest'
import type { Board, CellValue } from '../../types'
import { createBoard, isCellPlayable } from '../logic'
import { chooseMove } from '../lean_ai'

type Override = [row: number, col: number, value: CellValue]

function boardWith(overrides: Override[]): Board {
  const board = createBoard()
  for (const [row, col, value] of overrides) {
    board[row][col] = value
  }
  return board
}

const corners: Array<[number, number]> = [
  [0, 0],
  [0, 10],
  [10, 0],
  [10, 10],
]

function expectLegalMove(board: Board, player: 'red' | 'white'): void {
  const move = chooseMove(board, player, { red: 1, white: 1 }, false)
  expect(move).not.toBeNull()
  if (move === null) return
  expect(board[move.row][move.col]).toBeNull()
  expect(isCellPlayable(board, move.row, move.col, player, false)).toBe(true)
  for (const [r, c] of corners) {
    expect(move).not.toEqual({ row: r, col: c })
  }
}

describe('chooseMove', () => {
  it('returns a legal non-corner move on the starting board', () => {
    const board = createBoard()
    expectLegalMove(board, 'red')
    expectLegalMove(board, 'white')
  })

  it('returns a legal non-corner move on the AI opening turn', () => {
    const board = createBoard()
    for (const player of ['red', 'white'] as const) {
      const move = chooseMove(board, player, { red: 0, white: 0 }, false)
      expect(move).not.toBeNull()
      if (move === null) continue
      expect(board[move.row][move.col]).toBeNull()
      expect(isCellPlayable(board, move.row, move.col, player, false)).toBe(true)
      for (const [r, c] of corners) {
        expect(move).not.toEqual({ row: r, col: c })
      }
    }
  })

  it('finds the winning move on the board edge', () => {
    // Red boxes the white token at (1,2); the last side to close is the top edge cell (0,2).
    const board = boardWith([
      [2, 2, 'red'],
      [1, 1, 'red'],
      [1, 3, 'red'],
    ])
    const move = chooseMove(board, 'red', { red: 3, white: 0 }, false)
    expect(move).toEqual({ row: 0, col: 2 })
  })

  it('prefers a winning move over other legal moves', () => {
    // Column 3 is red from row 0 to row 8; placing (9,3) completes the connection.
    const board = boardWith([
      [1, 3, 'red'],
      [3, 3, 'red'],
      [5, 3, 'red'],
      [7, 3, 'red'],
    ])
    const move = chooseMove(board, 'red', { red: 4, white: 0 }, false)
    expect(move).toEqual({ row: 9, col: 3 })
  })

  it('takes its own immediate win before blocking an opponent win', () => {
    // Red can box the white token at (1,2) with (0,2), while white can complete
    // row 9 with (9,9). Winning takes priority over blocking.
    const board = boardWith([
      [2, 2, 'red'],
      [1, 1, 'red'],
      [1, 3, 'red'],
      [1, 2, 'white'],
      [9, 1, 'white'],
      [9, 3, 'white'],
      [9, 5, 'white'],
      [9, 7, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 3, white: 4 }, false)
    expect(move).toEqual({ row: 0, col: 2 })
  })

  it('blocks the opponent immediate win (Step 2)', () => {
    // White has placed (3,1),(3,3),(3,5),(3,7); playing (3,9) would complete
    // row 3 for a connection win. Red must play (3,9) itself.
    const board = boardWith([
      [1, 1, 'red'],
      [1, 3, 'red'],
      [3, 1, 'white'],
      [3, 3, 'white'],
      [3, 5, 'white'],
      [3, 7, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 2, white: 4 }, false)
    expect(move).toEqual({ row: 3, col: 9 })
  })

  it('creates a double-threat (Step 3)', () => {
    // Red at (0,2),(2,2) and (0,4),(2,4) seal a pocket around the white tokens
    // (1,2) and (1,4). Playing (1,1) leaves two winning moves for next turn —
    // (1,3) or (1,5) both trap the pocket — so it is a double-threat.
    const board = boardWith([
      [0, 2, 'red'],
      [2, 2, 'red'],
      [0, 4, 'red'],
      [2, 4, 'red'],
      [1, 2, 'white'],
      [1, 4, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 4, white: 2 }, false)
    expect(move).toEqual({ row: 1, col: 1 })
  })

  it('blocks an opponent double-threat (Step 4)', () => {
    // White at (2,2),(2,4),(4,2),(4,4) can fork by playing (3,3), which leaves
    // the winning moves (1,3) and (5,3) to box in the red pegs (2,3),(4,3).
    // Red blocks the fork by playing the key intersecting space (3,3) itself.
    const board = boardWith([
      [8, 8, 'red'],
      [2, 2, 'white'],
      [2, 4, 'white'],
      [4, 2, 'white'],
      [4, 4, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 1, white: 4 }, false)
    expect(move).toEqual({ row: 3, col: 3 })
  })

  it('blocks a fork that traps two chains at a single playable liberty (Step 4)', () => {
    // Red's chain D3-H3 (grid 8,3..8,7) sits directly above the fixed white
    // pegs E2 (9,4) and G2 (9,6). If red plays F2 (9,5), E2's only playable
    // liberty is D2 and G2's is H2; E1 and G1 (grid row 10) are unplayable for
    // white but playable for red, so red can then box one of the chains.
    // White must defuse the fork now with F2, D2, or H2.
    const board = boardWith([
      [3, 1, 'white'],
      [8, 4, 'red'],
      [8, 6, 'red'],
    ])
    const move = chooseMove(board, 'white', { red: 5, white: 1 }, false)
    expect([
      { row: 9, col: 5 },
      { row: 9, col: 3 },
      { row: 9, col: 7 },
    ]).toContainEqual(move)
  })

  it('creates a double-threat by trapping two opponent chains (Step 3)', () => {
    // Red's chain D3-H3 (grid 8,3..8,7) sits above the fixed white pegs E2
    // (9,4) and G2 (9,6). Playing F2 (9,5) is the critical shared-liberty
    // cell: it leaves both chains with exactly one playable liberty (D2/H2)
    // while E1/G1 stay unplayable for white, so red wins by boxing one.
    const board = boardWith([
      [8, 4, 'red'],
      [8, 6, 'red'],
    ])
    const move = chooseMove(board, 'red', { red: 2, white: 0 }, false)
    expect(move).toEqual({ row: 9, col: 5 })
  })

  it('defends a single-liberty chain (Step 5)', () => {
    // The isolated red peg (0,1) has exactly one playable liberty left at (0,2);
    // its other neighbor (1,1) is occupied by white. Red defends it by playing
    // (0,2) before the chain can be sealed off.
    const board = boardWith([
      [8, 8, 'red'],
      [1, 1, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 1, white: 1 }, false)
    expect(move).toEqual({ row: 0, col: 2 })
  })

  it('prefers the fork-block that also rescues an endangered chain (Step 4)', () => {
    // F3 (grid 8,5) is a fixed red peg, so white's chain E2-F2-G2 (grid 9,4..9,6)
    // already has exactly one playable liberty: D2. Red threatens a fork by
    // playing I3 or J2 (grid 8,8 or 9,9): either leaves the white peg I2 (9,8)
    // with a single playable liberty as well. Occupying the fork cell (8,8)
    // defuses the fork but strands chain E2-F2-G2, so white instead plays D2,
    // which neutralizes the fork and grows the chain to two liberties.
    const board = boardWith([
      [2, 6, 'white'],
      [9, 5, 'white'],
      [8, 4, 'red'],
      [8, 6, 'red'],
      [9, 7, 'red'],
    ])
    const move = chooseMove(board, 'white', { red: 3, white: 2 }, false)
    expect(move).toEqual({ row: 9, col: 3 })
  })

  it('advances along the shortest path to victory (Step 6)', () => {
    // Column 5 is one gap from being connected top-to-bottom after (5,5) or
    // (9,5); both minimize the distance, so the tie-break is random.
    const board = boardWith([
      [1, 5, 'red'],
      [3, 5, 'red'],
      [7, 5, 'red'],
    ])
    const move = chooseMove(board, 'red', { red: 3, white: 0 }, false)
    expect([
      { row: 5, col: 5 },
      { row: 9, col: 5 },
    ]).toContainEqual(move)
  })

  it('cuts the opponent path while progressing to victory (Step 6)', () => {
    // White's only cheap horizontal path runs through (5,5): playing (5,5)
    // raises white's connection distance while (9,5) leaves it unchanged, so
    // the tie-break favors (5,5) — the move that both advances red's column
    // and blocks white's line. The red tokens near the edges (3,1),(3,9),
    // (7,1),(7,9) just merge the corner chains so Step 5 does not fire.
    const board = boardWith([
      [1, 5, 'red'],
      [3, 5, 'red'],
      [7, 5, 'red'],
      [3, 1, 'red'],
      [3, 9, 'red'],
      [7, 1, 'red'],
      [7, 9, 'red'],
      [5, 3, 'white'],
      [5, 7, 'white'],
    ])
    const move = chooseMove(board, 'red', { red: 7, white: 2 }, false)
    expect(move).toEqual({ row: 5, col: 5 })
  })

  it('returns null when no legal move exists', () => {
    const board = createBoard()
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if (board[r][c] === null) board[r][c] = 'white'
      }
    }
    expect(chooseMove(board, 'red', { red: 5, white: 5 }, false)).toBeNull()
  })
})
