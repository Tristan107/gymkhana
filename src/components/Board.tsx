import { useState } from 'react'
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
  onCellClick: (row: number, col: number) => void
}

interface HoveredCell {
  row: number
  col: number
}

function Board({ board, currentPlayer, lastMove, gameOver, tilesPlaced, interactive, onCellClick }: BoardProps) {
  const [hovered, setHovered] = useState<HoveredCell | null>(null)

  const cells = Array.from({ length: BOARD_SIZE }, (_, row) =>
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
  ).flat()

  return <div className="board">{cells}</div>
}

export default Board
