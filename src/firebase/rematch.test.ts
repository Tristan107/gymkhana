import { describe, expect, it } from 'vitest'
import { buildRematchPayload } from './rooms'
import type { RoomData } from './rooms'

function makeRoom(overrides: Partial<RoomData> = {}): RoomData {
  return {
    status: 'playing',
    createdAt: 0,
    nextTurn: 'red',
    host: { playerId: 'host-id', color: 'red' },
    guest: { playerId: 'guest-id', color: 'white' },
    winner: 'red',
    rematchRequester: 'host-id',
    ...overrides,
  }
}

describe('buildRematchPayload', () => {
  it('returns null when there is no guest', () => {
    const room = makeRoom({ guest: null, winner: null, rematchRequester: null })
    expect(buildRematchPayload(room)).toBeNull()
  })

  it('returns null when no rematch is pending', () => {
    const room = makeRoom({ rematchRequester: null })
    expect(buildRematchPayload(room)).toBeNull()
  })

  it('swaps the players colors', () => {
    const payload = buildRematchPayload(makeRoom())
    expect(payload).not.toBeNull()
    expect(payload).toMatchObject({
      'host/color': 'white',
      'guest/color': 'red',
    })
  })

  it('resets the game and bumps the round', () => {
    const payload = buildRematchPayload(makeRoom({ round: 2 }))
    expect(payload).toMatchObject({
      nextTurn: 'red',
      winner: null,
      rematchRequester: null,
      moves: null,
      round: 3,
    })
  })

  it('starts the round at 1 for legacy rooms without a round', () => {
    const payload = buildRematchPayload(makeRoom({ round: undefined }))
    expect(payload).toMatchObject({ round: 1 })
  })
})
