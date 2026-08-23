import type { Player } from '../types'

interface GameOverPanelProps {
  gameOver: boolean
  message: string | null
  winner: Player | null
}

function getAccentColor(winner: Player | null): string {
  if (winner === 'red') return '#ff3344'
  if (winner === 'white') return '#ffffff'
  return '#888888'
}

function GameOverPanel({ gameOver, message, winner }: Readonly<GameOverPanelProps>) {
  if (!gameOver || message === null) return null

  const accent = getAccentColor(winner)

  return (
    <div
      data-testid="game-over-panel"
      className="animate-slide-up-fade relative w-full overflow-hidden rounded-md border border-white/10 bg-white/5 p-3 text-left"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-[2px]"
          style={{
            backgroundColor: accent,
            boxShadow: `inset 0 0 4px ${accent}88`,
          }}
        />
        <span
          data-testid="win-message"
          className="text-sm font-bold uppercase tracking-wide text-[#ddd] [font-family:Arial,sans-serif]"
        >
          {message}
        </span>
      </div>
      <div
        className="animate-draw-underline mt-2 h-[3px] w-full origin-left rounded-full"
        style={{ backgroundColor: accent }}
      />
    </div>
  )
}

export default GameOverPanel
