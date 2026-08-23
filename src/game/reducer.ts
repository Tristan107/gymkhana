import { MAX_TILES } from '../constants'
import type { Board, Player, FlatBoard, PlayerCode } from '../types'
import type { ParsedGame } from './boardFile'
import { createBoard, toPublicBoard, fromPublicBoard } from './logic'
import { createFlatBoard, cloneBoard, applyMove, checkConnectionWin, checkSurroundWin } from './flatBoard'

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

interface InternalGameState {
  board: FlatBoard
  currentPlayer: PlayerCode
  gameOver: boolean
  winner: PlayerCode | 0
  tilesPlaced: [number, number]
  lastMove: { row: number; col: number } | null
  alertMessage: string | null
  gameMode: 'pvp' | 'ai' | 'online'
  humanPlayer: PlayerCode | 0
  moveHistory: MoveRecord[]
}

function playerToCode(player: Player): PlayerCode {
  return player === 'red' ? 1 : 2
}

function codeToPlayer(code: PlayerCode): Player | null {
  if (code === 1) return 'red'
  if (code === 2) return 'white'
  return null
}

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

function createInternalState(): InternalGameState {
  return {
    board: createFlatBoard(),
    currentPlayer: 1,
    gameOver: false,
    winner: 0,
    tilesPlaced: [0, 0],
    lastMove: null,
    alertMessage: null,
    gameMode: 'pvp',
    humanPlayer: 0,
    moveHistory: [],
  }
}

function toPublicState(internal: InternalGameState): GameState {
  return {
    board: toPublicBoard(internal.board),
    currentPlayer: internal.currentPlayer === 1 ? 'red' : 'white',
    gameOver: internal.gameOver,
    winner: codeToPlayer(internal.winner),
    tilesPlaced: { red: internal.tilesPlaced[0], white: internal.tilesPlaced[1] },
    lastMove: internal.lastMove,
    alertMessage: internal.alertMessage,
    gameMode: internal.gameMode,
    humanPlayer: codeToPlayer(internal.humanPlayer),
    moveHistory: internal.moveHistory,
  }
}

function fromPublicState(state: GameState): InternalGameState {
  const internal = createInternalState()
  fromPublicBoard(state.board, internal.board)
  internal.currentPlayer = playerToCode(state.currentPlayer)
  internal.gameOver = state.gameOver
  internal.winner = state.winner ? playerToCode(state.winner) : 0
  internal.tilesPlaced = [state.tilesPlaced.red, state.tilesPlaced.white]
  internal.lastMove = state.lastMove
  internal.alertMessage = state.alertMessage
  internal.gameMode = state.gameMode
  internal.humanPlayer = state.humanPlayer ? playerToCode(state.humanPlayer) : 0
  internal.moveHistory = state.moveHistory
  return internal
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let internal: InternalGameState
  let internalUnchanged = false
  
  if (action.type === 'LOAD_BOARD') {
    internal = createInternalState()
    fromPublicBoard(action.game.board, internal.board)
    internal.currentPlayer = playerToCode(action.game.currentPlayer)
    internal.tilesPlaced = [action.game.tilesPlaced.red, action.game.tilesPlaced.white]
    internal.gameOver = action.game.gameOver
    internal.winner = action.game.winner ? playerToCode(action.game.winner) : 0
    internal.alertMessage = action.game.alertMessage
    internal.moveHistory = []
    internal.gameMode = state.gameMode
    internal.humanPlayer = state.humanPlayer ? playerToCode(state.humanPlayer) : 0
    return toPublicState(internal)
  }

  internal = fromPublicState(state)
  const originalInternal = internal

  switch (action.type) {
    case 'RESET':
      internal = createInternalState()
      break

    case 'START_AI':
      internal = createInternalState()
      internal.gameMode = 'ai'
      internal.humanPlayer = playerToCode(action.human)
      break

    case 'PLACE':
      internal = applyPlace(internal, action.row, action.col)
      if (internal === originalInternal) internalUnchanged = true
      break

    case 'UNDO':
      internal = applyUndo(internal)
      if (internal === originalInternal) internalUnchanged = true
      break
  }

  if (internalUnchanged) return state
  return toPublicState(internal)
}

