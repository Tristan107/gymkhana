import { useState } from 'react'
import type { ParseResult } from '../game/boardFile'

interface DevMenuProps {
  onExport: () => void
  onImportText: (text: string) => ParseResult
  onClose: () => void
}

const buttonBase =
  'cursor-pointer rounded-md px-5 py-2.5 text-[13px] font-bold transition-colors duration-200 active:scale-[0.98] [font-family:Arial,sans-serif]'

function DevMenu({ onExport, onImportText, onClose }: DevMenuProps) {
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleExport = () => {
    setCopied(false)
    onExport()
    setCopied(true)
  }

  const handleImportPasted = () => {
    setError(null)
    const result = onImportText(pasteText)
    if (result.ok) {
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex w-[320px] flex-col gap-4 rounded-lg border border-white/20 bg-[#151515] p-6 shadow-xl [font-family:Arial,sans-serif]">
        <h2 className="m-0 text-center text-base font-bold text-[#fdfaf2]">
          Developer Menu
        </h2>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleExport}
            className={`${buttonBase} border-none bg-[#f6b252] text-[#1a1a1a] hover:brightness-110`}
          >
            Export board
          </button>
          {copied && (
            <p className="m-0 rounded-md border border-green-400/40 bg-[#0f2a12] px-3 py-2 text-[13px] font-bold text-[#99ff99]">
              Board copied to clipboard!
            </p>
          )}
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={'Turn: red\n\n11 . . . . . . . . . .\n...'}
            className="w-full resize-y rounded-md border border-white/20 bg-[#0d0d0d] p-2 text-[12px] text-[#fdfaf2] outline-none focus:border-white/40 [font-family:monospace]"
          />
          <button
            type="button"
            onClick={handleImportPasted}
            className={`${buttonBase} border-none bg-[#e0e0e0] text-[#333] hover:bg-[#c8c8c8]`}
          >
            Import board
          </button>
        </div>
        {error !== null && (
          <p className="m-0 rounded-md border border-red-400/40 bg-[#2a0f12] px-3 py-2 text-[13px] font-bold text-[#ff9999]">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className={`${buttonBase} border border-white/20 bg-transparent text-[#ccc] hover:bg-white/5`}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default DevMenu
