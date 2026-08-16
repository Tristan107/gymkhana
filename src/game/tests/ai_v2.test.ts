import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from '../../constants'
import type { Board, CellValue, Player } from '../../types'
import { createBoard } from '../logic'
import { chooseMove } from '../ai_v2'
import type { Move } from '../ai_v2'

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

describe('ai_v2 chooseMove', () => {
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

  it('expands strategically (red plays F4)', () => {
    expectMove(
      boardWith([
        ['F6', 'red'],
        ['H4', 'white'],
      ]),
      'red',
      ['F4']
    )
  })

  it('expands strategically (red plays C9, D8 or E9)', () => {
    expectMove(
      boardWith([
        ['D10', 'red'],
        ['H6', 'white'],
      ]),
      'red',
      ['C9', 'D8', 'E9']
    )
  })
})
