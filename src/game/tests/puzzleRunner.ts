import { readFile } from 'node:fs/promises'
import { BOARD_SIZE } from '../../constants'
import type { Board, Player } from '../../types'
import { parseBoardText } from '../boardFile'
import { chooseMove } from '../ai_v2'
import type { Move } from '../ai_v2'

export interface PuzzleInput {
  board: Board
  player: Player
  tilesPlaced: Record<Player, number>
  gameOver: boolean
  accepted: Move[]
}

export interface PuzzleResult {
  accepted: Move[]
  chosen: Move[]
  invalid: Move[]
  missing: number
  ok: boolean
}

const CELL_PATTERN = /^[A-K](\d{1,2})$/i

function parseCell(cell: string): Move | null {
  const match = cell.trim().match(CELL_PATTERN)
  if (match === null) return null
  const col = cell.toUpperCase().charCodeAt(0) - 65
  const row = BOARD_SIZE - parseInt(match[1], 10)
  if (row < 0 || row >= BOARD_SIZE) return null
  return { row, col }
}

function parseAcceptedSolutions(text: string): Move[] {
  const moves: Move[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^accepte?d\s*solutions\s*[:=]?\s*(.*)$/i)
    if (match === null) continue
    for (const token of match[1].split(/[,\s]+/)) {
      if (token === '') continue
      const move = parseCell(token)
      if (move !== null) moves.push(move)
    }
  }
  return moves
}

export function parsePuzzleFile(text: string): PuzzleInput {
  const result = parseBoardText(text)
  if (!result.ok) throw new Error(result.error)
  return {
    board: result.game.board,
    player: result.game.currentPlayer,
    tilesPlaced: result.game.tilesPlaced,
    gameOver: result.game.gameOver,
    accepted: parseAcceptedSolutions(text),
  }
}

export function runPuzzle(text: string, runs = 10): PuzzleResult {
  const input = parsePuzzleFile(text)
  const chosen: Move[] = []
  let missing = 0
  for (let i = 0; i < runs; i++) {
    const move = chooseMove(input.board, input.player, input.tilesPlaced, input.gameOver)
    if (move === null) {
      missing++
    } else {
      chosen.push(move)
    }
  }
  const invalid = chosen.filter(
    (move) => !input.accepted.some((a) => a.row === move.row && a.col === move.col)
  )
  return {
    accepted: input.accepted,
    chosen,
    invalid,
    missing,
    ok: invalid.length === 0 && missing === 0,
  }
}

export async function runPuzzleFile(path: string, runs = 10): Promise<PuzzleResult> {
  const text = await readFile(path, 'utf8')
  return runPuzzle(text, runs)
}
