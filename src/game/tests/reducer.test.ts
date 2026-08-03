import { describe, expect, it } from 'vitest'
import { MAX_TILES } from '../../constants'
import { createBoard } from '../logic'
import { gameReducer, initialState } from '../reducer'
import type { GameState } from '../reducer'

function makeState(overrides: Partial<GameState>): GameState {
  return {
    ...initialState,
    ...overrides,
  }
}

function winByRedConnection(): GameState {
  const board = createBoard()
  for (const row of [1, 3, 5, 7, 9]) board[row][1] = 'red'
  return makeState({
    board,
    gameOver: true,
    winner: 'red',
    tilesPlaced: { red: 5, white: 0 },
    alertMessage: 'RED wins by Connection!',
  })
}

describe('gameReducer', () => {
  it('starts with red as the first player', () => {
    expect(initialState.currentPlayer).toBe('red')
    expect(initialState.tilesPlaced).toEqual({ red: 0, white: 0 })
    expect(initialState.gameOver).toBe(false)
    expect(initialState.winner).toBeNull()
  })

  it('places a token and switches to the opponent', () => {
    const state = gameReducer(initialState, { type: 'PLACE', row: 1, col: 1 })
    expect(state.board[1][1]).toBe('red')
    expect(state.tilesPlaced.red).toBe(1)
    expect(state.currentPlayer).toBe('white')
    expect(state.gameOver).toBe(false)
  })

  it('ignores a placement on an occupied cell', () => {
    const state = gameReducer(initialState, { type: 'PLACE', row: 0, col: 1 })
    expect(state).toBe(initialState)
  })

  it('ignores placements once the game is over', () => {
    const state = winByRedConnection()
    const next = gameReducer(state, { type: 'PLACE', row: 2, col: 4 })
    expect(next).toBe(state)
  })

  it('ignores placements once a player has exhausted their reserve', () => {
    const state = makeState({ tilesPlaced: { red: MAX_TILES, white: 0 } })
    const next = gameReducer(state, { type: 'PLACE', row: 1, col: 1 })
    expect(next).toBe(state)
  })

  it('awards red a win by connection', () => {
    const moves: Array<[number, number]> = [
      [1, 1], // red
      [2, 10], // white
      [3, 1],
      [4, 10],
      [5, 1],
      [6, 10],
      [7, 1],
      [8, 10],
      [9, 1],
    ]
    let state = initialState
    for (const [row, col] of moves) {
      state = gameReducer(state, { type: 'PLACE', row, col })
    }
    expect(state.gameOver).toBe(true)
    expect(state.winner).toBe('red')
    expect(state.alertMessage).toMatch(/Connection/i)
  })

  it('awards red a win by boxing in a white token', () => {
    const moves: Array<[number, number]> = [
      [0, 4], // red: top side
      [2, 10], // white elsewhere
      [2, 4], // red: bottom side
      [4, 10], // white elsewhere
      [1, 3], // red: left side
      [6, 10], // white elsewhere
      [1, 5], // red: right side -> box completed
    ]
    let state = initialState
    for (const [row, col] of moves) {
      state = gameReducer(state, { type: 'PLACE', row, col })
    }
    expect(state.gameOver).toBe(true)
    expect(state.winner).toBe('red')
    expect(state.alertMessage).toMatch(/Boxing/i)
  })

  it('declares a draw when both players exhaust their reserves', () => {
    const state = makeState({
      tilesPlaced: { red: MAX_TILES, white: MAX_TILES - 1 },
      currentPlayer: 'white',
    })
    const next = gameReducer(state, { type: 'PLACE', row: 2, col: 0 })
    expect(next.gameOver).toBe(true)
    expect(next.winner).toBeNull()
    expect(next.alertMessage).toMatch(/draw/i)
  })

  it('RESET restores the initial state', () => {
    const state = gameReducer(initialState, { type: 'RESET' })
    expect(state).toEqual(initialState)
  })

  it('START_AI sets the mode and human player', () => {
    const state = gameReducer(initialState, { type: 'START_AI', human: 'white' })
    expect(state.gameMode).toBe('ai')
    expect(state.humanPlayer).toBe('white')
    expect(state.currentPlayer).toBe('red')
    expect(state.tilesPlaced).toEqual({ red: 0, white: 0 })
  })
})
