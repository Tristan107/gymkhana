import { MAX_TILES, PLAYER_COLORS } from '../constants'
import type { Player } from '../types'

interface StatusBarProps {
  currentPlayer: Player
  tilesPlaced: Record<Player, number>
  gameMode: 'pvp' | 'ai'
  humanPlayer: Player | null
}

function StatusBar({ currentPlayer, tilesPlaced, gameMode, humanPlayer }: StatusBarProps) {
  const color = PLAYER_COLORS[currentPlayer]
  const glow = currentPlayer === 'red'
    ? '0 0 8px rgba(255,51,68,0.6)'
    : '0 0 8px rgba(255,255,255,0.6)'

  const turnLabel = gameMode === 'ai' && humanPlayer !== null
    ? `${currentPlayer.toUpperCase()} (${currentPlayer === humanPlayer ? 'You' : 'Computer'})`
    : currentPlayer.toUpperCase()

  return (
    <div className="box-border flex w-[448px] items-center justify-between rounded-md border border-white/10 bg-white/5 p-3 text-sm [font-family:Arial,sans-serif]">
      <div className="flex items-center gap-1.5 font-bold">
        <span className="h-4 w-4 rounded-[2px] bg-[#ff3344]" />
        <span>Red Left: {MAX_TILES - tilesPlaced.red}</span>
      </div>
      <div className="flex items-center gap-1.5 font-bold">
        <span>Turn: </span>
        <span style={{ color, textShadow: glow }}>
          {turnLabel}
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-bold">
        <span className="h-4 w-4 rounded-[2px] bg-white" />
        <span>White Left: {MAX_TILES - tilesPlaced.white}</span>
      </div>
    </div>
  )
}

export default StatusBar
