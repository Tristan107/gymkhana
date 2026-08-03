import { MAX_TILES, OPPONENT } from '../constants'
import type { Board, Player } from '../types'
import {
  checkConnectionWin,
  checkSurroundWin,
  createBoard,
  isBoardFull,
  isCellPlayable,
} from './logic'

export interface GameState {
  board: Board
  currentPlayer: Player
  gameOver: boolean
  winner: Player | null
  tilesPlaced: Record<Player, number>
  alertMessage: string | null
  gameMode: 'pvp' | 'ai'
  humanPlayer: Player | null
}

export type GameAction =
  | { type: 'PLACE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'START_AI'; human: Player }

export const initialState: GameState = createInitialState()

function createInitialState(): GameState {
  return {
    board: createBoard(),
    currentPlayer: 'red',
    gameOver: false,
    winner: null,
    tilesPlaced: { red: 0, white: 0 },
    alertMessage: null,
    gameMode: 'pvp',
    humanPlayer: null,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return createInitialState()

    case 'START_AI':
      return {
        ...createInitialState(),
        gameMode: 'ai',
        humanPlayer: action.human,
      }

    case 'PLACE': {
      const { row, col } = action
      if (
        state.gameOver ||
        state.board[row][col] !== null ||
        state.tilesPlaced[state.currentPlayer] >= MAX_TILES ||
        !isCellPlayable(state.board, row, col, state.currentPlayer, state.gameOver)
      ) {
        return state
      }

      const player = state.currentPlayer
      const board = state.board.map((rowCells) => [...rowCells])
      board[row][col] = player
      const tilesPlaced: Record<Player, number> = {
        ...state.tilesPlaced,
        [player]: state.tilesPlaced[player] + 1,
      }

      if (checkConnectionWin(board, player)) {
        return {
          ...state,
          board,
          tilesPlaced,
          gameOver: true,
          winner: player,
          alertMessage: `${player.toUpperCase()} wins by Connection!`,
        }
      }
      if (checkSurroundWin(board, player)) {
        return {
          ...state,
          board,
          tilesPlaced,
          gameOver: true,
          winner: player,
          alertMessage: `${player.toUpperCase()} wins by Boxing-In!`,
        }
      }
      if (isBoardFull(board) || (tilesPlaced.red === MAX_TILES && tilesPlaced.white === MAX_TILES)) {
        return {
          ...state,
          board,
          tilesPlaced,
          gameOver: true,
          winner: null,
          alertMessage: "It's a draw!",
        }
      }
      return {
        ...state,
        board,
        tilesPlaced,
        currentPlayer: OPPONENT[player],
      }
    }

    default:
      return state
  }
}
