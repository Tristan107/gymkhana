const PLAYER_ID_KEY = 'gymkhana_player_id'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function getPlayerId(): string {
  const override = new URLSearchParams(window.location.search).get('pid')
  if (override !== null && override.trim() !== '') {
    return `p-${override.trim()}`
  }
  const storage = import.meta.env.DEV ? window.sessionStorage : window.localStorage
  let id = storage.getItem(PLAYER_ID_KEY)
  if (id === null) {
    id = crypto.randomUUID()
    storage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export function generateRoomCode(): string {
  const bytes = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

export function normalizeRoomCode(raw: string): string {
  const trimmed = raw.trim()
  const paramMatch = trimmed.match(/[?&]r=([A-Za-z0-9]+)/)
  if (paramMatch !== null) return paramMatch[1].toUpperCase()
  return trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function getRoomCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('r')
  return code === null ? null : normalizeRoomCode(code)
}

export function getShareUrl(code: string): string {
  const { origin, pathname } = window.location
  const base = pathname.endsWith('/') ? pathname : `${pathname}/`
  return `${origin}${base}?r=${code}`
}
