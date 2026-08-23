import { BOARD_SIZE, CELL_COUNT, CELL, NEIGHBORS, FIXED_PEG_MASK } from '../constants'
import type { Board, Player } from '../types'
import {
  fromPublicBoard,
  getValidMoves,
  applyMove,
  undoMove,
  checkConnectionWin,
  checkSurroundWin,
} from './flatBoard'

export interface Move {
  row: number
  col: number
}

const INF = 9999

const EVAL_BOARD = new Uint8Array(CELL_COUNT)
const LEGAL: number[] = []
const TMP_MOVES_A: number[] = []
const TMP_MOVES_B: number[] = []
const OPP_MOVES: number[] = []
const WINS_LIST: number[] = []
const OPEN_A: number[] = []
const OPEN_B: number[] = []
const LIBS: number[] = []
const QUEUE = new Int16Array(CELL_COUNT)
const SEEN = new Uint8Array(CELL_COUNT)
let GEN = 0
const COVERAGE = new Int16Array(CELL_COUNT)
const DEDUP = new Uint8Array(CELL_COUNT)
const ACTIVE = new Uint8Array(CELL_COUNT)
const ESCAPABLE = new Uint8Array(CELL_COUNT)
const SUPPORT: number[] = []
const FLOOD_QUEUE: number[] = []
const DIST = new Int16Array(CELL_COUNT)
const DEQUE: number[] = []
const CANDIDATE_BUF: number[] = []
const CANDIDATE_SCORE: number[] = []
const BEST_MOVES: number[] = []

const COMPS: number[][] = Array.from({ length: 80 }, () => [])
const SNAP: number[][] = Array.from({ length: 80 }, () => [])
const THREATENED: number[][] = Array.from({ length: 80 }, () => [])

function nextGen(): number {
  GEN++
  if (GEN >= 250) {
    SEEN.fill(0)
    GEN = 1
  }
  return GEN
}

function other(p: 1 | 2): 1 | 2 {
  return p === 1 ? 2 : 1
}

function fixedCode(p: 1 | 2): number {
  return p === 1 ? CELL.FIXED_RED : CELL.FIXED_WHITE
}

function owned(cell: number, p: 1 | 2): boolean {
  return cell === p || cell === fixedCode(p)
}

function playableBy(idx: number, p: 1 | 2): boolean {
  const col = idx % BOARD_SIZE
  if (p === 1) return col !== 0 && col !== BOARD_SIZE - 1
  const row = (idx - col) / BOARD_SIZE
  return row !== 0 && row !== BOARD_SIZE - 1
}

function onHomeLane(idx: number, p: 1 | 2): boolean {
  const col = idx % BOARD_SIZE
  const row = (idx - col) / BOARD_SIZE
  return p === 1 ? row === 0 || row === BOARD_SIZE - 1 : col === 0 || col === BOARD_SIZE - 1
}

function isOnBorder(idx: number): boolean {
  const col = idx % BOARD_SIZE
  const row = (idx - col) / BOARD_SIZE
  return row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1
}

function scanComponents(board: Uint8Array, color: 1 | 2): number {
  const gen = nextGen()
  let n = 0
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!owned(board[i], color) || SEEN[i] === gen) continue
    const cells = COMPS[n]
    cells.length = 0
    let head = 0
    let tail = 0
    SEEN[i] = gen
    QUEUE[tail++] = i
    while (head < tail) {
      const cur = QUEUE[head++]
      cells.push(cur)
      const neighbors = NEIGHBORS[cur]
      for (let d = 0; d < 4; d++) {
        const nb = neighbors[d]
        if (nb !== -1 && owned(board[nb], color) && SEEN[nb] !== gen) {
          SEEN[nb] = gen
          QUEUE[tail++] = nb
        }
      }
    }
    n++
  }
  return n
}

function copyComp(src: number[], dst: number[]): void {
  dst.length = src.length
  for (let j = 0; j < src.length; j++) dst[j] = src[j]
}

