import { useEffect, useState } from 'react'
import type { Player } from '../types'

interface GameOverOverlayProps {
  gameOver: boolean
  message: string | null
  winner: Player | null
  onPlayAgain: () => void
  playAgainLabel?: string
  showPlayAgain?: boolean
  onRematch?: () => void
  rematchLabel?: string
}

const ACTION_BUTTON =
  'cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]'

function GameOverOverlay({
  gameOver,
  message,
  winner,
  onPlayAgain,
  playAgainLabel = 'Play Again',
  showPlayAgain = true,
  onRematch,
  rematchLabel = 'Rematch',
}: Readonly<GameOverOverlayProps>) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [gameOver, message])

  if (!gameOver || message === null || dismissed) return null

  const isRed = winner === 'red'
  let accent = 'text-white'
  if (isRed) accent = 'text-[#ff9999]'
  else if (winner === null) accent = 'text-[#ccc]'

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-md bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Close result"
        className="absolute top-2 right-2 cursor-pointer rounded-md border border-white/20 bg-transparent px-2.5 py-0.5 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5"
      >
        ✕
      </button>
      <div
        className={`px-6 text-center text-2xl font-bold tracking-wide uppercase ${accent} [font-family:Arial,sans-serif]`}
      >
        {message}
      </div>
      {showPlayAgain && (
        <button type="button" onClick={onPlayAgain} className={ACTION_BUTTON}>
          {playAgainLabel}
        </button>
      )}
      {onRematch !== undefined && (
        <button type="button" onClick={onRematch} className={ACTION_BUTTON}>
          {rematchLabel}
        </button>
      )}
    </div>
  )
}

export default GameOverOverlay
