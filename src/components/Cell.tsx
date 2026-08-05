import { MAX_TILES } from '../constants'
import { getTileOrientation, isCellPlayable, isFixedPeg } from '../game/logic'
import type { Board as BoardType, Player } from '../types'

interface CellProps {
  row: number
  col: number
  board: BoardType
  currentPlayer: Player
  gameOver: boolean
  tilesPlaced: Record<Player, number>
  interactive: boolean
  hovered: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function Cell({
  row,
  col,
  board,
  currentPlayer,
  gameOver,
  tilesPlaced,
  interactive,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CellProps) {
  const value = board[row][col]
  const peg = isFixedPeg(row, col)
  const playable = value === null && isCellPlayable(board, row, col, currentPlayer, gameOver)
  const previewVisible = interactive && playable && hovered && tilesPlaced[currentPlayer] < MAX_TILES

  let className = 'cell'
  if (value !== null) className += ' occupied'
  else if (playable && interactive) className += ' playable'
  else className += ' unplayable'

  return (
    <div
      className={className}
      onClick={playable && interactive ? onClick : undefined}
      onMouseEnter={interactive && playable ? onMouseEnter : undefined}
      onMouseLeave={interactive && playable ? onMouseLeave : undefined}
    >
      {value !== null ? (
        peg ? (
          <div className={`square ${value}`} />
        ) : (
          <div className="tile">
            <div className={`tile-rect ${value} ${getTileOrientation(board, row, col)}`} />
          </div>
        )
      ) : previewVisible ? (
        <div className="tile preview">
          <div
            className={`tile-rect ${currentPlayer} ${getTileOrientation(board, row, col, currentPlayer)}`}
          />
        </div>
      ) : null}
    </div>
  )
}

export default Cell
