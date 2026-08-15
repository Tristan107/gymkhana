import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from '../../constants'
import type { Board, CellValue, Player } from '../../types'
import { parseBoardText } from '../boardFile'
import type { ParsedGame } from '../boardFile'
import {
  checkConnectionWin,
  checkSurroundWin,
  createBoard,
  isCellPlayable,
  isFixedPeg,
} from '../logic'

const COL = 'ABCDEFGHIJK'

type Override = [square: string, value: CellValue]

function rc(square: string): [row: number, col: number] {
  const col = COL.indexOf(square[0])
  return [BOARD_SIZE - Number(square.slice(1)), col]
}

function setAt(board: Board, square: string, value: CellValue): void {
  const [row, col] = rc(square)
  board[row][col] = value
}

function cellAt(board: Board, square: string): CellValue {
  const [row, col] = rc(square)
  return board[row][col]
}

function boardWith(overrides: Override[]): Board {
  const board = createBoard()
  for (const [square, value] of overrides) setAt(board, square, value)
  return board
}

function emptyBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )
  return board
}

function canPlay(board: Board, square: string, player: Player, gameOver = false): boolean {
  const [row, col] = rc(square)
  return isCellPlayable(board, row, col, player, gameOver)
}

function parsed(text: string): ParsedGame {
  const result = parseBoardText(text)
  if (!result.ok) throw new Error(result.error)
  return result.game
}

function pocketBoard(): Board {
  return boardWith([
    ['B7', 'red'],
    ['C7', 'red'],
    ['D7', 'red'],
    ['E7', 'red'],
    ['C6', 'white'],
    ['D6', 'white'],
    ['E6', 'red'],
    ['B5', 'red'],
    ['C5', 'red'],
    ['D5', 'red'],
    ['E5', 'red'],
  ])
}

const EX1_WHITE_BOX_IN = `
11   R . R . R . R . R
10 W . W . W W W W W . W
 9 . R R R W R . R W R .
 8 W . W . W R W . W . W
 7 . R R R W R R R W R .
 6 W . W R W . W W W . W
 5 . R . R W R W R . R .
 4 W R W . W W W . W R W
 3 . R R R . R R R . R .
 2 W . W . W . W . W R W
 1   R . R . R . R . R
  A B C D E F G H I J K`

const EX2_WHITE_CONNECTION = `
11   R . R . R . R . R
10 W . W W W W W . W . W
 9 . R W R . R W R . R .
 8 W . W . W . W W W R W
 7 . R W R R R . R W R .
 6 W W W . W . W . W . W
 5 . R R R . R R R W R .
 4 W . W R W . W . W W W
 3 . R R R R R . R R R .
 2 W . W . W R W R W . W
 1   R . R . R . R . R
  A B C D E F G H I J K`

const EX3_RED_CONNECTION = `
11   R . R . R . R . R
10 W . W . W R W . W . W
 9 . R . R R R . R W R .
 8 W . W R W . W . W W W
 7 . R R R . R . R W R .
 6 W R W . W . W W W . W
 5 . R . R . R . R . R .
 4 W R W . W . W W W W W
 3 . R R R . R . R W R .
 2 W . W R W . W . W . W
 1   R . R . R . R . R
  A B C D E F G H I J K`

const EX4_RED_NOT_YET = `
11   R . R . R . R . R
10 W . W . W R W R W . W
 9 . R . R . R R R . R .
 8 W . W . W . W . W . W
 7 . R W R . R . R . R .
 6 W . W . W . W . W . W
 5 . R . R W R . R . R .
 4 W . W . W . W . W . W
 3 . R . R . R . R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R
  A B C D E F G H I J K`

const EX5_NOT_BOXED = `
11   R . R W R W R . R
10 W . W . W W W . W . W
 9 . R . R . R . R . R .
 8 W . W . W . W . W . W
 7 . R . R . R . R . R .
 6 W . W . W R W . W . W
 5 . R . R . R . R . R .
 4 W . W . W R W . W . W
 3 . R . R . R R R . R .
 2 W . W . W . W . W . W
 1   R . R . R . R . R
  A B C D E F G H I J K`

