import redWinsBoxIn from '../img/red_wins_box-in.png'
import redWinsConnection from '../img/red_wins_connection.png'
import whiteWinsBoxIn from '../img/white_wins_box-in.png'
import whiteWinsConnection from '../img/white_wins_connection.png'

function RulesPanel() {
  return (
    <aside className="box-border flex flex-1 flex-col overflow-visible rounded-lg border border-white/10 bg-white/[0.06] p-5 backdrop-blur-[5px] [font-family:Arial,sans-serif]">
      <h2 className="mb-1.5 mt-0 border-b border-[rgba(246,178,82,0.2)] pb-1 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
        Objectives
      </h2>
      <p className="mb-[10px] mt-0 text-sm leading-[1.4] text-[#ddd]">
        The winner is the first to:
      </p>
      <div className="flex flex-col gap-[10px]">
        <div>
          <p className="mb-[8px] mt-0 text-sm leading-[1.4] text-[#ddd]">
            Connect two opposite sides of the board with your tiles —
            vertically for red, horizontally for white.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <img
              src={redWinsConnection}
              alt="Red wins by connecting the sides"
              className="w-full rounded border border-white/10"
            />
            <img
              src={whiteWinsConnection}
              alt="White wins by connecting the sides"
              className="w-full rounded border border-white/10"
            />
          </div>
        </div>
        <p className="m-0 text-center text-sm font-bold text-[#f6b252]">or</p>
        <div>
          <p className="mb-[8px] mt-0 text-sm leading-[1.4] text-[#ddd]">
            Box in an opponent's chain to prevent it from being able to move.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <img
              src={redWinsBoxIn}
              alt="Red wins by boxing in an opponent's chain"
              className="w-full rounded border border-white/10"
            />
            <img
              src={whiteWinsBoxIn}
              alt="White wins by boxing in an opponent's chain"
              className="w-full rounded border border-white/10"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default RulesPanel
