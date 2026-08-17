import type { KeyboardEvent, ReactElement } from 'react'
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
  isLastMove: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function renderSquare(value: Player): ReactElement {
  return <div className={`square ${value}`} />
}

function renderTile(
  board: BoardType,
  row: number,
  col: number,
  value: Player,
  isLastMove: boolean
): ReactElement {
  return (
    <div className="tile">
      <div className={`tile-rect ${value} ${getTileOrientation(board, row, col)}`} />
      {isLastMove && <div className="last-move-dot" />}
    </div>
  )
}

function renderPreview(
  board: BoardType,
  row: number,
  col: number,
  currentPlayer: Player
): ReactElement {
  return (
    <div className="tile preview">
      <div
        className={`tile-rect ${currentPlayer} ${getTileOrientation(board, row, col, currentPlayer)}`}
      />
    </div>
  )
}

function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick: () => void): void {
  if (event.key === 'Enter' || event.key === ' ') onClick()
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
  isLastMove,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Readonly<CellProps>) {
  const value = board[row][col]
  const playable = value === null && isCellPlayable(board, row, col, currentPlayer, gameOver)
  const interactiveCell = interactive && playable
  const previewVisible =
    interactiveCell && hovered && tilesPlaced[currentPlayer] < MAX_TILES

  let className = 'cell'
  if (value !== null) className += ' occupied'
  else if (playable && interactive) className += ' playable'
  else className += ' unplayable'

  let content: ReactElement | null = null
  if (value !== null) {
    content = isFixedPeg(row, col)
      ? renderSquare(value)
      : renderTile(board, row, col, value, isLastMove)
  } else if (previewVisible) {
    content = renderPreview(board, row, col, currentPlayer)
  }

  const cellProps = interactiveCell
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => handleKeyDown(event, onClick),
        onMouseEnter,
        onMouseLeave,
      }
    : {}

  return <div className={className} {...cellProps}>{content}</div>
}

export default Cell
