const TITLE = 'Connections'

interface HeaderProps {
  onReset: () => void
}

function Header({ onReset }: HeaderProps) {
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
      <button
        type="button"
        onClick={onReset}
        className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]"
      >
        Restart Game
      </button>
    </header>
  )
}

export default Header
