import { describe, expect, it } from 'vitest'
import { gameReducer, initialState } from '../reducer'
import { applyMoveLog } from '../replay'
import type { ReplayMove } from '../replay'

function toReplayMoves(moves: Array<[number, number]>): ReplayMove[] {
  return moves.map(([r, c], index) => ({ p: index % 2 === 0 ? 'red' : 'white', r, c }))
}

function playLocally(moves: ReadonlyArray<ReplayMove>) {
  let state = initialState
  for (const move of moves) {
    if (state.gameOver) break
    state = gameReducer(state, { type: 'PLACE', row: move.r, col: move.c })
  }
  return state
}

describe('applyMoveLog', () => {
  it('reproduces the exact state of an interactive session', () => {
    const raw: Array<[number, number]> = [
      [1, 1],
      [2, 10],
      [3, 1],
      [4, 10],
      [5, 1],
      [6, 10],
      [7, 1],
      [8, 10],
      [9, 1],
    ]
    const moves = toReplayMoves(raw)
    expect(applyMoveLog(moves)).toEqual(playLocally(moves))
  })

  it('converges when the log contains invalid moves', () => {
    const raw: Array<[number, number]> = [
      [1, 1], // red valid
      [0, 0], // white invalid (corner)
      [2, 10], // white valid
    ]
    const moves = toReplayMoves(raw)
    const state = applyMoveLog(moves)
    expect(state.board[0][0]).toBeNull()
    expect(state.board[1][1]).toBe('red')
    expect(state.board[2][10]).toBe('white')
    expect(state.currentPlayer).toBe('red')
  })

  it('stops replaying once the game is over', () => {
    const raw: Array<[number, number]> = [
      [1, 1],
      [2, 10],
      [3, 1],
      [4, 10],
      [5, 1],
      [6, 10],
      [7, 1],
      [8, 10],
      [9, 1], // red wins by connection
      [1, 5], // move that must be ignored
    ]
    const moves = toReplayMoves(raw)
    const state = applyMoveLog(moves)
    expect(state.gameOver).toBe(true)
    expect(state.winner).toBe('red')
    expect(state.board[1][5]).toBeNull()
  })
})