describe('spec: board layout', () => {
  it('creates the 11x11 board from the spec diagram', () => {
    const board = createBoard()
    expect(board).toHaveLength(BOARD_SIZE)
    for (const row of board) expect(row).toHaveLength(BOARD_SIZE)
  })

  it('contains 30 fixed pegs per player and 61 empty squares', () => {
    let red = 0
    let white = 0
    let empty = 0
    for (const row of createBoard()) {
      for (const cell of row) {
        if (cell === 'red') red++
        else if (cell === 'white') white++
        else empty++
      }
    }
    expect(red).toBe(30)
    expect(white).toBe(30)
    expect(empty).toBe(61)
  })

  it('leaves the four corners (A1, A11, K1, K11) empty', () => {
    const board = createBoard()
    for (const square of ['A1', 'A11', 'K1', 'K11']) {
      expect(cellAt(board, square)).toBeNull()
    }
  })

  it('marks fixed pegs on the staggered pattern (red on odd rows at B/D/F/H/J, white on even rows at A/C/E/G/I/K)', () => {
    const board = createBoard()
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const square = COL[col] + String(BOARD_SIZE - row)
        if ((row + col) % 2 === 0) {
          expect(isFixedPeg(row, col)).toBe(false)
          expect(cellAt(board, square)).toBeNull()
        } else {
          expect(isFixedPeg(row, col)).toBe(true)
          expect(cellAt(board, square)).toBe(row % 2 === 0 ? 'red' : 'white')
        }
      }
    }
  })
})

describe('spec: placement rule (isCellPlayable)', () => {
  it('allows red to play everywhere except columns A and K', () => {
    const board = createBoard()
    expect(canPlay(board, 'C1', 'red')).toBe(true)
    expect(canPlay(board, 'C11', 'red')).toBe(true)
    expect(canPlay(board, 'F6', 'red')).toBe(true)
    expect(canPlay(board, 'A3', 'red')).toBe(false)
    expect(canPlay(board, 'K3', 'red')).toBe(false)
  })

  it('allows white to play everywhere except rows 1 and 11', () => {
    const board = createBoard()
    expect(canPlay(board, 'A3', 'white')).toBe(true)
    expect(canPlay(board, 'F6', 'white')).toBe(true)
    expect(canPlay(board, 'B1', 'white')).toBe(false)
    expect(canPlay(board, 'B11', 'white')).toBe(false)
  })

  it('never allows either player to play a corner (A1, A11, K1, K11)', () => {
    const board = createBoard()
    for (const square of ['A1', 'A11', 'K1', 'K11']) {
      expect(canPlay(board, square, 'red')).toBe(false)
      expect(canPlay(board, square, 'white')).toBe(false)
    }
  })

  it('rejects an occupied square', () => {
    const board = boardWith([['C3', 'red']])
    expect(canPlay(board, 'C3', 'red')).toBe(false)
    expect(canPlay(board, 'C3', 'white')).toBe(false)
  })

  it('rejects every placement once the game is over', () => {
    const board = createBoard()
    expect(canPlay(board, 'C5', 'red', true)).toBe(false)
    expect(canPlay(board, 'C5', 'white', true)).toBe(false)
  })

  it('gives each player exactly 49 playable squares on the starting board', () => {
    const board = createBoard()
    let red = 0
    let white = 0
    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (const file of COL) {
        const square = file + String(row)
        if (canPlay(board, square, 'red')) red++
        if (canPlay(board, square, 'white')) white++
      }
    }
    expect(red).toBe(49)
    expect(white).toBe(49)
  })
})

