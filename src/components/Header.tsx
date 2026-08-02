import type { Player } from '../types'

const TITLE = 'Gymkhana'

interface HeaderProps {
  onReset: () => void
  onStartAI: (human: Player) => void
}

function Header({ onReset, onStartAI }: HeaderProps) {
  return (
    <header className="relative mb-5 flex w-full max-w-[1100px] flex-col items-center gap-[15px] text-center min-[901px]:flex-row min-[901px]:justify-between min-[901px]:text-left">
      <div>
        <h1 className="m-0 flex justify-center text-[46px] uppercase leading-none tracking-[2px] min-[901px]:justify-start">
          {TITLE.split('').map((char, index) => (
            <span
              key={index}
              className={
                index % 2 === 0
                  ? 'text-[#fdfaf2]'
                  : 'text-[#c9182b]'
              }
              style={{ textShadow: '3px 4px 0px rgba(0,0,0,0.6)' }}
            >
              {char}
            </span>
          ))}
        </h1>
        <div className="mt-1 text-xs font-bold uppercase tracking-[2px] text-[#f6b252] [font-family:Arial,sans-serif]">
          Easy to Learn, hard to master.
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 min-[901px]:flex-row">
        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]"
        >
          Restart Game
        </button>
        <button
          type="button"
          onClick={() => (document.getElementById('game-mode-dialog') as HTMLDialogElement).showModal()}
          className="cursor-pointer rounded-md border-none bg-[#2a2a2a] px-6 py-2.5 text-[13px] font-bold text-[#fdfaf2] transition-colors duration-200 active:scale-[0.98] hover:bg-[#3a3a3a] [font-family:Arial,sans-serif]"
        >
          Play vs Computer
        </button>
      </div>
      <dialog
        id="game-mode-dialog"
        className="max-w-md rounded-lg border border-white/10 bg-[#1a1a1a] p-6 text-[#fdfaf2] shadow-2xl [font-family:Arial,sans-serif] backdrop:bg-black/60"
      >
        <h2 className="m-0 mb-1 text-center text-lg font-bold">
          Chose your side
        </h2>
        <p className="m-0 mb-4 text-center text-sm text-[#aaa]">
          Red always makes the first move.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onStartAI('red')
              closeDialog()
            }}
            className="cursor-pointer rounded-md border-none bg-[#ff3344] px-5 py-3 text-[15px] font-bold text-white transition-colors duration-200 active:scale-[0.98] hover:brightness-110"
          >
            Play Red <span className="font-normal text-white/70">(you move first)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onStartAI('white')
              closeDialog()
            }}
            className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-5 py-3 text-[15px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c9c9c9]"
          >
            Play White <span className="font-normal text-black/50">(computer moves first)</span>
          </button>
          <button
            type="button"
            onClick={() => closeDialog()}
            className="mt-1 cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2 text-[13px] text-[#ccc] transition-colors duration-200 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </header>
  )
}

function closeDialog() {
  (document.getElementById('game-mode-dialog') as HTMLDialogElement).close()
}

export default Header