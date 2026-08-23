import redWinsBoxIn from '../img/red_wins_box-in.png'
import redWinsConnection from '../img/red_wins_connection.png'
import whiteWinsBoxIn from '../img/white_wins_box-in.png'
import whiteWinsConnection from '../img/white_wins_connection.png'

interface RulesScreenProps {
  onBack: () => void
}

const IMG_CLASS = 'w-full rounded border border-white/10'

function RulesScreen({ onBack }: Readonly<RulesScreenProps>) {
  return (
    <main data-testid="rules-screen" className="box-border flex min-h-screen flex-col items-center p-5">
      <div className="flex w-full max-w-[1100px] items-center justify-end">
        <button
          type="button"
          onClick={onBack}
          data-testid="rules-back"
          className="cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5 [font-family:Arial,sans-serif]"
        >
          Back
        </button>
      </div>

      <div className="mt-6 w-full max-w-[520px]">
        <h2 className="mb-[10px] mt-0 border-b border-[rgba(246,178,82,0.2)] pb-1 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
          Objectives
        </h2>

        <p className="mb-[10px] mt-0 text-sm leading-[1.4] text-[#ddd] [font-family:Arial,sans-serif]">
          The winner is the first to either:
        </p>

        <div className="flex flex-col gap-[10px]">
          <div>
            <p className="mb-[8px] mt-0 text-sm leading-[1.4] text-[#ddd] [font-family:Arial,sans-serif]">
              Connect two opposite sides of the board with your tiles —
              vertically for red, horizontally for white.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <img src={redWinsConnection} alt="Red wins by connecting the sides" data-testid="img-red-connection" className={IMG_CLASS} />
              <img src={whiteWinsConnection} alt="White wins by connecting the sides" data-testid="img-white-connection" className={IMG_CLASS} />
            </div>
          </div>

          <p className="m-0 py-1 text-center text-2xl font-bold text-[#f6b252]">or</p>

          <div>
            <p className="mb-[8px] mt-0 text-sm leading-[1.4] text-[#ddd] [font-family:Arial,sans-serif]">
              Box in an opponent's chain.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <img src={redWinsBoxIn} alt="Red wins by boxing in an opponent's chain" data-testid="img-red-boxin" className={IMG_CLASS} />
              <img src={whiteWinsBoxIn} alt="White wins by boxing in an opponent's chain" data-testid="img-white-boxin" className={IMG_CLASS} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default RulesScreen
