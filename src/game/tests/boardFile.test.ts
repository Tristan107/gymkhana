import { describe, expect, it } from 'vitest'
import type { Board, CellValue } from '../../types'
import { createBoard } from '../logic'
import { boardToText, parseBoardText } from '../boardFile'

function override(board: Board, overrides: Array<[number, number, CellValue]>): Board {
  const next = board.map((row) => [...row])
  for (const [r, c, v] of overrides) next[r][c] = v
  return next
}

describe('boardToText', () => {
  it('renders a fresh board with blank corners', () => {
    const text = boardToText(createBoard())
    const lines = text.trimEnd().split('\n')
    expect(lines[0]).toBe('Turn: red')
    expect(lines[1]).toBe('')
    expect(lines[2]).toBe('11   R . R . R . R . R  ')
    expect(lines[3]).toBe('10 W . W . W . W . W . W')
    expect(lines[4]).toBe(' 9 . R . R . R . R . R .')
    expect(lines[12]).toBe(' 1   R . R . R . R . R  ')
    expect(lines[13]).toBe('   A B C D E F G H I J K')
    const boardLines = lines.slice(2, 13)
    for (const boardLine of boardLines) {
      expect(boardLine.length).toBe(24)
    }
  })

  it('derives the turn from tile parity', () => {
    const board = createBoard()
    expect(boardToText(board)).toContain('Turn: red')
    board[1][1] = 'red'
    expect(boardToText(board)).toContain('Turn: white')
    board[2][10] = 'white'
    expect(boardToText(board)).toContain('Turn: red')
  })
})

describe('parseBoardText', () => {
  it('round-trips a fresh board', () => {
    const board = createBoard()
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.game.board).toEqual(board)
      expect(result.game.currentPlayer).toBe('red')
      expect(result.game.tilesPlaced).toEqual({ red: 0, white: 0 })
      expect(result.game.gameOver).toBe(false)
      expect(result.game.winner).toBeNull()
    }
  })

  it('round-trips a mid-game board', () => {
    const board = override(createBoard(), [
      [1, 1, 'red'],
      [2, 10, 'white'],
      [3, 1, 'red'],
    ])
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.game.board).toEqual(board)
      expect(result.game.currentPlayer).toBe('white')
      expect(result.game.tilesPlaced).toEqual({ red: 2, white: 1 })
      expect(result.game.gameOver).toBe(false)
    }
  })

  it('parses the human-friendly format with loose label spacing', () => {
    const text = [
      'Turn: red',
      '',
      '11   R . R . R . R . R',
      '10 W . W . W . W . W . W',
      '9  . R . R . R . R . R .',
      '8  W . W . W . W . W . W',
      '7  . R . R . R . R . R .',
      '6  W . W . W . W . W . W',
      '5  . R . R . R . R . R .',
      '4  W . W . W . W . W . W',
      '3  . R . R . R . R . R .',
      '2  W . W . W . W . W . W',
      '1    R . R . R . R . R',
      '   A B C D E F G H I J K',
    ].join('\n')
    const result = parseBoardText(text)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.game.board).toEqual(createBoard())
  })

  it('accepts old-style exports where corners are dots', () => {
    const fresh = boardToText(createBoard())
    const oldStyle = fresh
      .replace('11   R . R . R . R . R', '11 . R . R . R . R . R .')
      .replace(' 1   R . R . R . R . R', ' 1 . R . R . R . R . R .')
    const result = parseBoardText(oldStyle)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.game.board).toEqual(createBoard())
  })

  it('rejects a board with a wrong fixed peg', () => {
    const board = override(createBoard(), [[0, 1, 'white']])
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(false)
  })

  it('rejects a board with an occupied corner', () => {
    const board = override(createBoard(), [[0, 0, 'red']])
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(false)
  })

  it('rejects a board with too many placed tiles', () => {
    const board = createBoard()
    let placed = 0
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 10; c++) {
        if (board[r][c] === null && (r + c) % 2 === 0 && placed < 21) {
          board[r][c] = 'red'
          placed++
        }
      }
    }
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(false)
  })

  it('rejects a mismatched Turn line', () => {
    const text = boardToText(createBoard()).replace('Turn: red', 'Turn: white')
    const result = parseBoardText(text)
    expect(result.ok).toBe(false)
  })

  it('rejects a missing row', () => {
    const lines = boardToText(createBoard()).trimEnd().split('\n')
    const withoutRow5 = lines.filter((line) => !/^ *5\b/.test(line)).join('\n')
    const result = parseBoardText(withoutRow5)
    expect(result.ok).toBe(false)
  })

  it('rejects a row with the wrong number of cells', () => {
    const text = boardToText(createBoard()).replace(
      '10 W . W . W . W . W . W',
      '10 W . W . W . W . W'
    )
    const result = parseBoardText(text)
    expect(result.ok).toBe(false)
  })

  it('detects a red connection win', () => {
    const board = override(createBoard(), [
      [1, 1, 'red'],
      [3, 1, 'red'],
      [5, 1, 'red'],
      [7, 1, 'red'],
      [9, 1, 'red'],
      [2, 10, 'white'],
      [4, 10, 'white'],
      [6, 10, 'white'],
      [8, 10, 'white'],
    ])
    const result = parseBoardText(boardToText(board))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.game.gameOver).toBe(true)
      expect(result.game.winner).toBe('red')
    }
  })
})