function openNeighborsInto(board: Uint8Array, cells: number[], out: number[]): number {
  out.length = 0
  const gen = nextGen()
  for (let i = 0; i < cells.length; i++) {
    const neighbors = NEIGHBORS[cells[i]]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1 || board[n] !== CELL.EMPTY || SEEN[n] === gen) continue
      SEEN[n] = gen
      out.push(n)
    }
  }
  return out.length
}

interface ChainInfo {
  playable: number
  boxable: boolean
}

const INFO: ChainInfo = { playable: 0, boxable: true }

function chainInfo(board: Uint8Array, cells: number[], defender: 1 | 2, attacker: 1 | 2): ChainInfo {
  const n = openNeighborsInto(board, cells, OPEN_B)
  let playable = 0
  let boxable = true
  for (let i = 0; i < n; i++) {
    const idx = OPEN_B[i]
    if (playableBy(idx, defender)) playable++
    if (!playableBy(idx, attacker)) boxable = false
  }
  INFO.playable = playable
  INFO.boxable = boxable
  return INFO
}

function componentLiberties(board: Uint8Array, cells: number[], color: 1 | 2): number {
  const n = openNeighborsInto(board, cells, LIBS)
  let count = 0
  for (let i = 0; i < n; i++) {
    if (playableBy(LIBS[i], color)) LIBS[count++] = LIBS[i]
  }
  return count
}

function hasWinNow(board: Uint8Array, p: 1 | 2): boolean {
  return checkConnectionWin(board, p) || checkSurroundWin(board, p)
}

function winningMovesInto(board: Uint8Array, player: 1 | 2, out: number[]): number {
  const nMoves = getValidMoves(board, player, TMP_MOVES_B)
  out.length = 0
  for (let i = 0; i < nMoves; i++) {
    const move = TMP_MOVES_B[i]
    applyMove(board, move, player)
    if (hasWinNow(board, player)) out.push(move)
    undoMove(board, move)
  }
  return out.length
}

function winningMovesCount(board: Uint8Array, player: 1 | 2): number {
  const nMoves = getValidMoves(board, player, TMP_MOVES_B)
  let count = 0
  for (let i = 0; i < nMoves; i++) {
    const move = TMP_MOVES_B[i]
    applyMove(board, move, player)
    if (hasWinNow(board, player)) count++
    undoMove(board, move)
  }
  return count
}

function countSingleLibertyChains(board: Uint8Array, defender: 1 | 2, attacker: 1 | 2): number {
  const n = scanComponents(board, defender)
  let count = 0
  for (let i = 0; i < n; i++) {
    const info = chainInfo(board, COMPS[i], defender, attacker)
    if (info.playable === 1 && info.boxable) count++
  }
  return count
}

function countVulnerableChains(board: Uint8Array, defender: 1 | 2, attacker: 1 | 2): number {
  const n = scanComponents(board, defender)
  let count = 0
  for (let i = 0; i < n; i++) {
    const info = chainInfo(board, COMPS[i], defender, attacker)
    if (info.playable <= 2 && info.boxable) count++
  }
  return count
}

function collectChainsFew(
  board: Uint8Array,
  defender: 1 | 2,
  attacker: 1 | 2,
  maxCount: number,
  out: number[][]
): number {
  const n = scanComponents(board, defender)
  let count = 0
  for (let i = 0; i < n; i++) {
    const info = chainInfo(board, COMPS[i], defender, attacker)
    if (info.playable <= maxCount && info.boxable) {
      copyComp(COMPS[i], out[count])
      count++
    }
  }
  return count
}

function findForcedWinMove(board: Uint8Array, player: 1 | 2): number {
  const opponent = other(player)
  const nComps = scanComponents(board, opponent)
  for (let ci = 0; ci < nComps; ci++) copyComp(COMPS[ci], SNAP[ci])
  for (let ci = 0; ci < nComps; ci++) {
    const comp = SNAP[ci]
    const nLibs = openNeighborsInto(board, comp, OPEN_A)
    for (let li = 0; li < nLibs; li++) {
      const liberty = OPEN_A[li]
      if (!playableBy(liberty, player)) continue
      applyMove(board, liberty, player)
      const info = chainInfo(board, comp, opponent, player)
      const qualifies =
        info.playable === 0 && info.boxable && winningMovesCount(board, opponent) === 0
      undoMove(board, liberty)
      if (qualifies) return liberty
    }
  }
  return -1
}

