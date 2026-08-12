import { BOARD_SIZE, MAX_TILES } from '../constants'
import type { Board, Player } from '../types'
import { checkConnectionWin, checkSurroundWin } from './logic'

export interface ParsedGame {
  board: Board
  tilesPlaced: Record<Player, number>
  currentPlayer: Player
  gameOver: boolean
  winner: Player | null
  alertMessage: string | null
}

export type ParseResult = { ok: true; game: ParsedGame } | { ok: false; error: string }

const COL_LABELS = 'ABCDEFGHIJK'
const FIXED_PEGS_PER_COLOR = 30
const CELL_TOKEN = /[RrWw.]/g

function isCorner(row: number, col: number): boolean {
  return (
    (row === 0 || row === BOARD_SIZE - 1) &&
    (col === 0 || col === BOARD_SIZE - 1)
  )
}

function countPlaced(board: Board): Record<Player, number> {
  let red = 0
  let white = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c]
      if (cell === 'red') red++
      else if (cell === 'white') white++
    }
  }
  return {
    red: red - FIXED_PEGS_PER_COLOR,
    white: white - FIXED_PEGS_PER_COLOR,
  }
}

export function deriveTurn(board: Board): Player {
  const placed = countPlaced(board)
  return placed.red > placed.white ? 'white' : 'red'
}

export function boardToText(board: Board): string {
  const lines: string[] = [`Turn: ${deriveTurn(board)}`, '']
  for (let r = 0; r < BOARD_SIZE; r++) {
    const displayRow = BOARD_SIZE - r
    const cells = board[r]
      .map((cell, c) => {
        if (isCorner(r, c)) return '  '
        if (cell === 'red') return 'R '
        if (cell === 'white') return 'W '
        return '. '
      })
      .join('')
    const line = `${String(displayRow).padStart(2)} ${cells}`.trimEnd()
    lines.push(isCorner(r, BOARD_SIZE - 1) ? `${line}  ` : line)
  }
  lines.push(`   ${COL_LABELS.split('').join(' ')}`)
  return `${lines.join('\n')}\n`
}

function setCell(board: Board, r: number, c: number, token: string): void {
  if (token === 'R' || token === 'r') board[r][c] = 'red'
  else if (token === 'W' || token === 'w') board[r][c] = 'white'
  else board[r][c] = null
}

export function parseBoardText(text: string): ParseResult {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )
  const seenRows = new Set<number>()
  let declaredTurn: Player | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    if (/^accepte?d\s*solutions/i.test(line)) continue

    const turnMatch = line.match(/^turn\s*:\s*(red|white)$/i)
    if (turnMatch !== null) {
      declaredTurn = turnMatch[1].toLowerCase() as Player
      continue
    }

    const rowMatch = line.match(/^(\d{1,2})\b(.*)$/)
    if (rowMatch === null) continue

    const displayRow = parseInt(rowMatch[1], 10)
    if (displayRow < 1 || displayRow > BOARD_SIZE) {
      return { ok: false, error: `Invalid row number: ${displayRow}` }
    }
    const r = BOARD_SIZE - displayRow
    if (seenRows.has(r)) {
      return { ok: false, error: `Row ${displayRow} appears more than once` }
    }
    seenRows.add(r)

    const tokens = rowMatch[2].match(CELL_TOKEN) ?? []
    if (tokens.length === BOARD_SIZE) {
      for (let c = 0; c < BOARD_SIZE; c++) setCell(board, r, c, tokens[c])
    } else if (
      tokens.length === BOARD_SIZE - 2 &&
      (displayRow === 1 || displayRow === BOARD_SIZE)
    ) {
      board[r][0] = null
      board[r][BOARD_SIZE - 1] = null
      for (let c = 1; c < BOARD_SIZE - 1; c++) setCell(board, r, c, tokens[c - 1])
    } else {
      return {
        ok: false,
        error: `Row ${displayRow}: expected ${BOARD_SIZE} cells, got ${tokens.length}`,
      }
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (!seenRows.has(r)) {
      return { ok: false, error: `Missing row ${BOARD_SIZE - r}` }
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c]
      if (isCorner(r, c)) {
        if (cell !== null) {
          return {
            ok: false,
            error: `Corner ${COL_LABELS[c]}${BOARD_SIZE - r} cannot be occupied`,
          }
        }
      } else if ((r + c) % 2 === 1) {
        const expected: Player = r % 2 === 0 ? 'red' : 'white'
        if (cell !== expected) {
          return {
            ok: false,
            error: `Fixed peg at ${COL_LABELS[c]}${BOARD_SIZE - r} must be ${expected}`,
          }
        }
      }
    }
  }

  const placed = countPlaced(board)
  if (placed.red < 0 || placed.red > MAX_TILES) {
    return { ok: false, error: 'Invalid red tile count' }
  }
  if (placed.white < 0 || placed.white > MAX_TILES) {
    return { ok: false, error: 'Invalid white tile count' }
  }
  const diff = placed.red - placed.white
  if (diff !== 0 && diff !== 1) {
    return { ok: false, error: 'Board is not in a playable state (turn parity)' }
  }

  const currentPlayer: Player = diff === 0 ? 'red' : 'white'
  if (declaredTurn !== null && declaredTurn !== currentPlayer) {
    return {
      ok: false,
      error: `Turn line says ${declaredTurn} but the board implies ${currentPlayer}`,
    }
  }

  const redConnection = checkConnectionWin(board, 'red')
  const redSurround = checkSurroundWin(board, 'red')
  const whiteConnection = checkConnectionWin(board, 'white')
  const whiteSurround = checkSurroundWin(board, 'white')
  const redWins = redConnection || redSurround
  const whiteWins = whiteConnection || whiteSurround

  if (redWins && whiteWins) {
    return { ok: false, error: 'Both players appear to have won' }
  }

  let gameOver = false
  let winner: Player | null = null
  let alertMessage: string | null = null

  if (redWins) {
    gameOver = true
    winner = 'red'
    alertMessage = `RED wins by ${redConnection ? 'Connection' : 'Boxing-In'}!`
  } else if (whiteWins) {
    gameOver = true
    winner = 'white'
    alertMessage = `WHITE wins by ${whiteConnection ? 'Connection' : 'Boxing-In'}!`
  } else if (placed.red === MAX_TILES && placed.white === MAX_TILES) {
    gameOver = true
    alertMessage = "It's a draw!"
  }

  return {
    ok: true,
    game: {
      board,
      tilesPlaced: placed,
      currentPlayer,
      gameOver,
      winner,
      alertMessage,
    },
  }
}
