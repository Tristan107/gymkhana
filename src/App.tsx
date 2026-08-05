import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import GameScreen from './components/GameScreen'
import MenuScreen from './components/MenuScreen'
import OnlineGameScreen from './components/OnlineGameScreen'
import OnlineScreen from './components/OnlineScreen'
import RulesScreen from './components/RulesScreen'
import { gameReducer, initialState } from './game/reducer'
import { chooseMove } from './game/lean_ai'
import { OPPONENT } from './constants'
import { getPlayerId, getRoomCodeFromUrl } from './firebase/id'
import type { Player } from './types'

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [screen, setScreen] = useState<'menu' | 'online' | 'game'>('menu')
  const [rulesScreen, setRulesScreen] = useState(false)
  const [onlineSession, setOnlineSession] = useState<{ code: string; myColor: Player } | null>(
    null
  )

  const playerId = useMemo(() => getPlayerId(), [])
  const initialCode = useMemo(() => getRoomCodeFromUrl(), [])

  useEffect(() => {
    if (initialCode !== null) {
      setScreen('online')
    }
  }, [initialCode])

  const isAiTurn =
    screen === 'game' &&
    state.gameMode === 'ai' &&
    !state.gameOver &&
    state.humanPlayer !== null &&
    state.currentPlayer !== state.humanPlayer

  useEffect(() => {
    if (!isAiTurn || state.humanPlayer === null) return
    const aiPlayer = OPPONENT[state.humanPlayer]
    const timeout = setTimeout(() => {
      const move = chooseMove(
        state.board,
        aiPlayer,
        state.tilesPlaced,
        state.gameOver
      )
      if (move) dispatch({ type: 'PLACE', row: move.row, col: move.col })
    }, 400)
    return () => clearTimeout(timeout)
  }, [
    isAiTurn,
    state.board,
    state.currentPlayer,
    state.gameMode,
    state.gameOver,
    state.humanPlayer,
    state.tilesPlaced,
  ])

  const handleOnlineGameReady = useCallback((code: string, myColor: Player) => {
    setOnlineSession({ code, myColor })
    setScreen('game')
  }, [])

  const leaveOnline = useCallback(() => {
    setOnlineSession(null)
    dispatch({ type: 'RESET' })
    setScreen('menu')
  }, [])

  if (rulesScreen) {
    return <RulesScreen onBack={() => setRulesScreen(false)} />
  }

  if (screen === 'online') {
    return (
      <OnlineScreen
        myId={playerId}
        initialCode={initialCode}
        onBack={() => setScreen('menu')}
        onGameReady={handleOnlineGameReady}
      />
    )
  }

  if (screen === 'game' && onlineSession !== null) {
    return (
      <OnlineGameScreen
        code={onlineSession.code}
        playerId={playerId}
        onLeave={leaveOnline}
        onShowRules={() => setRulesScreen(true)}
      />
    )
  }

  if (screen === 'menu') {
    return (
      <MenuScreen
        onPlayPvP={() => {
          dispatch({ type: 'RESET' })
          setScreen('game')
        }}
        onPlayAI={(human: Player) => {
          dispatch({ type: 'START_AI', human })
          setScreen('game')
        }}
        onPlayOnline={() => setScreen('online')}
        onShowRules={() => setRulesScreen(true)}
      />
    )
  }

  const restart = () => {
    if (state.gameMode === 'ai' && state.humanPlayer !== null) {
      dispatch({ type: 'START_AI', human: state.humanPlayer })
    } else {
      dispatch({ type: 'RESET' })
    }
  }

  const goToMenu = () => {
    dispatch({ type: 'RESET' })
    setScreen('menu')
  }

  return (
    <GameScreen
      currentPlayer={state.currentPlayer}
      tilesPlaced={state.tilesPlaced}
      gameMode={state.gameMode}
      humanPlayer={state.humanPlayer}
      board={state.board}
      gameOver={state.gameOver}
      alertMessage={state.alertMessage}
      winner={state.winner}
      onCellClick={(row, col) => {
        const isHumanTurn =
          state.gameMode !== 'ai' || state.humanPlayer === state.currentPlayer
        if (isHumanTurn) dispatch({ type: 'PLACE', row, col })
      }}
      onPlayAgain={restart}
      playAgainLabel="Play Again"
      onMenu={goToMenu}
      onShowRules={() => setRulesScreen(true)}
    />
  )
}

export default App
