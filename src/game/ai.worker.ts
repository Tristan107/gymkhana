import { chooseMove, setMCTSDifficulty } from './ai_mcts'
import type { Board, Player } from '../types'

setMCTSDifficulty('hard')

interface AiRequest {
  id: number
  board: Board
  player: Player
  tilesPlaced: Record<Player, number>
  gameOver: boolean
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, board, player, tilesPlaced, gameOver } = event.data
  const move = chooseMove(board, player, tilesPlaced, gameOver)
  self.postMessage({ id, move })
}
