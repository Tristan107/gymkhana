import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from '../../constants'
import type { Board, CellValue } from '../../types'
import {
  checkConnectionWin,
  checkSurroundWin,
  createBoard,
  getTileOrientation,
  isBoardFull,
  isCellPlayable,
  isFixedPeg,
  isForbiddenEdgePlacement,
  isValidConnection,
} from '../logic'

type Override = [row: number, col: number, value: CellValue]

function boardWith(overrides: Override[]): Board {
  const board = createBoard()
  for (const [row, col, value] of overrides) {
    board[row][col] = value
  }
  return board
}

describe('createBoard', () => {
  it('builds an 11x11 board', () => {
    const board = createBoard()
    expect(board).toHaveLength(11)
    for (const row of board) expect(row).toHaveLength(11)
  })

  it('places fixed red tokens on even rows at odd columns', () => {
    const board = createBoard()
    expect(board[0][1]).toBe('red')
    expect(board[2][3]).toBe('red')
    expect(board[10][9]).toBe('red')
  })

  it('places fixed white tokens on odd rows at even columns', () => {
    const board = createBoard()
    expect(board[1][0]).toBe('white')
    expect(board[3][2]).toBe('white')
    expect(board[9][10]).toBe('white')
  })

  it('leaves every even-parity cell empty', () => {
    const board = createBoard()
    expect(board[0][0]).toBeNull()
    expect(board[1][1]).toBeNull()
    expect(board[10][10]).toBeNull()
  })

  it('contains 30 red, 30 white and 61 empty cells', () => {
    const board = createBoard()
    let red = 0
    let white = 0
    let empty = 0
    for (const row of board) {
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
})

describe('isFixedPeg', () => {
  it('returns true only for odd-parity cells', () => {
    expect(isFixedPeg(0, 1)).toBe(true)
    expect(isFixedPeg(10, 9)).toBe(true)
    expect(isFixedPeg(0, 0)).toBe(false)
    expect(isFixedPeg(1, 1)).toBe(false)
  })
})

describe('getTileOrientation', () => {
  it('detects horizontal when a same-color neighbor is left or right', () => {
    const board = createBoard()
    expect(getTileOrientation(board, 0, 2, 'red')).toBe('horizontal')
    expect(getTileOrientation(board, 1, 1, 'white')).toBe('horizontal')
  })

  it('detects vertical when a same-color neighbor is above or below', () => {
    const board = createBoard()
    expect(getTileOrientation(board, 1, 1, 'red')).toBe('vertical')
  })

  it('falls back to vertical for red and horizontal for white', () => {
    const board = createBoard()
    expect(getTileOrientation(board, 0, 1, 'red')).toBe('vertical')
    expect(getTileOrientation(board, 1, 0, 'white')).toBe('horizontal')
  })
})

describe('isValidConnection', () => {
  it('allows a placement between two same-color tokens on a straight line', () => {
    const board = createBoard()
    expect(isValidConnection(board, 0, 2, 'red')).toBe(true)
    expect(isValidConnection(board, 1, 1, 'red')).toBe(true)
    expect(isValidConnection(board, 1, 1, 'white')).toBe(true)
  })

  it('rejects placements without two same-color tokens in a straight line', () => {
    const board = createBoard()
    expect(isValidConnection(board, 0, 2, 'white')).toBe(false)
    expect(isValidConnection(board, 2, 0, 'red')).toBe(false)
  })
})

describe('isForbiddenEdgePlacement', () => {
  it('forbids vertical placements on the top row', () => {
    expect(isForbiddenEdgePlacement(createBoard(), 0, 1, 'red')).toBe(true)
  })

  it('forbids horizontal placements on the left column', () => {
    expect(isForbiddenEdgePlacement(createBoard(), 1, 0, 'white')).toBe(true)
  })

  it('allows placements away from the border', () => {
    const board = createBoard()
    expect(isForbiddenEdgePlacement(board, 1, 1, 'red')).toBe(false)
    expect(isForbiddenEdgePlacement(board, 1, 1, 'white')).toBe(false)
  })
})

describe('isCellPlayable', () => {
  it('accepts a valid non-edge placement', () => {
    expect(isCellPlayable(createBoard(), 1, 1, 'red', false)).toBe(true)
    expect(isCellPlayable(createBoard(), 1, 1, 'white', false)).toBe(true)
  })

  it('rejects the corners', () => {
    expect(isCellPlayable(createBoard(), 0, 0, 'red', false)).toBe(false)
    expect(isCellPlayable(createBoard(), 10, 10, 'white', false)).toBe(false)
  })

  it('rejects cells without a valid connection', () => {
    expect(isCellPlayable(createBoard(), 2, 0, 'red', false)).toBe(false)
  })

  it('rejects everything once the game is over', () => {
    expect(isCellPlayable(createBoard(), 1, 1, 'red', true)).toBe(false)
  })

  it('matches the placement examples from the rules doc', () => {
    const board = createBoard()
    expect(isCellPlayable(board, 1, 0, 'red', false)).toBe(false)
    expect(isCellPlayable(board, 0, 2, 'white', false)).toBe(false)
    expect(isCellPlayable(board, 0, 2, 'red', false)).toBe(true)
    expect(isCellPlayable(board, 1, 1, 'white', false)).toBe(true)
  })
})

describe('placement rule: "at least two" equals a straight line', () => {
  it('is playable exactly when two same-color orthogonal neighbors exist', () => {
    const board = createBoard()
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== null) continue
        for (const color of ['red', 'white'] as const) {
          let same = 0
          for (const [dr, dc] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const nr = r + dr
            const nc = c + dc
            if (
              nr >= 0 &&
              nr < BOARD_SIZE &&
              nc >= 0 &&
              nc < BOARD_SIZE &&
              board[nr][nc] === color
            ) {
              same++
            }
          }
          expect(isCellPlayable(board, r, c, color, false)).toBe(same >= 2)
        }
      }
    }
  })
})

