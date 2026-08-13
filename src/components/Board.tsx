import { useState } from 'react'
import type { ReactElement } from 'react'
import type { Board as BoardType, Player } from '../types'
import { BOARD_SIZE } from '../constants'
import Cell from './Cell'
import './Board.css'

interface BoardProps {
  board: BoardType
  currentPlayer: Player
  lastMove: { row: number; col: number } | null
  gameOver: boolean
  tilesPlaced: Record<Player, number>
  interactive: boolean
  showCoordinates: boolean
  onCellClick: (row: number, col: number) => void
}

interface HoveredCell {
  row: number
  col: number
}

function Board({ board, currentPlayer, lastMove, gameOver, tilesPlaced, interactive, showCoordinates, onCellClick }: BoardProps) {
  const [hovered, setHovered] = useState<HoveredCell | null>(null)

  const boardCells = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => {
      const isHovered = hovered !== null && hovered.row === row && hovered.col === col
      const isLastMove = lastMove !== null && lastMove.row === row && lastMove.col === col
      return (
        <Cell
          key={`${row}-${col}`}
          row={row}
          col={col}
          board={board}
          currentPlayer={currentPlayer}
          gameOver={gameOver}
          tilesPlaced={tilesPlaced}
          interactive={interactive}
          hovered={isHovered}
          isLastMove={isLastMove}
          onClick={() => onCellClick(row, col)}
          onMouseEnter={interactive ? () => setHovered({ row, col }) : undefined}
          onMouseLeave={interactive ? () => setHovered(null) : undefined}
        />
      )
    })
  )

  let rendered: ReactElement[]
  if (!showCoordinates) {
    rendered = boardCells.flat()
  } else {
    const colLabel = (col: number) => String.fromCharCode(65 + col)
    const coord = (key: string, text: string) => (
      <div key={key} className="coord-cell">
        {text}
      </div>
    )
    const empty = (key: string) => <div key={key} className="coord-cell" />
    const letterRow = (prefix: string) => [
      empty(`${prefix}-corner-left`),
      ...Array.from({ length: BOARD_SIZE }, (_, col) =>
        coord(`${prefix}-${col}`, colLabel(col))
      ),
      empty(`${prefix}-corner-right`),
    ]
    const numberedRow = (row: number, cells: ReactElement[]) => [
      coord(`row-${row}-left`, String(BOARD_SIZE - row)),
      ...cells,
      coord(`row-${row}-right`, String(BOARD_SIZE - row)),
    ]
    rendered = [
      ...letterRow('top'),
      ...boardCells.flatMap((rowCells, row) => numberedRow(row, rowCells)),
      ...letterRow('bottom'),
    ]
  }

  return <div className={showCoordinates ? 'board coords' : 'board'}>{rendered}</div>
}

export default Board
