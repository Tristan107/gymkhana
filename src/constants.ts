import type { Player } from './types'

export const BOARD_SIZE = 11
export const MAX_TILES = 21

export const OPPONENT: Record<Player, Player> = {
  red: 'white',
  white: 'red',
}

export const PLAYER_COLORS: Record<Player, string> = {
  red: '#ff3344',
  white: '#ffffff',
}