function applyPlace(internal: InternalGameState, row: number, col: number): InternalGameState {
  const idx = row * 11 + col
  if (
    internal.gameOver ||
    internal.board[idx] !== 0 ||
    internal.tilesPlaced[internal.currentPlayer - 1] >= MAX_TILES ||
    !isCellPlayablePublic(internal.board, row, col, internal.currentPlayer, internal.gameOver)
  ) {
    return internal
  }

  const player = internal.currentPlayer
  const board = cloneBoard(internal.board)
  applyMove(board, idx, player)
  const tilesPlaced: [number, number] = [
    internal.tilesPlaced[0] + (player === 1 ? 1 : 0),
    internal.tilesPlaced[1] + (player === 2 ? 1 : 0),
  ]
  const lastMove = { row, col }
  const moveHistory = [...internal.moveHistory, { player: codeToPlayer(player)!, row, col }]

  if (checkConnectionWin(board, player)) {
    return {
      ...internal,
      board,
      tilesPlaced,
      lastMove,
      moveHistory,
      gameOver: true,
      winner: player,
      alertMessage: `${codeToPlayer(player)!.toUpperCase()} wins by Connection!`,
    }
  }
  if (checkSurroundWin(board, player)) {
    return {
      ...internal,
      board,
      tilesPlaced,
      lastMove,
      moveHistory,
      gameOver: true,
      winner: player,
      alertMessage: `${codeToPlayer(player)!.toUpperCase()} wins by Boxing-In!`,
    }
  }
  if (tilesPlaced[0] === MAX_TILES && tilesPlaced[1] === MAX_TILES) {
    return {
      ...internal,
      board,
      tilesPlaced,
      lastMove,
      moveHistory,
      gameOver: true,
      winner: 0,
      alertMessage: "It's a draw!",
    }
  }
  return {
    ...internal,
    board,
    tilesPlaced,
    lastMove,
    moveHistory,
    currentPlayer: player === 1 ? 2 : 1,
  }
}

function isCellPlayablePublic(board: FlatBoard, row: number, col: number, player: PlayerCode, gameOver: boolean): boolean {
  if (gameOver || board[row * 11 + col] !== 0) return false
  if (player === 1) return col !== 0 && col !== 10
  return row !== 0 && row !== 10
}

function applyUndo(internal: InternalGameState): InternalGameState {
  if (
    internal.gameMode !== 'ai' ||
    internal.humanPlayer === 0 ||
    internal.moveHistory.length === 0
  ) {
    return internal
  }

  const aiPlayer = internal.humanPlayer === 1 ? 2 : 1
  const removed = new Set<number>()
  let aiFound = false
  let humanFound = false
  for (let i = internal.moveHistory.length - 1; i >= 0; i--) {
    const move = internal.moveHistory[i]
    const movePlayer = playerToCode(move.player)
    if (movePlayer === aiPlayer && !aiFound) {
      removed.add(i)
      aiFound = true
    } else if (movePlayer === internal.humanPlayer && !humanFound) {
      removed.add(i)
      humanFound = true
    }
    if (aiFound && humanFound) break
  }

  const moveHistory = internal.moveHistory.filter((_, i) => !removed.has(i))
  const board = createFlatBoard()
  const tilesPlaced: [number, number] = [0, 0]
  for (const move of moveHistory) {
    const idx = move.row * 11 + move.col
    const player = playerToCode(move.player)
    applyMove(board, idx, player)
    tilesPlaced[player - 1]++
  }

  return {
    ...internal,
    board,
    tilesPlaced,
    currentPlayer: internal.humanPlayer,
    gameOver: false,
    winner: 0,
    lastMove: moveHistory.at(-1) ?? null,
    alertMessage: null,
    moveHistory,
  }
}