function hasAdjacentToken(board: Uint8Array, idx: number): boolean {
  const neighbors = NEIGHBORS[idx]
  for (let d = 0; d < 4; d++) {
    const n = neighbors[d]
    if (n !== -1 && board[n] !== CELL.EMPTY) return true
  }
  return false
}

function findForkMove(
  board: Uint8Array,
  player: 1 | 2
): { immediate: number; general: number } {
  const opponent = other(player)
  let immediate = -1
  let bestImmWins = -1
  let bestImmThreat = -1
  let general = -1
  let bestGenWins = -1
  let bestGenThreat = -1
  for (let i = 0; i < LEGAL.length; i++) {
    const move = LEGAL[i]
    if (!hasAdjacentToken(board, move)) continue
    applyMove(board, move, player)
    const w = winningMovesCount(board, player)
    const t = countSingleLibertyChains(board, opponent, player)
    undoMove(board, move)
    if (w >= 2 && (w > bestImmWins || (w === bestImmWins && t > bestImmThreat))) {
      bestImmWins = w
      bestImmThreat = t
      immediate = move
    }
    if ((w >= 1 || t >= 2) && (w > bestGenWins || (w === bestGenWins && t > bestGenThreat))) {
      bestGenWins = w
      bestGenThreat = t
      general = move
    }
  }
  return { immediate, general }
}

function createsFork(board: Uint8Array, fork: number, attacker: 1 | 2, defender: 1 | 2): boolean {
  if (board[fork] !== CELL.EMPTY) return false
  applyMove(board, fork, attacker)
  const isFork =
    winningMovesCount(board, attacker) >= 2 ||
    countSingleLibertyChains(board, defender, attacker) >= 2
  undoMove(board, fork)
  return isFork
}

function floodEscapable(board: Uint8Array, blocked: 1 | 2): void {
  ESCAPABLE.fill(0)
  FLOOD_QUEUE.length = 0
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!isOnBorder(i)) continue
    if (!owned(board[i], blocked) && !ESCAPABLE[i]) {
      ESCAPABLE[i] = 1
      FLOOD_QUEUE.push(i)
    }
  }
  let head = 0
  while (head < FLOOD_QUEUE.length) {
    const cur = FLOOD_QUEUE[head++]
    const neighbors = NEIGHBORS[cur]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1 || ESCAPABLE[n]) continue
      if (!owned(board[n], blocked)) {
        ESCAPABLE[n] = 1
        FLOOD_QUEUE.push(n)
      }
    }
  }
}

function boxSupportCells(board: Uint8Array, winMove: number, winner: 1 | 2, ai: 1 | 2): number {
  applyMove(board, winMove, winner)
  floodEscapable(board, winner)
  SUPPORT.length = 0
  const gen = nextGen()
  for (let idx = 0; idx < CELL_COUNT; idx++) {
    if (!owned(board[idx], ai) || ESCAPABLE[idx]) continue
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1 || board[n] !== CELL.EMPTY || SEEN[n] === gen) continue
      SEEN[n] = gen
      SUPPORT.push(n)
    }
  }
  undoMove(board, winMove)
  return SUPPORT.length
}

