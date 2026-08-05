import { useEffect, useState } from 'react'
import { PLAYER_COLORS } from '../constants'
import type { Player } from '../types'

const TURN_SECONDS = 60

interface StatusBarProps {
  currentPlayer: Player
  gameMode: 'pvp' | 'ai' | 'online'
  humanPlayer: Player | null
}

function StatusBar({ currentPlayer, gameMode, humanPlayer }: StatusBarProps) {
  const color = PLAYER_COLORS[currentPlayer]
  const glow = currentPlayer === 'red'
    ? '0 0 8px rgba(255,51,68,0.6)'
    : '0 0 8px rgba(255,255,255,0.6)'

  const isYourTurn = gameMode === 'pvp' || (humanPlayer !== null && currentPlayer === humanPlayer)

  const [seconds, setSeconds] = useState(TURN_SECONDS)

  useEffect(() => {
    setSeconds(TURN_SECONDS)
  }, [currentPlayer])

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((previous) => Math.max(0, previous - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const minutes = Math.floor(seconds / 60)
  const secondsPart = seconds % 60
  const timerText = `${String(minutes).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`

  return (
    <div className="box-border flex w-[448px] items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-sm [font-family:Arial,sans-serif]">
      {isYourTurn && (
        <>
          <span className="font-bold" style={{ color, textShadow: glow }}>
            Your turn
          </span>
          <span className="text-[13px] font-bold text-[#ddd] [font-family:Arial,sans-serif]">
            - {timerText}
          </span>
        </>
      )}
    </div>
  )
}

export default StatusBar
