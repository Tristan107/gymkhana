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

function parseRowLine(board: Board, line: string, seenRows: Set<number>): string | null {
  const rowMatch = /^(\d{1,2})\b(.*)$/.exec(line)
  if (rowMatch === null) return null

  const displayRow = Number.parseInt(rowMatch[1], 10)
  if (displayRow < 1 || displayRow > BOARD_SIZE) {
    return `Invalid row number: ${displayRow}`
  }
  const r = BOARD_SIZE - displayRow
  if (seenRows.has(r)) {
    return `Row ${displayRow} appears more than once`
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
    return `Row ${displayRow}: expected ${BOARD_SIZE} cells, got ${tokens.length}`
  }
  return null
}

function validateFixedCell(board: Board, r: number, c: number): string | null {
  const cell = board[r][c]
  if (isCorner(r, c)) {
    if (cell !== null) {
      return `Corner ${COL_LABELS[c]}${BOARD_SIZE - r} cannot be occupied`
    }
  } else if ((r + c) % 2 === 1) {
    const expected: Player = r % 2 === 0 ? 'red' : 'white'
    if (cell !== expected) {
      return `Fixed peg at ${COL_LABELS[c]}${BOARD_SIZE - r} must be ${expected}`
    }
  }
  return null
}

function validateFixedPegs(board: Board): string | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const error = validateFixedCell(board, r, c)
      if (error !== null) return error
    }
  }
  return null
}

function validateCounts(placed: Record<Player, number>): string | null {
  if (placed.red < 0 || placed.red > MAX_TILES) return 'Invalid red tile count'
  if (placed.white < 0 || placed.white > MAX_TILES) return 'Invalid white tile count'
  const diff = placed.red - placed.white
  if (diff !== 0 && diff !== 1) {
    return 'Board is not in a playable state (turn parity)'
  }
  return null
}

type Outcome =
  | { ok: true; gameOver: boolean; winner: Player | null; alertMessage: string | null }
  | { ok: false; error: string }

function determineOutcome(board: Board, placed: Record<Player, number>): Outcome {
  const redConnection = checkConnectionWin(board, 'red')
  const redSurround = checkSurroundWin(board, 'red')
  const whiteConnection = checkConnectionWin(board, 'white')
  const whiteSurround = checkSurroundWin(board, 'white')
  const redWins = redConnection || redSurround
  const whiteWins = whiteConnection || whiteSurround

  if (redWins && whiteWins) {
    return { ok: false, error: 'Both players appear to have won' }
  }
  if (redWins) {
    return {
      ok: true,
      gameOver: true,
      winner: 'red',
      alertMessage: `RED wins by ${redConnection ? 'Connection' : 'Boxing-In'}!`,
    }
  }
  if (whiteWins) {
    return {
      ok: true,
      gameOver: true,
      winner: 'white',
      alertMessage: `WHITE wins by ${whiteConnection ? 'Connection' : 'Boxing-In'}!`,
    }
  }
  if (placed.red === MAX_TILES && placed.white === MAX_TILES) {
    return { ok: true, gameOver: true, winner: null, alertMessage: "It's a draw!" }
  }
  return { ok: true, gameOver: false, winner: null, alertMessage: null }
}

function processLine(
  board: Board,
  seenRows: Set<number>,
  line: string,
  declaredTurn: Player | null
): { declaredTurn: Player | null; error: string | null } {
  if (line === '') return { declaredTurn, error: null }
  if (/^accepte?d\s*solutions/i.test(line)) return { declaredTurn, error: null }

  const turnMatch = /^turn\s*:\s*(red|white)$/i.exec(line)
  if (turnMatch !== null) {
    return { declaredTurn: turnMatch[1].toLowerCase() as Player, error: null }
  }

  return { declaredTurn, error: parseRowLine(board, line, seenRows) }
}

export function parseBoardText(text: string): ParseResult {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )
  const seenRows = new Set<number>()
  let declaredTurn: Player | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    const result = processLine(board, seenRows, line, declaredTurn)
    declaredTurn = result.declaredTurn
    if (result.error !== null) return { ok: false, error: result.error }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (!seenRows.has(r)) {
      return { ok: false, error: `Missing row ${BOARD_SIZE - r}` }
    }
  }

  const pegError = validateFixedPegs(board)
  if (pegError !== null) return { ok: false, error: pegError }

  const placed = countPlaced(board)
  const countError = validateCounts(placed)
  if (countError !== null) return { ok: false, error: countError }

  const currentPlayer: Player = placed.red === placed.white ? 'red' : 'white'
  if (declaredTurn !== null && declaredTurn !== currentPlayer) {
    return {
      ok: false,
      error: `Turn line says ${declaredTurn} but the board implies ${currentPlayer}`,
    }
  }

  const outcome = determineOutcome(board, placed)
  if (!outcome.ok) return { ok: false, error: outcome.error }

  return {
    ok: true,
    game: {
      board,
      tilesPlaced: placed,
      currentPlayer,
      gameOver: outcome.gameOver,
      winner: outcome.winner,
      alertMessage: outcome.alertMessage,
    },
  }
}