function buildForkCandidatesImmediate(
  boardAfterFork: Uint8Array,
  fork: number,
  wins: number[],
  legal: number[],
  attacker: 1 | 2,
  defender: 1 | 2
): void {
  COVERAGE.fill(0)
  for (let i = 0; i < wins.length; i++) {
    const nSupport = boxSupportCells(boardAfterFork, wins[i], attacker, defender)
    for (let j = 0; j < nSupport; j++) COVERAGE[SUPPORT[j]]++
  }
  CANDIDATE_BUF.length = 0
  CANDIDATE_SCORE.length = 0
  for (let i = 0; i < legal.length; i++) {
    const move = legal[i]
    if (COVERAGE[move] >= 1) {
      CANDIDATE_BUF.push(move)
      CANDIDATE_SCORE.push(COVERAGE[move])
    }
  }
  for (let i = 1; i < CANDIDATE_BUF.length; i++) {
    const m = CANDIDATE_BUF[i]
    const s = CANDIDATE_SCORE[i]
    let j = i - 1
    while (j >= 0 && CANDIDATE_SCORE[j] < s) {
      CANDIDATE_BUF[j + 1] = CANDIDATE_BUF[j]
      CANDIDATE_SCORE[j + 1] = CANDIDATE_SCORE[j]
      j--
    }
    CANDIDATE_BUF[j + 1] = m
    CANDIDATE_SCORE[j + 1] = s
  }
  if (legal.includes(fork) && !CANDIDATE_BUF.includes(fork)) {
    CANDIDATE_BUF.push(fork)
  }
}

function buildForkCandidatesGeneral(
  boardAfterFork: Uint8Array,
  fork: number,
  threatenedCount: number,
  defender: 1 | 2
): void {
  DEDUP.fill(0)
  CANDIDATE_BUF.length = 0
  DEDUP[fork] = 1
  CANDIDATE_BUF.push(fork)
  for (let i = 0; i < threatenedCount; i++) {
    const nLibs = componentLiberties(boardAfterFork, THREATENED[i], defender)
    for (let j = 0; j < nLibs; j++) {
      const lib = LIBS[j]
      if (DEDUP[lib]) continue
      DEDUP[lib] = 1
      CANDIDATE_BUF.push(lib)
    }
  }
}

function pickBestForkBlock(
  board: Uint8Array,
  fork: number,
  attacker: 1 | 2,
  defender: 1 | 2
): number {
  let bestMove = -1
  let bestHealth = INF
  for (let i = 0; i < CANDIDATE_BUF.length; i++) {
    const move = CANDIDATE_BUF[i]
    applyMove(board, move, defender)
    if (
      winningMovesCount(board, attacker) === 0 &&
      !createsFork(board, fork, attacker, defender)
    ) {
      const health = countSingleLibertyChains(board, defender, attacker)
      if (health < bestHealth) {
        bestHealth = health
        bestMove = move
      }
    }
    undoMove(board, move)
  }
  return bestMove
}

function findForkBlockMode(
  board: Uint8Array,
  legal: number[],
  defender: 1 | 2,
  mode: 'immediate' | 'general'
): number {
  const attacker = other(defender)
  const nOppMoves = getValidMoves(board, attacker, OPP_MOVES)
  OPP_MOVES.length = nOppMoves
  for (let fi = 0; fi < nOppMoves; fi++) {
    const fork = OPP_MOVES[fi]
    if (!hasAdjacentToken(board, fork)) continue
    applyMove(board, fork, attacker)
    const nWins = winningMovesInto(board, attacker, WINS_LIST)
    let qualifies: boolean
    if (mode === 'immediate') {
      qualifies = nWins >= 2
      if (qualifies) {
        buildForkCandidatesImmediate(board, fork, WINS_LIST, legal, attacker, defender)
      }
    } else {
      const nThreatened = collectThreatened(board, defender, attacker)
      qualifies = nWins >= 1 || nThreatened >= 2
      if (qualifies) {
        buildForkCandidatesGeneral(board, fork, nThreatened, defender)
      }
    }
    undoMove(board, fork)
    if (qualifies) {
      const bestMove = pickBestForkBlock(board, fork, attacker, defender)
      if (bestMove >= 0) return bestMove
    }
  }
  return -1
}

function collectThreatened(board: Uint8Array, defender: 1 | 2, attacker: 1 | 2): number {
  const n = scanComponents(board, defender)
  let count = 0
  for (let i = 0; i < n; i++) {
    const info = chainInfo(board, COMPS[i], defender, attacker)
    if (info.playable === 1 && info.boxable) {
      copyComp(COMPS[i], THREATENED[count])
      count++
    }
  }
  return count
}

