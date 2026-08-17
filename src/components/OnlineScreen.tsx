import { useCallback, useEffect, useState } from 'react'
import type { Player } from '../types'
import { getShareUrl, normalizeRoomCode } from '../firebase/id'
import { createRoom, deleteRoom, getRoom, joinRoom, watchRoom } from '../firebase/rooms'

type Phase =
  | { kind: 'form' }
  | { kind: 'busy'; message: string }
  | { kind: 'waiting'; code: string; myColor: Player }

interface OnlineScreenProps {
  myId: string
  initialCode: string | null
  onBack: () => void
  onGameReady: (code: string, myColor: Player) => void
}

const BUTTON =
  'cursor-pointer rounded-md border-none bg-[#e0e0e0] px-5 py-3 text-[15px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]'
const GHOST_BUTTON =
  'cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5 [font-family:Arial,sans-serif]'
const GOLD_BUTTON =
  'cursor-pointer rounded-md border-none bg-[#f6b252] px-5 py-3 text-[15px] font-bold text-[#1a1a1a] transition-colors duration-200 active:scale-[0.98] hover:brightness-110 [font-family:Arial,sans-serif]'
const INPUT =
  'rounded-md border border-white/20 bg-transparent px-3 py-2.5 text-center text-sm font-bold text-[#fdfaf2] [font-family:Arial,sans-serif] placeholder:text-[#666] focus:border-[#f6b252] focus:outline-none'

const DEFAULT_PSEUDO: Record<Player, string> = {
  red: 'Red',
  white: 'White',
}

const challengeTitle = (pseudo: string): string =>
  `${pseudo} has challenged you to a game of Gymkhana !`

