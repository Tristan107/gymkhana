import { BOARD_SIZE } from '../constants'
import type { Board, Orientation, Player } from '../types'
import {
  createFlatBoard,
  toPublicBoard as toPublicBoardFlat,
  fromPublicBoard as fromPublicBoardFlat,
  checkGameOver,
  getValidMoves,
  applyMove,
  checkConnectionWin as checkConnectionWinFlat,
  checkSurroundWin as checkSurroundWinFlat,
} from './flatBoard'

export { toPublicBoardFlat as toPublicBoard, fromPublicBoardFlat as fromPublicBoard }

function codeToPlayer(code: number): Player | null {
  if (code === 1) return 'red'
  if (code === 2) return 'white'
  return null
}

export function createBoard(): Board {
  const flat = createFlatBoard()
  return toPublicBoardFlat(flat)
}

export function isFixedPeg(row: number, col: number): boolean {
  return (row + col) % 2 !== 0
}

export function getTileOrientation(
  board: Board,
  row: number,
  col: number,
  targetColor?: Player
): Orientation {
  const color = targetColor ?? board[row][col]
  if (row - 1 >= 0 && board[row - 1][col] === color) return 'vertical'
  if (col - 1 >= 0 && board[row][col - 1] === color) return 'horizontal'
  if (row + 1 < BOARD_SIZE && board[row + 1][col] === color) return 'vertical'
  if (col + 1 < BOARD_SIZE && board[row][col + 1] === color) return 'horizontal'
  return color === 'red' ? 'vertical' : 'horizontal'
}

export function isCellPlayable(
  board: Board,
  row: number,
  col: number,
  player: Player,
  gameOver: boolean
): boolean {
  if (gameOver || board[row][col] !== null) return false
  if (player === 'red') return col !== 0 && col !== BOARD_SIZE - 1
  return row !== 0 && row !== BOARD_SIZE - 1
}

export function checkConnectionWin(board: Board, player: Player): boolean {
  const flat = new Uint8Array(121)
  fromPublicBoardFlat(board, flat)
  const playerCode = player === 'red' ? 1 : 2
  return checkConnectionWinFlat(flat, playerCode)
}

export function checkSurroundWin(board: Board, player: Player): boolean {
  const flat = new Uint8Array(121)
  fromPublicBoardFlat(board, flat)
  const playerCode = player === 'red' ? 1 : 2
  return checkSurroundWinFlat(flat, playerCode)
}

export function place(board: Board, row: number, col: number, player: Player): Board {
  const flat = new Uint8Array(121)
  fromPublicBoardFlat(board, flat)
  const playerCode = player === 'red' ? 1 : 2
  const idx = row * BOARD_SIZE + col
  applyMove(flat, idx, playerCode)
  return toPublicBoardFlat(flat)
}

export function hasWin(board: Board, player: Player): boolean {
  return checkConnectionWin(board, player) || checkSurroundWin(board, player)
}

export function getValidMovesPublic(board: Board, player: Player): { row: number; col: number }[] {
  const flat = new Uint8Array(121)
  fromPublicBoardFlat(board, flat)
  const playerCode = player === 'red' ? 1 : 2
  const out: number[] = new Array(61)
  const count = getValidMoves(flat, playerCode, out)
  const moves: { row: number; col: number }[] = []
  for (let i = 0; i < count; i++) {
    const idx = out[i]
    moves.push({ row: Math.floor(idx / BOARD_SIZE), col: idx % BOARD_SIZE })
  }
  return moves
}

export function checkGameOverPublic(board: Board, tilesRed: number, tilesWhite: number): {
  gameOver: boolean
  winner: Player | null
  reason: 'connection' | 'surround' | 'draw' | 'none'
} {
  const flat = new Uint8Array(121)
  fromPublicBoardFlat(board, flat)
  const result = checkGameOver(flat, tilesRed, tilesWhite)
  return {
    gameOver: result.gameOver,
    winner: codeToPlayer(result.winner),
    reason: result.reason,
  }
}