function findSingleLibertyDefense(board: Uint8Array, player: 1 | 2): number {
  const n = scanComponents(board, player)
  for (let i = 0; i < n; i++) {
    const nLibs = componentLiberties(board, COMPS[i], player)
    if (nLibs !== 1) continue
    const liberty = LIBS[0]
    if (LEGAL.includes(liberty)) return liberty
  }
  return -1
}

function findComponentContaining(
  board: Uint8Array,
  player: 1 | 2,
  cell: number
): number[] | null {
  const n = scanComponents(board, player)
  for (let i = 0; i < n; i++) {
    if (COMPS[i].includes(cell)) return COMPS[i]
  }
  return null
}

function findBestLibertyDefense(board: Uint8Array, player: 1 | 2): number {
  const attacker = other(player)
  const nSelected = collectChainsFew(board, player, attacker, 2, SNAP)
  let bestMove = -1
  let bestScore = -1
  for (let i = 0; i < nSelected; i++) {
    const comp = SNAP[i]
    const nLibs = componentLiberties(board, comp, player)
    for (let j = 0; j < nLibs; j++) {
      const liberty = LIBS[j]
      if (!LEGAL.includes(liberty)) continue
      applyMove(board, liberty, player)
      const merged = findComponentContaining(board, player, liberty)
      if (merged !== null) {
        const score = componentLiberties(board, merged, player)
        if (score > bestScore) {
          bestScore = score
          bestMove = liberty
        }
      }
      undoMove(board, liberty)
    }
  }
  return bestMove
}

function edgeWeight(board: Uint8Array, color: 1 | 2, idx: number): number {
  const cell = board[idx]
  if (owned(cell, other(color))) return -1
  if (cell === CELL.EMPTY && !playableBy(idx, color)) return -1
  return owned(cell, color) ? 0 : 1
}

function tilesToConnect(board: Uint8Array, color: 1 | 2): number {
  const horizontal = color === 2
  DIST.fill(INF)
  DEQUE.length = 0
  for (let i = 0; i < BOARD_SIZE; i++) {
    const idx = horizontal ? i * BOARD_SIZE : i
    const weight = edgeWeight(board, color, idx)
    if (weight < 0) continue
    DIST[idx] = weight
    if (weight === 0) DEQUE.unshift(idx)
    else DEQUE.push(idx)
  }
  while (DEQUE.length > 0) {
    const idx = DEQUE.shift() as number
    const base = DIST[idx]
    const neighbors = NEIGHBORS[idx]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1) continue
      const weight = edgeWeight(board, color, n)
      if (weight < 0) continue
      if (base + weight < DIST[n]) {
        DIST[n] = base + weight
        if (weight === 0) DEQUE.unshift(n)
        else DEQUE.push(n)
      }
    }
  }
  let minimum = INF
  for (let i = 0; i < BOARD_SIZE; i++) {
    const idx = horizontal ? i * BOARD_SIZE + BOARD_SIZE - 1 : (BOARD_SIZE - 1) * BOARD_SIZE + i
    if (DIST[idx] < minimum) minimum = DIST[idx]
  }
  return minimum
}

function axisAdjacency(board: Uint8Array, color: 1 | 2): number {
  let count = 0
  for (let idx = 0; idx < CELL_COUNT; idx++) {
    if (!owned(board[idx], color)) continue
    if (color === 1) {
      const below = idx + BOARD_SIZE
      if (below < CELL_COUNT && owned(board[below], color)) count++
    } else {
      const col = idx % BOARD_SIZE
      if (col + 1 < BOARD_SIZE && owned(board[idx + 1], color)) count++
    }
  }
  return count
}

function isBoxableRegion(board: Uint8Array, seeds: number[], seedCount: number): boolean {
  const gen = nextGen()
  FLOOD_QUEUE.length = 0
  for (let i = 0; i < seedCount; i++) {
    SEEN[seeds[i]] = gen
    FLOOD_QUEUE.push(seeds[i])
  }
  let head = 0
  while (head < FLOOD_QUEUE.length) {
    const cur = FLOOD_QUEUE[head++]
    if (isOnBorder(cur)) return false
    const neighbors = NEIGHBORS[cur]
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n === -1 || SEEN[n] === gen || board[n] !== CELL.EMPTY) continue
      SEEN[n] = gen
      FLOOD_QUEUE.push(n)
    }
  }
  return true
}

