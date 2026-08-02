import { useEffect, useReducer } from 'react'
import Alert from './components/Alert'
import Board from './components/Board'
import Header from './components/Header'
import RulesPanel from './components/RulesPanel'
import StatusBar from './components/StatusBar'
import { gameReducer, initialState } from './game/reducer'
import { chooseMove } from './game/lean_ai'
import { OPPONENT } from './constants'

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  useEffect(() => {
    if (
      state.gameMode !== 'ai' ||
      state.gameOver ||
      state.humanPlayer === null ||
      state.currentPlayer === state.humanPlayer
    ) {
      return
    }
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
    state.board,
    state.currentPlayer,
    state.gameMode,
    state.gameOver,
    state.humanPlayer,
    state.tilesPlaced,
  ])

  return (
    <div className="flex min-h-screen flex-col items-center p-5 box-border">
      <Header
        onReset={() => dispatch({ type: 'RESET' })}
        onStartAI={(human) => dispatch({ type: 'START_AI', human })}
      />

      <div className="flex w-full max-w-[1100px] flex-col items-center gap-10 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-center">
        <div className="flex flex-col items-center gap-[15px]">
          <StatusBar
            currentPlayer={state.currentPlayer}
            tilesPlaced={state.tilesPlaced}
            gameMode={state.gameMode}
            humanPlayer={state.humanPlayer}
          />
          <Alert message={state.alertMessage} winner={state.winner} />
          <Board
            board={state.board}
            currentPlayer={state.currentPlayer}
            gameOver={state.gameOver}
            tilesPlaced={state.tilesPlaced}
            onCellClick={(row, col) => {
              const isHumanTurn = state.gameMode !== 'ai' || state.humanPlayer === state.currentPlayer
              if (isHumanTurn) dispatch({ type: 'PLACE', row, col })
            }}
          />
        </div>

        <RulesPanel />
      </div>
    </div>
  )
}

export default App