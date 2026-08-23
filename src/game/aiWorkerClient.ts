import type { Board, Player } from '../types'
import type { Move } from './ai_mcts'

interface AiRequest {
  id: number
  board: Board
  player: Player
  tilesPlaced: Record<Player, number>
  gameOver: boolean
}

interface AiResponse {
  id: number
  move: Move | null
}

let worker: Worker | null = null
let nextRequestId = 0
const pending = new Map<number, (move: Move | null) => void>()

function getWorker(): Worker {
  if (worker === null) {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<AiResponse>) => {
      const resolve = pending.get(event.data.id)
      if (resolve !== undefined) {
        pending.delete(event.data.id)
        resolve(event.data.move)
      }
    }
  }
  return worker
}

export function requestAiMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Promise<Move | null> {
  const w = getWorker()
  const id = ++nextRequestId
  return new Promise((resolve) => {
    pending.set(id, resolve)
    w.postMessage({ id, board, player, tilesPlaced, gameOver } satisfies AiRequest)
  })
}

export function cancelPendingAiMoves(): void {
  pending.clear()
}
