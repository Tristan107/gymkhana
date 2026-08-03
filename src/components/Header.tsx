const TITLE = 'Gymkhana'
const TAGLINE = 'Easy to Learn, hard to master.'

function Header() {
  return (
    <header className="relative mb-5 flex w-full max-w-[1100px] flex-col items-center justify-center gap-2 text-center">
      <h1 className="m-0 flex text-[26px] uppercase leading-none tracking-[2px]">
        {TITLE.split('').map((char, index) => (
          <span
            key={index}
            className={index % 2 === 0 ? 'text-[#fdfaf2]' : 'text-[#c9182b]'}
            style={{ textShadow: '2px 3px 0px rgba(0,0,0,0.6)' }}
          >
            {char}
          </span>
        ))}
      </h1>
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#f6b252] [font-family:Arial,sans-serif]">
        {TAGLINE}
      </div>
    </header>
  )
}

export default Header
