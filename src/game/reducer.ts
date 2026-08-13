import { MAX_TILES, OPPONENT } from '../constants'
import type { Board, Player } from '../types'
import type { ParsedGame } from './boardFile'
import { checkConnectionWin, checkSurroundWin, createBoard, isCellPlayable } from './logic'

export interface MoveRecord {
  player: Player
  row: number
  col: number
}

export interface GameState {
  board: Board
  currentPlayer: Player
  gameOver: boolean
  winner: Player | null
  tilesPlaced: Record<Player, number>
  lastMove: { row: number; col: number } | null
  alertMessage: string | null
  gameMode: 'pvp' | 'ai' | 'online'
  humanPlayer: Player | null
  moveHistory: MoveRecord[]
}

export type GameAction =
  | { type: 'PLACE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'START_AI'; human: Player }
  | { type: 'LOAD_BOARD'; game: ParsedGame }
  | { type: 'UNDO' }

export const initialState: GameState = createInitialState()

function createInitialState(): GameState {
  return {
    board: createBoard(),
    currentPlayer: 'red',
    gameOver: false,
    winner: null,
    tilesPlaced: { red: 0, white: 0 },
    lastMove: null,
    alertMessage: null,
    gameMode: 'pvp',
    humanPlayer: null,
    moveHistory: [],
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

    case 'LOAD_BOARD':
      return {
        ...state,
        board: action.game.board,
        currentPlayer: action.game.currentPlayer,
        tilesPlaced: action.game.tilesPlaced,
        lastMove: null,
        gameOver: action.game.gameOver,
        winner: action.game.winner,
        alertMessage: action.game.alertMessage,
        moveHistory: [],
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
      const lastMove = { row, col }
      const moveHistory = [...state.moveHistory, { player, row, col }]

      if (checkConnectionWin(board, player)) {
        return {
          ...state,
          board,
          tilesPlaced,
          lastMove,
          moveHistory,
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
          lastMove,
          moveHistory,
          gameOver: true,
          winner: player,
          alertMessage: `${player.toUpperCase()} wins by Boxing-In!`,
        }
      }
      if (tilesPlaced.red === MAX_TILES && tilesPlaced.white === MAX_TILES) {
        return {
          ...state,
          board,
          tilesPlaced,
          lastMove,
          moveHistory,
          gameOver: true,
          winner: null,
          alertMessage: "It's a draw!",
        }
      }
      return {
        ...state,
        board,
        tilesPlaced,
        lastMove,
        moveHistory,
        currentPlayer: OPPONENT[player],
      }
    }

    case 'UNDO': {
      if (
        state.gameMode !== 'ai' ||
        state.humanPlayer === null ||
        state.moveHistory.length === 0
      ) {
        return state
      }

      const aiPlayer = OPPONENT[state.humanPlayer]
      const removed = new Set<number>()
      let aiFound = false
      let humanFound = false
      for (let i = state.moveHistory.length - 1; i >= 0; i--) {
        const move = state.moveHistory[i]
        if (move.player === aiPlayer && !aiFound) {
          removed.add(i)
          aiFound = true
        } else if (move.player === state.humanPlayer && !humanFound) {
          removed.add(i)
          humanFound = true
        }
        if (aiFound && humanFound) break
      }

      const moveHistory = state.moveHistory.filter((_, i) => !removed.has(i))
      const board = createBoard()
      const tilesPlaced: Record<Player, number> = { red: 0, white: 0 }
      for (const move of moveHistory) {
        board[move.row][move.col] = move.player
        tilesPlaced[move.player]++
      }

      return {
        ...state,
        board,
        tilesPlaced,
        currentPlayer: state.humanPlayer,
        gameOver: false,
        winner: null,
        lastMove: moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null,
        alertMessage: null,
        moveHistory,
      }
    }

    default:
      return state
  }
}
