import { useEffect, useReducer, useState } from 'react'
import Board from './components/Board'
import GameOverOverlay from './components/GameOverOverlay'
import Header from './components/Header'
import MenuScreen from './components/MenuScreen'
import RulesScreen from './components/RulesScreen'
import StatusBar from './components/StatusBar'
import { gameReducer, initialState } from './game/reducer'
import { chooseMove } from './game/lean_ai'
import { OPPONENT } from './constants'
import type { Player } from './types'

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [screen, setScreen] = useState<'menu' | 'game'>('menu')
  const [rulesScreen, setRulesScreen] = useState(false)

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

  if (rulesScreen) {
    return <RulesScreen onBack={() => setRulesScreen(false)} />
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
    <div className="flex min-h-screen flex-col items-center p-5 box-border">
      <Header />

      <div className="flex w-full max-w-[1100px] flex-col items-center gap-10 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-center">
        <div className="flex flex-col items-center gap-[15px]">
          <StatusBar
            currentPlayer={state.currentPlayer}
            tilesPlaced={state.tilesPlaced}
            gameMode={state.gameMode}
            humanPlayer={state.humanPlayer}
          />
          <div className="relative">
            <Board
              board={state.board}
              currentPlayer={state.currentPlayer}
              gameOver={state.gameOver}
              tilesPlaced={state.tilesPlaced}
              onCellClick={(row, col) => {
                const isHumanTurn =
                  state.gameMode !== 'ai' ||
                  state.humanPlayer === state.currentPlayer
                if (isHumanTurn) dispatch({ type: 'PLACE', row, col })
              }}
            />
            <GameOverOverlay
              gameOver={state.gameOver}
              message={state.alertMessage}
              winner={state.winner}
              onPlayAgain={restart}
            />
          </div>
        </div>

        <div className="flex w-full flex-row justify-center gap-3 min-[901px]:w-[160px] min-[901px]:flex-col">
          <button
            type="button"
            onClick={goToMenu}
            className="cursor-pointer rounded-md border border-white/20 bg-transparent px-5 py-2.5 text-[13px] font-bold text-[#ccc] transition-colors duration-200 hover:bg-white/5 [font-family:Arial,sans-serif]"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => setRulesScreen(true)}
            className="cursor-pointer rounded-md border-none bg-[#f6b252] px-5 py-2.5 text-[13px] font-bold text-[#1a1a1a] transition-colors duration-200 active:scale-[0.98] hover:brightness-110 [font-family:Arial,sans-serif]"
          >
            How to Play
          </button>
          <button
            type="button"
            onClick={restart}
            className="cursor-pointer rounded-md border-none bg-[#e0e0e0] px-6 py-2.5 text-[13px] font-bold text-[#333] transition-colors duration-200 active:scale-[0.98] hover:bg-[#c8c8c8] [font-family:Arial,sans-serif]"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
