import type { Board as BoardType, Player } from '../types'
import Board from './Board'
import GameOverOverlay from './GameOverOverlay'
import Header from './Header'
import StatusBar from './StatusBar'
import { MAX_TILES } from '../constants'

interface GameScreenProps {
  currentPlayer: Player
  tilesPlaced: Record<Player, number>
  gameMode: 'pvp' | 'ai' | 'online'
  humanPlayer: Player | null
  board: BoardType
  gameOver: boolean
  alertMessage: string | null
  winner: Player | null
  onCellClick: (row: number, col: number) => void
  onPlayAgain: () => void
  playAgainLabel: string
  onMenu: () => void
  onShowRules: () => void
  interactive?: boolean
}

function GameScreen({
  currentPlayer,
  tilesPlaced,
  gameMode,
  humanPlayer,
  board,
  gameOver,
  alertMessage,
  winner,
  onCellClick,
  onPlayAgain,
  playAgainLabel,
  onMenu,
  onShowRules,
  interactive = true,
}: GameScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center p-5 box-border">
      <Header />

      <div className="flex w-full max-w-[1100px] flex-col items-center gap-10 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-center">
        <div className="flex flex-col items-center gap-[15px]">
          <StatusBar
            currentPlayer={currentPlayer}
            gameMode={gameMode}
            humanPlayer={humanPlayer}
          />
          <div className="relative">
            <Board
              board={board}
              currentPlayer={currentPlayer}
              gameOver={gameOver}
              tilesPlaced={tilesPlaced}
              interactive={interactive}
              onCellClick={onCellClick}
            />
            <GameOverOverlay
              gameOver={gameOver}
              message={alertMessage}
              winner={winner}
              onPlayAgain={onPlayAgain}
              playAgainLabel={playAgainLabel}
            />
          </div>
        </div>

        <div className="flex w-full flex-row justify-center gap-3 min-[901px]:w-[160px] min-[901px]:flex-col">
          <button
            type="button"
            onClick={onMenu}
            className="cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2.5 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5 [font-family:Arial,sans-serif]"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={onShowRules}
            className="cursor-pointer rounded-md border-none bg-[#f6b252] px-5 py-2.5 text-[13px] font-bold text-[#1a1a1a] transition-colors duration-200 active:scale-[0.98] hover:brightness-110 [font-family:Arial,sans-serif]"
          >
            How to Play
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]"
          >
            {playAgainLabel}
          </button>
          <div className="mt-1 flex flex-row justify-center gap-3 min-[901px]:flex-col">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#ddd] [font-family:Arial,sans-serif]">
              <span className="h-3 w-3 rounded-[2px] bg-[#ff3344]" />
              <span>Red tiles left: {MAX_TILES - tilesPlaced.red}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#ddd] [font-family:Arial,sans-serif]">
              <span className="h-3 w-3 rounded-[2px] bg-white" />
              <span>White tiles left: {MAX_TILES - tilesPlaced.white}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameScreen
