import { useRef, useState } from 'react'
import type { ParseResult } from '../game/boardFile'

interface DevMenuProps {
  onExport: () => void
  onImportText: (text: string) => ParseResult
  onClose: () => void
}

const buttonBase =
  'cursor-pointer rounded-md px-5 py-2.5 text-[13px] font-bold transition-colors duration-200 active:scale-[0.98] [font-family:Arial,sans-serif]'

function DevMenu({ onExport, onImportText, onClose }: DevMenuProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    const text = await file.text()
    const result = onImportText(text)
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
            onClick={onExport}
            className={`${buttonBase} border-none bg-[#f6b252] text-[#1a1a1a] hover:brightness-110`}
          >
            Export board
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`${buttonBase} border-none bg-[#e0e0e0] text-[#333] hover:bg-[#c8c8c8]`}
          >
            Import board
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
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