function boxInTilesNeeded(board: Uint8Array, color: 1 | 2): number {
  const opponent = other(color)
  const nComps = scanComponents(board, opponent)
  let minimum = INF
  for (let i = 0; i < nComps; i++) {
    const nAdj = openNeighborsInto(board, COMPS[i], OPEN_A)
    if (nAdj === 0) continue
    if (!isBoxableRegion(board, OPEN_A, nAdj)) continue
    let playable = 0
    for (let j = 0; j < nAdj; j++) {
      if (playableBy(OPEN_A[j], color)) playable++
    }
    if (playable < minimum) minimum = playable
  }
  return minimum
}

function markActiveCells(board: Uint8Array, color: 1 | 2): void {
  ACTIVE.fill(0)
  const n = scanComponents(board, color)
  for (let i = 0; i < n; i++) {
    const cells = COMPS[i]
    let hasPlaced = false
    for (let j = 0; j < cells.length; j++) {
      if (!FIXED_PEG_MASK[cells[j]]) {
        hasPlaced = true
        break
      }
    }
    if (!hasPlaced) continue
    for (let j = 0; j < cells.length; j++) ACTIVE[cells[j]] = 1
  }
}

function isNearActive(idx: number): boolean {
  const neighbors = NEIGHBORS[idx]
  for (let d = 0; d < 4; d++) {
    const n = neighbors[d]
    if (n !== -1 && ACTIVE[n]) return true
  }
  return false
}

function isImminentBoxLiberty(board: Uint8Array, move: number, player: 1 | 2): boolean {
  const opponent = other(player)
  const n = scanComponents(board, opponent)
  for (let i = 0; i < n; i++) {
    const info = chainInfo(board, COMPS[i], opponent, player)
    if (info.playable > 2 || !info.boxable) continue
    const nLibs = componentLiberties(board, COMPS[i], opponent)
    for (let j = 0; j < nLibs; j++) {
      if (LIBS[j] === move) return true
    }
  }
  return false
}

function pickBestStrategic(board: Uint8Array, player: 1 | 2): number {
  const opponent = other(player)

  CANDIDATE_BUF.length = 0
  for (let i = 0; i < LEGAL.length; i++) {
    const move = LEGAL[i]
    if (!onHomeLane(move, player) || isImminentBoxLiberty(board, move, player)) {
      CANDIDATE_BUF.push(move)
    }
  }

  markActiveCells(board, player)
  const base = CANDIDATE_BUF.length > 0 ? CANDIDATE_BUF : LEGAL
  BEST_MOVES.length = 0
  for (let i = 0; i < base.length; i++) {
    if (isNearActive(base[i])) BEST_MOVES.push(base[i])
  }
  const pool = BEST_MOVES.length > 0 ? BEST_MOVES : base

  let bestConnect = INF
  let bestOppConnect = -INF
  let bestZigzag = INF
  let bestHealth = INF
  let bestBox = INF
  let hasBest = false
  const tiedMoves: number[] = []

  for (let i = 0; i < pool.length; i++) {
    const move = pool[i]
    applyMove(board, move, player)
    const connect = tilesToConnect(board, player)
    const oppConnect = tilesToConnect(board, opponent)
    const zigzag = axisAdjacency(board, player)
    const health = countVulnerableChains(board, player, opponent)
    const box = boxInTilesNeeded(board, player)
    undoMove(board, move)

    if (!hasBest) {
      hasBest = true
      bestConnect = connect
      bestOppConnect = oppConnect
      bestZigzag = zigzag
      bestHealth = health
      bestBox = box
      tiedMoves.push(move)
    } else if (
      connect < bestConnect ||
      (connect === bestConnect &&
        (oppConnect > bestOppConnect ||
          (oppConnect === bestOppConnect &&
            (zigzag < bestZigzag ||
              (zigzag === bestZigzag &&
                (health < bestHealth ||
                  (health === bestHealth && box < bestBox)))))))
    ) {
      bestConnect = connect
      bestOppConnect = oppConnect
      bestZigzag = zigzag
      bestHealth = health
      bestBox = box
      tiedMoves.length = 0
      tiedMoves.push(move)
    } else if (
      connect === bestConnect &&
      oppConnect === bestOppConnect &&
      zigzag === bestZigzag &&
      health === bestHealth &&
      box === bestBox
    ) {
      tiedMoves.push(move)
    }
  }

  if (tiedMoves.length === 0) return pool[0]
  return tiedMoves[Math.floor(Math.random() * tiedMoves.length)]
}

