export type Player = 'red' | 'white'
export type CellValue = Player | null
export type Board = CellValue[][]
export type Orientation = 'vertical' | 'horizontal'

export type FlatBoard = Uint8Array
export type PlayerCode = 0 | 1 | 2
export type FixedCode = 3 | 4
export type CellCode = PlayerCode | FixedCode
export type MoveIndex = number

export interface PublicBoard {
  [row: number]: CellValue[]
}

export interface PublicMove {
  row: number
  col: number
}