import { useOnlineGame } from '../hooks/useOnlineGame'
import GameScreen from './GameScreen'

interface OnlineGameScreenProps {
  code: string
  playerId: string
  onLeave: () => void
  onShowRules: () => void
}

function OnlineGameScreen({ code, playerId, onLeave, onShowRules }: OnlineGameScreenProps) {
  const { room, state, isMyTurn, error, closed, place, leave } = useOnlineGame(code, playerId)

  const handleLeave = () => {
    leave()
    onLeave()
  }

  if (closed && !state.gameOver) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-5">
        <p className="m-0 text-center text-lg font-bold text-[#fdfaf2] [font-family:Arial,sans-serif]">
          Your opponent left the game.
        </p>
        <button
          type="button"
          onClick={handleLeave}
          className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]"
        >
          Back to menu
        </button>
      </div>
    )
  }

  if (room === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-bold text-[#ddd] [font-family:Arial,sans-serif]">
        Connecting to game…
      </div>
    )
  }

  return (
    <>
      {error !== null && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-red-400/40 bg-[#2a0f12] px-4 py-2 text-sm font-bold text-[#ff9999] [font-family:Arial,sans-serif]">
          {error}
        </div>
      )}
      <GameScreen
        currentPlayer={state.currentPlayer}
        tilesPlaced={state.tilesPlaced}
        gameMode={state.gameMode}
        humanPlayer={state.humanPlayer}
        board={state.board}
        gameOver={state.gameOver}
        alertMessage={state.alertMessage}
        winner={state.winner}
        onCellClick={(row, col) => {
          if (isMyTurn) place(row, col)
        }}
        interactive={isMyTurn}
        onPlayAgain={handleLeave}
        playAgainLabel="Leave game"
        onMenu={handleLeave}
        onShowRules={onShowRules}
      />
    </>
  )
}

export default OnlineGameScreen