describe('checkConnectionWin', () => {
  it('detects a red path from top to bottom', () => {
    const board = boardWith([
      [1, 1, 'red'],
      [3, 1, 'red'],
      [5, 1, 'red'],
      [7, 1, 'red'],
      [9, 1, 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(true)
  })

  it('does not award red a horizontal win', () => {
    const board = boardWith([
      [0, 2, 'red'],
      [0, 4, 'red'],
      [0, 6, 'red'],
      [0, 8, 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(false)
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('detects a white path from left to right', () => {
    const board = boardWith([
      [1, 1, 'white'],
      [1, 3, 'white'],
      [1, 5, 'white'],
      [1, 7, 'white'],
      [1, 9, 'white'],
    ])
    expect(checkConnectionWin(board, 'white')).toBe(true)
  })

  it('does not award white a vertical win', () => {
    const board = boardWith([
      [1, 0, 'red'],
      [3, 0, 'red'],
      [5, 0, 'red'],
      [7, 0, 'red'],
      [9, 0, 'red'],
    ])
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('returns false on the starting board', () => {
    const board = createBoard()
    expect(checkConnectionWin(board, 'red')).toBe(false)
    expect(checkConnectionWin(board, 'white')).toBe(false)
  })

  it('detects a winding red path from top to bottom', () => {
    const board = boardWith([
      [1, 1, 'red'],
      [3, 1, 'red'],
      [4, 2, 'red'],
      [5, 3, 'red'],
      [7, 3, 'red'],
      [9, 3, 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(true)
  })

  it('does not detect a winding path with a missing link', () => {
    const board = boardWith([
      [1, 1, 'red'],
      [3, 1, 'red'],
      [5, 3, 'red'],
      [7, 3, 'red'],
      [9, 3, 'red'],
    ])
    expect(checkConnectionWin(board, 'red')).toBe(false)
  })
})

describe('checkSurroundWin', () => {
  it('detects a fully enclosed single white token', () => {
    const board = boardWith([
      [5, 4, 'red'],
      [5, 6, 'red'],
      [5, 5, 'white'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(true)
  })

  it('does not detect a win while one side stays open', () => {
    const board = boardWith([
      [5, 6, 'red'],
      [5, 5, 'white'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })

  it('cannot box in a group touching the board edge', () => {
    const board = boardWith([
      [4, 0, 'red'],
      [6, 0, 'red'],
      [5, 1, 'red'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })

  it('requires an empty edge cell to be occupied to complete a box-in', () => {
    const board = boardWith([
      [4, 0, null],
      [4, 2, 'red'],
      [3, 1, 'white'],
      [5, 1, 'white'],
      [4, 3, 'white'],
    ])
    expect(checkSurroundWin(board, 'white')).toBe(false)
  })

  it('boxes in a group once the adjacent edge cell is occupied', () => {
    const board = boardWith([
      [4, 2, 'red'],
      [3, 1, 'white'],
      [5, 1, 'white'],
      [4, 3, 'white'],
      [4, 0, 'white'],
    ])
    expect(checkSurroundWin(board, 'white')).toBe(true)
  })

  it('does not detect a win on the starting board', () => {
    expect(checkSurroundWin(createBoard(), 'red')).toBe(false)
    expect(checkSurroundWin(createBoard(), 'white')).toBe(false)
  })

  it('detects a box-in of a two-token white group with an enclosed empty cell', () => {
    const board = boardWith([
      [2, 3, 'white'],
      [2, 4, 'white'],
      [1, 2, 'red'],
      [1, 3, 'red'],
      [1, 4, 'red'],
      [3, 2, 'red'],
      [3, 3, 'red'],
      [3, 4, 'red'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(true)
  })

  it('does not count a red ring enclosing only empty cells', () => {
    const board = boardWith([
      [1, 2, 'red'],
      [3, 2, 'red'],
      [2, 3, 'red'],
    ])
    expect(checkSurroundWin(board, 'red')).toBe(false)
  })
})

describe('isBoardFull', () => {
  it('is false while any interior cell is empty', () => {
    const board = createBoard()
    expect(isBoardFull(board)).toBe(false)
  })

  it('is true when every interior cell is occupied', () => {
    const board = createBoard()
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 10; c++) {
        if (board[r][c] === null) board[r][c] = 'red'
      }
    }
    expect(isBoardFull(board)).toBe(true)
  })

  it('ignores the unplayable border ring', () => {
    const board = createBoard()
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 10; c++) {
        if (board[r][c] === null) board[r][c] = 'white'
      }
    }
    expect(board[0][0]).toBeNull()
    expect(board[0][2]).toBeNull()
    expect(board[2][0]).toBeNull()
    expect(isBoardFull(board)).toBe(true)
  })

  it('is false when a single interior cell is empty', () => {
    const board = createBoard()
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 10; c++) {
        if (board[r][c] === null && !(r === 5 && c === 5)) board[r][c] = 'white'
      }
    }
    expect(isBoardFull(board)).toBe(false)
  })
})
