import { get, onChildAdded, onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database'
import { OPPONENT } from '../constants'
import type { Player } from '../types'
import { generateRoomCode } from './id'
import { db } from './init'

export interface RoomMember {
  playerId: string
  color: Player
}

export interface RoomData {
  status: 'waiting' | 'playing'
  createdAt: number
  nextTurn: Player
  host: RoomMember
  guest: RoomMember | null
  winner: Player | 'draw' | null
}

export interface MoveData {
  p: Player
  r: number
  c: number
}

const roomPath = (code: string) => `rooms/${code}`
const roomRef = (code: string) => ref(db, roomPath(code))

export async function createRoom(playerId: string, color: Player): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateRoomCode()
    const payload = {
      status: 'waiting',
      createdAt: serverTimestamp(),
      nextTurn: 'red',
      host: { playerId, color },
      guest: null,
      winner: null,
    }
    try {
      await set(roomRef(code), payload)
      return code
    } catch (err) {
      if (isPermissionDenied(err)) continue
      throw err
    }
  }
  throw new Error('Could not create a room. Please try again.')
}

export async function joinRoom(code: string, playerId: string): Promise<RoomData | null> {
  const snapshot = await get(roomRef(code))
  if (!snapshot.exists()) return null
  const current = snapshot.val() as RoomData
  if (current.status !== 'waiting' || current.guest != null) return null
  const guestColor: Player = current.host.color === 'red' ? 'white' : 'red'
  try {
    await update(roomRef(code), {
      guest: { playerId, color: guestColor },
      status: 'playing',
    })
  } catch {
    return null
  }
  const after = await get(roomRef(code))
  return after.exists() ? (after.val() as RoomData) : null
}

export async function getRoom(code: string): Promise<RoomData | null> {
  const snapshot = await get(roomRef(code))
  return snapshot.exists() ? (snapshot.val() as RoomData) : null
}

export function watchRoom(code: string, onUpdate: (room: RoomData | null) => void): () => void {
  return onValue(roomRef(code), (snapshot) => {
    onUpdate(snapshot.exists() ? (snapshot.val() as RoomData) : null)
  })
}

export function watchMoves(code: string, onMove: (move: MoveData) => void): () => void {
  return onChildAdded(ref(db, `${roomPath(code)}/moves`), (snapshot) => {
    const move = snapshot.val() as MoveData | null
    if (move !== null) onMove(move)
  })
}

export async function appendMove(code: string, move: MoveData): Promise<void> {
  const movesRef = ref(db, `${roomPath(code)}/moves`)
  const key = push(movesRef).key
  if (key === null) throw new Error('Could not send move.')
  await update(roomRef(code), {
    [`moves/${key}`]: move,
    nextTurn: OPPONENT[move.p],
  })
}

export async function setWinner(code: string, winner: Player | 'draw'): Promise<void> {
  await update(roomRef(code), { winner })
}

export async function deleteRoom(code: string): Promise<void> {
  await remove(roomRef(code))
}

function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'PERMISSION_DENIED'
  )
}
