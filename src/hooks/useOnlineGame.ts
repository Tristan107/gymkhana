import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gameReducer } from '../game/reducer'
import { applyMoveLog } from '../game/replay'
import type { GameState } from '../game/reducer'
import type { Player } from '../types'
import {
  acceptRematch as acceptRematchRoom,
  appendMove,
  cancelRematch as cancelRematchRoom,
  deleteRoom,
  proposeRematch as proposeRematchRoom,
  setWinner,
  watchMoves,
  watchRoom,
} from '../firebase/rooms'
import type { MoveData, RoomData } from '../firebase/rooms'

export interface OnlineGameHandle {
  room: RoomData | null
  myColor: Player | null
  state: GameState
  isMyTurn: boolean
  isConnected: boolean
  closed: boolean
  error: string | null
  place: (row: number, col: number) => void
  leave: () => void
  proposeRematch: () => void
  cancelRematch: () => void
  acceptRematch: () => void
}

export function useOnlineGame(code: string, playerId: string): OnlineGameHandle {
  const [room, setRoom] = useState<RoomData | null>(null)
  const [liveRoom, setLiveRoom] = useState<RoomData | null>(null)
  const [closed, setClosed] = useState(false)
  const [moves, setMoves] = useState<MoveData[]>([])
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)
  const lastRoundRef = useRef<number | null>(null)

  useEffect(() => {
    return watchRoom(code, (next) => {
      setLiveRoom(next)
      if (next === null) {
        setClosed(true)
      } else {
        setClosed(false)
        setRoom(next)
        const round = next.round ?? 0
        if (lastRoundRef.current !== null && lastRoundRef.current !== round) {
          pendingRef.current = false
          setMoves([])
        }
        lastRoundRef.current = round
      }
    })
  }, [code])

  useEffect(() => {
    pendingRef.current = false
    return watchMoves(code, (move) => {
      pendingRef.current = false
      setMoves((previous) => [...previous, move])
    })
  }, [code])

  const myColor = useMemo<Player | null>(() => {
    if (room === null) return null
    if (room.host.playerId === playerId) return room.host.color
    if (room.guest != null && room.guest.playerId === playerId) return room.guest.color
    return null
  }, [room, playerId])

  const state = useMemo(() => {
    const base = applyMoveLog(moves)
    return myColor === null ? base : { ...base, gameMode: 'online' as const, humanPlayer: myColor }
  }, [moves, myColor])

  useEffect(() => {
    if (state.gameOver && liveRoom !== null && liveRoom.winner === null) {
      setWinner(code, state.winner ?? 'draw').catch(() => {})
    }
  }, [state.gameOver, state.winner, liveRoom, code])

  const isConnected = liveRoom !== null && liveRoom.status === 'playing' && liveRoom.guest != null
  const isMyTurn =
    myColor !== null && !closed && !state.gameOver && state.currentPlayer === myColor

  const place = useCallback(
    (row: number, col: number) => {
      if (pendingRef.current) return
      if (myColor === null || closed || !isMyTurn || state.gameOver) return
      const next = gameReducer(state, { type: 'PLACE', row, col })
      if (next === state) return
      pendingRef.current = true
      appendMove(code, { p: myColor, r: row, c: col }).catch(() => {
        pendingRef.current = false
        setError('Could not send your move. Try again.')
      })
    },
    [code, myColor, state, isMyTurn, closed]
  )

  const leave = useCallback(() => {
    deleteRoom(code).catch(() => {})
  }, [code])

  const proposeRematch = useCallback(() => {
    if (closed) return
    proposeRematchRoom(code, playerId).catch(() =>
      setError('Could not send your rematch request. Try again.')
    )
  }, [code, playerId, closed])

  const cancelRematch = useCallback(() => {
    if (closed) return
    cancelRematchRoom(code).catch(() =>
      setError('Could not cancel your rematch request. Try again.')
    )
  }, [code, closed])

  const acceptRematch = useCallback(() => {
    if (closed) return
    acceptRematchRoom(code).catch(() =>
      setError('Could not start the rematch. Try again.')
    )
  }, [code, closed])

  return {
    room,
    myColor,
    state,
    isMyTurn,
    isConnected,
    closed,
    error,
    place,
    leave,
    proposeRematch,
    cancelRematch,
    acceptRematch,
  }
}
