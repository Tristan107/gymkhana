import type { Player } from '../types'
import { gameReducer, initialState } from './reducer'
import type { GameState } from './reducer'

export interface ReplayMove {
  p: Player
  r: number
  c: number
}

export function applyMoveLog(moves: ReadonlyArray<ReplayMove>): GameState {
  let state = initialState
  for (const move of moves) {
    if (state.gameOver) break
    state = gameReducer(state, { type: 'PLACE', row: move.r, col: move.c })
  }
  return state
}