function OnlineScreen({ myId, initialCode, onBack, onGameReady }: Readonly<OnlineScreenProps>) {
  const [phase, setPhase] = useState<Phase>({ kind: 'form' })
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [pseudo, setPseudo] = useState('Red')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialCode === null) return
    let cancelled = false
    void (async () => {
      const room = await getRoom(initialCode)
      if (cancelled) return
      if (room === null) {
        setError(`No game found for code "${initialCode}".`)
        return
      }
      if (room.status === 'waiting') {
        if (room.host.playerId === myId) {
          setPhase({ kind: 'waiting', code: initialCode, myColor: room.host.color })
        } else {
          setPhase({ kind: 'busy', message: 'Joining game…' })
          const joined = await joinRoom(initialCode, myId)
          if (cancelled) return
          if (!joined?.guest) {
            setError('Could not join that game. It may be full.')
            setPhase({ kind: 'form' })
            return
          }
          onGameReady(initialCode, joined.guest.color)
        }
        return
      }
      if (room.host.playerId === myId) {
        onGameReady(initialCode, room.host.color)
        return
      }
      if (room.guest?.playerId === myId) {
        onGameReady(initialCode, room.guest.color)
        return
      }
      setError(`Game "${initialCode}" is already in progress.`)
    })()
    return () => {
      cancelled = true
    }
  }, [initialCode, myId, onGameReady])

  useEffect(() => {
    if (phase.kind !== 'waiting') return
    return watchRoom(phase.code, (room) => {
      if (room !== null && room.status === 'playing' && room.guest != null) {
        onGameReady(phase.code, phase.myColor)
      }
    })
  }, [phase, onGameReady])

  const handleCreate = useCallback(
    async (color: Player) => {
      setError(null)
      setMode(null)
      setPseudo((current) => {
        const trimmed = current.trim()
        return trimmed === '' ? DEFAULT_PSEUDO[color] : current
      })
      setPhase({ kind: 'busy', message: 'Creating game…' })
      try {
        const code = await createRoom(myId, color)
        setPhase({ kind: 'waiting', code, myColor: color })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create a game.')
        setPhase({ kind: 'form' })
      }
    },
    [myId]
  )

  const handleJoin = useCallback(async () => {
    const code = normalizeRoomCode(joinCode)
    if (code === '') return
    setError(null)
    setPhase({ kind: 'busy', message: 'Joining game…' })
    const joined = await joinRoom(code, myId)
    if (!joined?.guest) {
      setError('Invalid room code or the game is already full.')
      setPhase({ kind: 'form' })
      return
    }
    onGameReady(code, joined.guest.color)
  }, [joinCode, myId, onGameReady])

  const handleCancel = useCallback(() => {
    if (phase.kind === 'waiting') {
      void deleteRoom(phase.code).catch(() => {})
    }
    setPhase({ kind: 'form' })
    setMode(null)
    setJoinCode('')
  }, [phase])

  const handleCopy = useCallback(async () => {
    if (phase.kind !== 'waiting') return
    const url = getShareUrl(phase.code)
    const title = challengeTitle(pseudo.trim() || DEFAULT_PSEUDO[phase.myColor])
    const text = `${title}\n${url}`
    try {
      if (typeof ClipboardItem !== 'undefined') {
        const html = `<a href="${url}">${title}</a>`
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(text)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Automatic copy failed. Copy the link below manually.')
    }
  }, [phase, pseudo])

  return (
    <div className="box-border flex min-h-screen flex-col items-center justify-center gap-8 p-5">
      <div className="text-center">
        <h1 className="m-0 flex justify-center text-[42px] uppercase leading-none tracking-[2px] min-[480px]:text-[64px]">
          {Array.from('Gymkhana').map((char, index) => (
            <span
              key={`${char}-${index}`}
              className={index % 2 === 0 ? 'text-[#fdfaf2]' : 'text-[#c9182b]'}
              style={{ textShadow: '3px 4px 0px rgba(0,0,0,0.6)' }}
            >
              {char}
            </span>
          ))}
        </h1>
        <div className="mt-2 text-xs font-bold uppercase tracking-[2px] text-[#f6b252] [font-family:Arial,sans-serif] min-[480px]:text-sm">
          Online 1v1
        </div>
      </div>

      {phase.kind === 'form' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {mode === null && (
            <>
              <button type="button" onClick={() => setMode('create')} className={BUTTON}>
                Create a game
              </button>
              <button type="button" onClick={() => setMode('join')} className={BUTTON}>
                Join a game
              </button>
            </>
          )}
          <button type="button" onClick={onBack} className={GHOST_BUTTON}>
            Back
          </button>

          {error !== null && (
            <p className="m-0 text-center text-sm text-[#ff9999] [font-family:Arial,sans-serif]">
              {error}
            </p>
          )}

          {mode === 'create' && (
            <div className="flex flex-col items-center gap-3 rounded-md border border-white/10 bg-white/5 p-4">
              <label className="flex w-full flex-col gap-1.5">
                <span className="m-0 text-xs font-bold text-[#f6b252] [font-family:Arial,sans-serif]">
                  Your name
                </span>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(event) => setPseudo(event.target.value)}
                  maxLength={24}
                  spellCheck={false}
                  placeholder="Red"
                  className={INPUT}
                />
              </label>
              <p className="m-0 text-sm font-bold text-[#f6b252] [font-family:Arial,sans-serif]">
                Choose your color
              </p>
              <p className="m-0 text-xs text-[#aaa] [font-family:Arial,sans-serif]">
                Red always makes the first move.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPseudo((current) => (current === 'White' ? 'Red' : current))
                    void handleCreate('red')
                  }}
                  aria-label="Create game as Red"
                  className="h-10 w-10 cursor-pointer rounded-md border-none bg-[#ff3344] transition-colors duration-200 active:scale-[0.95] hover:brightness-110"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPseudo((current) => (current === 'Red' ? 'White' : current))
                    void handleCreate('white')
                  }}
                  aria-label="Create game as White"
                  className="h-10 w-10 cursor-pointer rounded-md border-none bg-[#e0e0e0] transition-colors duration-200 active:scale-[0.95] hover:bg-[#c9c9c9]"
                />
              </div>
              <button
                type="button"
                onClick={() => setMode(null)}
                className={GHOST_BUTTON}
              >
                Cancel
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/5 p-4">
              <input
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleJoin()
                }}
                placeholder="Game code or link"
                spellCheck={false}
                className="rounded-md border border-white/20 bg-transparent px-3 py-2.5 text-center text-sm font-bold tracking-[2px] text-[#fdfaf2] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-[#666] [font-family:Arial,sans-serif] focus:border-[#f6b252] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleJoin()}
                disabled={joinCode.trim() === ''}
                className={`${GOLD_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setMode(null)}
                className={GHOST_BUTTON}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {phase.kind === 'busy' && (
        <p className="m-0 text-sm font-bold text-[#ddd] [font-family:Arial,sans-serif]">
          {phase.message}
        </p>
      )}

      {phase.kind === 'waiting' && (
        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center gap-3 rounded-md border border-white/10 bg-white/5 p-6">
            <h2 className="m-0 text-sm font-bold uppercase tracking-[1px] text-[#f6b252] [font-family:Arial,sans-serif]">
              Game created!
            </h2>
            <div className="rounded-md border border-white/20 bg-black/30 px-8 py-3 text-4xl font-bold tracking-[10px] text-[#fdfaf2] [font-family:monospace]">
              {phase.code}
            </div>
            <p className="m-0 text-center text-sm leading-[1.4] text-[#aaa] [font-family:Arial,sans-serif]">
              Send this link to a friend to challenge them:
            </p>
            <input
              type="text"
              readOnly
              value={getShareUrl(phase.code)}
              onFocus={(event) => event.target.select()}
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-center text-xs text-[#ccc] [font-family:monospace] focus:outline-none"
            />
            <button type="button" onClick={() => void handleCopy()} className={GOLD_BUTTON}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <p className="m-0 flex items-center gap-2 text-sm font-bold text-[#ddd] [font-family:Arial,sans-serif]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#f6b252] border-t-transparent" />
              {' '}
              Waiting for opponent to join…
            </p>
            <button type="button" onClick={handleCancel} className={GHOST_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnlineScreen
