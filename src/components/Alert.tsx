import type { Player } from '../types'

interface AlertProps {
  message: string | null
  winner: Player | null
}

function Alert({ message, winner }: AlertProps) {
  if (message === null) return null

  const isRed = winner === 'red'
  const theme = isRed
    ? 'border-[#ff3344] bg-[#5a1219] text-[#ff9999]'
    : 'border-white bg-[#333] text-white'

  return (
    <div
      className={`box-border w-[448px] rounded-md border p-3 text-center font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${theme} [font-family:Arial,sans-serif]`}
    >
      {message}
    </div>
  )
}

export default Alert
