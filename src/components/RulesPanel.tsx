function RulesPanel() {
  return (
    <aside className="box-border flex flex-1 flex-col overflow-visible rounded-lg border border-white/10 bg-white/[0.06] p-5 backdrop-blur-[5px] [font-family:Arial,sans-serif]">
      <h2 className="mb-1.5 mt-0 border-b border-[rgba(246,178,82,0.2)] pb-1 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
        Objectives
      </h2>
      <p className="mb-[14px] mt-0 text-xs leading-[1.4] text-[#ddd]">
        To establish a line or CONNECTION of your color tiles across the board
        by connecting your color squares OR box-in your opponents colored square
        or surround a series of your opponents moves.
      </p>

      <h2 className="mb-1.5 mt-0 border-b border-[rgba(246,178,82,0.2)] pb-1 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
        Definitions
      </h2>
      <p className="mb-[14px] mt-0 text-xs leading-[1.4] text-[#ddd]">
        <strong>A box-in</strong> means to surround or establish an unbroken
        CONNECTION of your color tiles around either an opposing color square or
        any number of opposing color tiles or squares, even if those moves
        encompass your own color.
      </p>
      <p className="mb-[14px] mt-0 text-xs leading-[1.4] text-[#ddd]">
        <strong>A line or CONNECTION</strong> means to establish an unbroken
        line of your color tiles from any point on the board to your color
        squares on each end of the grid, no matter how direct or zig zag the
        CONNECTION.
      </p>

      <h2 className="mb-1.5 mt-0 border-b border-[rgba(246,178,82,0.2)] pb-1 text-sm font-bold uppercase tracking-[1px] text-[#f6b252]">
        How To Play
      </h2>
      <ul className="mb-0 mt-0 list-disc pl-4 text-xs leading-[1.5] text-[#ddd]">
        <li className="mb-1.5">
          Players sit at right angles to each other and choose either red or
          white tiles.
        </li>
        <li className="mb-1.5">Players take alternate turns beginning the game.</li>
        <li className="mb-1.5">
          Players place tiles of their color between like colored squares on
          board and may begin any place on the board.
        </li>
        <li className="mb-1.5">
          <strong>Placement Constraint:</strong> You can place a tile ONLY if its
          colored line directly connects 2 squares/tiles of your own color.
        </li>
        <li className="mb-1.5">
          Players must <strong>NOT</strong> place their tiles between{' '}
          <strong>their own</strong> colored square and the edge of the board.
          Players can place a tile between 2 of their own colored squares when
          these squares are on the board edge.
        </li>
        <li className="mb-1.5">
          Players do not have to place their color tiles end to end with the
          tiles already on the board.
        </li>
      </ul>
    </aside>
  )
}

export default RulesPanel
