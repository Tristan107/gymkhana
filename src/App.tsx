import { useReducer } from 'react'
import Alert from './components/Alert'
import Board from './components/Board'
import Header from './components/Header'
import RulesPanel from './components/RulesPanel'
import StatusBar from './components/StatusBar'
import { gameReducer, initialState } from './game/reducer'

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  return (
    <div className="flex min-h-screen flex-col items-center p-5 box-border">
      <Header onReset={() => dispatch({ type: 'RESET' })} />

      <div className="flex w-full max-w-[1100px] flex-col items-center gap-10 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-center">
        <div className="flex flex-col items-center gap-[15px]">
          <StatusBar
            currentPlayer={state.currentPlayer}
            tilesPlaced={state.tilesPlaced}
          />
          <Alert message={state.alertMessage} winner={state.winner} />
          <Board
            board={state.board}
            currentPlayer={state.currentPlayer}
            gameOver={state.gameOver}
            tilesPlaced={state.tilesPlaced}
            onCellClick={(row, col) => dispatch({ type: 'PLACE', row, col })}
          />
        </div>

        <RulesPanel />
      </div>
    </div>
  )
}

export default App
