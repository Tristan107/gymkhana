import { useEffect, useRef, useState } from 'react'
import type { Player } from '../types'

interface MenuScreenProps {
  onPlayPvP: () => void
  onPlayAI: (human: Player) => void
  onPlayOnline: () => void
  onShowRules: () => void
}

const TITLE = 'Gymkhana'
const TAGLINE = 'Easy to Learn, hard to master.'
const PRIMARY_BUTTON =
  'cursor-pointer rounded-md border-none bg-[#e0e0e0] px-5 py-3 text-[15px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]'
const GOLD_BUTTON =
  'cursor-pointer rounded-md border-none bg-[#f6b252] px-5 py-3 text-[15px] font-bold text-[#1a1a1a] transition-colors duration-200 active:scale-[0.98] hover:brightness-110 [font-family:Arial,sans-serif]'

function MenuScreen({ onPlayPvP, onPlayAI, onPlayOnline, onShowRules }: MenuScreenProps) {
  const [sidePickerOpen, setSidePickerOpen] = useState(false)
  const sidePickerRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = sidePickerRef.current
    if (dialog === null) return
    if (sidePickerOpen && !dialog.open) {
      dialog.showModal()
    } else if (!sidePickerOpen && dialog.open) {
      dialog.close()
    }
  }, [sidePickerOpen])

  return (
    <div className="box-border flex min-h-screen flex-col items-center justify-center gap-8 p-5">
      <div className="text-center">
        <h1 className="m-0 flex justify-center text-[42px] uppercase leading-none tracking-[2px] min-[480px]:text-[64px]">
          {TITLE.split('').map((char, index) => (
            <span
              key={index}
              className={index % 2 === 0 ? 'text-[#fdfaf2]' : 'text-[#c9182b]'}
              style={{ textShadow: '3px 4px 0px rgba(0,0,0,0.6)' }}
            >
              {char}
            </span>
          ))}
        </h1>
        <div className="mt-2 text-xs font-bold uppercase tracking-[2px] text-[#f6b252] [font-family:Arial,sans-serif] min-[480px]:text-sm">
          {TAGLINE}
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button type="button" onClick={onPlayOnline} className={PRIMARY_BUTTON}>
          Play online game
        </button>
        <button type="button" onClick={onPlayPvP} className={PRIMARY_BUTTON}>
          Play local game
        </button>
        <button
          type="button"
          onClick={() => setSidePickerOpen(true)}
          className={PRIMARY_BUTTON}
        >
          Play vs AI
        </button>
        <button type="button" onClick={onShowRules} className={GOLD_BUTTON}>
          How to Play
        </button>
      </div>

      <dialog
        ref={sidePickerRef}
        onClose={() => setSidePickerOpen(false)}
        className="m-auto w-[calc(100%-32px)] max-w-xs rounded-lg border border-white/10 p-6 text-[#fdfaf2] shadow-2xl [font-family:Arial,sans-serif] [background:radial-gradient(circle,#152b3c_0%,#0b141d_100%)] backdrop:bg-black/60"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
            Choose your side
          </h2>
          <button
            type="button"
            onClick={() => setSidePickerOpen(false)}
            aria-label="Close side selection"
            className="cursor-pointer rounded-md border border-white/20 bg-transparent px-2.5 py-0.5 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 mt-0 text-sm text-[#aaa]">
          Red always makes the first move.
        </p>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => onPlayAI('red')}
            aria-label="Play as Red"
            className="h-9 w-9 cursor-pointer rounded-md border-none bg-[#ff3344] transition-colors duration-200 active:scale-[0.95] hover:brightness-110"
          />
          <button
            type="button"
            onClick={() => onPlayAI('white')}
            aria-label="Play as White"
            className="h-9 w-9 cursor-pointer rounded-md border-none bg-[#e0e0e0] transition-colors duration-200 active:scale-[0.95] hover:bg-[#c9c9c9]"
          />
          <button
            type="button"
            onClick={() => setSidePickerOpen(false)}
            className="mt-1 cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2 text-[13px] text-[#ccc] transition-colors duration-200 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  )
}

export default MenuScreen
