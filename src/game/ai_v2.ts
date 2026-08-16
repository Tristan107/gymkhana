import type { Board, Player } from '../types'

export interface Move {
  row: number
  col: number
}

export function chooseMove(
  _board: Board,
  _player: Player,
  _tilesPlaced: Record<Player, number>,
  _gameOver: boolean
): Move | null {
  return null
}