function playerToCode(player: Player): 1 | 2 {
  return player === 'red' ? 1 : 2
}

function idxToMove(idx: number): Move {
  const col = idx % BOARD_SIZE
  return { row: (idx - col) / BOARD_SIZE, col }
}

function openingMoves(board: Uint8Array, player: 1 | 2): number[] {
  const result: number[] = []
  for (let i = 0; i < LEGAL.length; i++) {
    const move = LEGAL[i]
    if (onHomeLane(move, player)) continue
    const neighbors = NEIGHBORS[move]
    let adjacentToEdgeToken = false
    for (let d = 0; d < 4; d++) {
      const n = neighbors[d]
      if (n !== -1 && onHomeLane(n, player) && owned(board[n], player)) {
        adjacentToEdgeToken = true
        break
      }
    }
    if (adjacentToEdgeToken) result.push(move)
  }
  return result.length > 0 ? result : LEGAL.slice()
}

export function chooseMove(
  board: Board,
  player: Player,
  tilesPlaced: Record<Player, number>,
  gameOver: boolean
): Move | null {
  if (gameOver) return null

  const pCode = playerToCode(player)
  const oCode = other(pCode)
  fromPublicBoard(board, EVAL_BOARD)

  const nLegal = getValidMoves(EVAL_BOARD, pCode, TMP_MOVES_A)
  LEGAL.length = 0
  for (let i = 0; i < nLegal; i++) LEGAL.push(TMP_MOVES_A[i])
  if (LEGAL.length === 0) return null

  if (tilesPlaced[player] === 0) {
    const opening = openingMoves(EVAL_BOARD, pCode)
    return idxToMove(opening[Math.floor(Math.random() * opening.length)])
  }

  const nOwnWins = winningMovesInto(EVAL_BOARD, pCode, WINS_LIST)
  if (nOwnWins > 0) return idxToMove(WINS_LIST[0])

  const nOppWins = winningMovesInto(EVAL_BOARD, oCode, WINS_LIST)
  for (let i = 0; i < nOppWins; i++) {
    if (LEGAL.includes(WINS_LIST[i])) return idxToMove(WINS_LIST[i])
  }

  const forcedWin = findForcedWinMove(EVAL_BOARD, pCode)
  if (forcedWin >= 0) return idxToMove(forcedWin)

  const ownForks = findForkMove(EVAL_BOARD, pCode)
  if (ownForks.immediate >= 0) return idxToMove(ownForks.immediate)

  const oppForkImmediate = findForkBlockMode(EVAL_BOARD, LEGAL, pCode, 'immediate')
  if (oppForkImmediate >= 0) return idxToMove(oppForkImmediate)

  if (ownForks.general >= 0) return idxToMove(ownForks.general)

  const oppForkGeneral = findForkBlockMode(EVAL_BOARD, LEGAL, pCode, 'general')
  if (oppForkGeneral >= 0) return idxToMove(oppForkGeneral)

  const singleDefense = findSingleLibertyDefense(EVAL_BOARD, pCode)
  if (singleDefense >= 0) return idxToMove(singleDefense)

  const bestDefense = findBestLibertyDefense(EVAL_BOARD, pCode)
  if (bestDefense >= 0) return idxToMove(bestDefense)

  return idxToMove(pickBestStrategic(EVAL_BOARD, pCode))
}