describe('spec: connection win — Red Option 1 / White Option 1 (checkConnectionWin)', () => {
  it('gives red a win for a chain from Row 11 to Row 1 through fixed pegs in column B', () => {
    const board = boardWith([
      ['B2', 'red'],
      ['B4', 'red'],
      ['B6', 'red'],
      ['B8', 'red'],
      ['B10', 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(true)
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('gives white a win for a chain from Column A to Column K along row 2', () => {
    const board = boardWith([
      ['B2', 'white'],
      ['D2', 'white'],
      ['F2', 'white'],
      ['H2', 'white'],
      ['J2', 'white'],
    ])
    expect(checkConnectionWin(board, 'white')).toBe(true)
    expect(checkConnectionWin(board, 'red')).toBe(false)
  })

  it('requires the chain to touch both Row 1 and Row 11', () => {
    const board = emptyBoard()
    for (const square of ['C1', 'C2', 'C3']) setAt(board, square, 'red')
    expect(checkConnectionWin(board, 'red')).toBe(false)
    for (let row = 4; row <= BOARD_SIZE; row++) setAt(board, `C${row}`, 'red')
    expect(checkConnectionWin(board, 'red')).toBe(true)
  })

  it('counts fixed pegs toward a winding chain', () => {
    const board = boardWith([
      ['B2', 'red'],
      ['C3', 'red'],
      ['D4', 'red'],
      ['D6', 'red'],
      ['D8', 'red'],
      ['D10', 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(true)
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('does not connect diagonally', () => {
    const board = emptyBoard()
    for (const square of ['C11', 'D10', 'E9', 'F8', 'G7', 'H6', 'I5', 'J4', 'K3']) {
      setAt(board, square, 'red')
    }
    expect(checkConnectionWin(board, 'red')).toBe(false)
  })

  it('breaks the chain when an opponent token sits in it', () => {
    const board = boardWith([
      ['B2', 'red'],
      ['B4', 'red'],
      ['B8', 'red'],
      ['B10', 'red'],
      ['B6', 'white'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(false)
  })

  it('matches the doc example: White wins by connection', () => {
    const game = parsed(EX2_WHITE_CONNECTION)
    expect(checkConnectionWin(game.board, 'white')).toBe(true)
    expect(checkConnectionWin(game.board, 'red')).toBe(false)
    expect(checkSurroundWin(game.board, 'white')).toBe(false)
    expect(checkSurroundWin(game.board, 'red')).toBe(false)
    expect(game.winner).toBe('white')
  })

  it('matches the doc example: Red wins by connection', () => {
    const game = parsed(EX3_RED_CONNECTION)
    expect(checkConnectionWin(game.board, 'red')).toBe(true)
    expect(checkConnectionWin(game.board, 'white')).toBe(false)
    expect(checkSurroundWin(game.board, 'red')).toBe(false)
    expect(checkSurroundWin(game.board, 'white')).toBe(false)
    expect(game.winner).toBe('red')
  })
})

describe('spec: box-in win — Red/White Option 2 (checkSurroundWin)', () => {
  it('matches the doc example: White wins by box-in', () => {
    const game = parsed(EX1_WHITE_BOX_IN)
    expect(checkSurroundWin(game.board, 'white')).toBe(true)
    expect(checkSurroundWin(game.board, 'red')).toBe(false)
    expect(checkConnectionWin(game.board, 'white')).toBe(false)
    expect(checkConnectionWin(game.board, 'red')).toBe(false)
    expect(game.gameOver).toBe(true)
    expect(game.winner).toBe('white')
  })

  it('matches the doc example: Red has not won yet before G11', () => {
    const game = parsed(EX4_RED_NOT_YET)
    expect(checkSurroundWin(game.board, 'red')).toBe(false)
    expect(checkSurroundWin(game.board, 'white')).toBe(false)
    expect(checkConnectionWin(game.board, 'red')).toBe(false)
    expect(checkConnectionWin(game.board, 'white')).toBe(false)
    expect(game.gameOver).toBe(false)
    expect(game.winner).toBeNull()
  })

  it('matches the doc example: playing G11 closes the loop and boxes in white', () => {
    const board = parsed(EX4_RED_NOT_YET).board
    setAt(board, 'G11', 'red')
    expect(checkSurroundWin(board, 'red')).toBe(true)
    expect(checkConnectionWin(board, 'red')).toBe(false)
  })

  it('matches the doc example: F11 is NOT boxed in — board edges cannot complete a loop', () => {
    const game = parsed(EX5_NOT_BOXED)
    expect(checkSurroundWin(game.board, 'red')).toBe(false)
    expect(checkSurroundWin(game.board, 'white')).toBe(false)
    expect(checkConnectionWin(game.board, 'red')).toBe(false)
    expect(checkConnectionWin(game.board, 'white')).toBe(false)
  })

  it('does not box in white while the enclosure is open to a board edge', () => {
    const board = pocketBoard()
    expect(checkSurroundWin(board, 'red')).toBe(false)
    expect(checkConnectionWin(board, 'red')).toBe(false)
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('boxes in white once B6 seals the last gap', () => {
    const board = pocketBoard()
    setAt(board, 'B6', 'red')
    expect(checkSurroundWin(board, 'red')).toBe(true)
  })

  it('reopens the enclosure when one wall is removed', () => {
    const board = pocketBoard()
    setAt(board, 'B6', 'red')
    expect(checkSurroundWin(board, 'red')).toBe(true)
    setAt(board, 'B6', null)
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })

  it('does not win for a loop enclosing no opponent token', () => {
    const board = boardWith([
      ['D7', 'red'],
      ['D5', 'red'],
      ['C6', 'red'],
      ['E6', 'red'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })

  it('does not let an opponent token seal the enclosure', () => {
    const board = pocketBoard()
    setAt(board, 'B6', 'white')
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })

  it('cannot box in an opponent token touching the board edge', () => {
    const board = boardWith([
      ['C10', 'red'],
      ['C9', 'red'],
      ['C11', 'white'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(false)
    expect(checkSurroundWin(board, 'white')).toBe(false)
  })
})
