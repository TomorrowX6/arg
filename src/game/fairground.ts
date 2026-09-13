export type BeamDirection = 'up' | 'right' | 'down' | 'left'
export type MirrorTilt = '/' | '\\'
export interface BeamPoint {
  x: number
  y: number
}
export interface LaserBoard {
  size: number
  source: BeamPoint & { direction: BeamDirection }
  exit: BeamPoint
  mirrors: { cell: number; tilt: MirrorTilt; fixed?: boolean }[]
  walls: number[]
  receivers: number[]
}
export interface BeamTrace {
  points: BeamPoint[]
  cells: number[]
  receivers: number[]
  ending: 'exit' | 'edge' | 'wall' | 'loop'
  solved: boolean
}

const beamOffsets: Record<BeamDirection, [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
}
const reflection: Record<MirrorTilt, Record<BeamDirection, BeamDirection>> = {
  '/': { up: 'right', right: 'up', down: 'left', left: 'down' },
  '\\': { up: 'left', right: 'down', down: 'right', left: 'up' },
}
export function reflectBeam(direction: BeamDirection, tilt: MirrorTilt): BeamDirection {
  return reflection[tilt][direction]
}
export function traceLaser(
  board: LaserBoard,
  tilts = board.mirrors.map((mirror) => mirror.tilt),
): BeamTrace {
  const points: BeamPoint[] = [{ x: board.source.x, y: board.source.y }]
  const cells: number[] = [],
    receivers = new Set<number>(),
    visited = new Set<string>()
  const mirrors = new Map(board.mirrors.map((mirror, index) => [mirror.cell, tilts[index]]))
  let { x, y, direction } = board.source
  function finish(ending: BeamTrace['ending']): BeamTrace {
    return {
      points,
      cells,
      receivers: [...receivers],
      ending,
      solved: ending === 'exit' && board.receivers.every((cell) => receivers.has(cell)),
    }
  }
  while (true) {
    const [dx, dy] = beamOffsets[direction]
    x += dx
    y += dy
    points.push({ x, y })
    if (x < 0 || x >= board.size || y < 0 || y >= board.size)
      return finish(x === board.exit.x && y === board.exit.y ? 'exit' : 'edge')
    const cell = y * board.size + x
    if (board.walls.includes(cell)) return finish('wall')
    const signature = `${cell}:${direction}`
    if (visited.has(signature)) return finish('loop')
    visited.add(signature)
    cells.push(cell)
    if (board.receivers.includes(cell)) receivers.add(cell)
    const tilt = mirrors.get(cell)
    if (tilt) direction = reflectBeam(direction, tilt)
  }
}
export function solveLaser(board: LaserBoard, limit = 2): MirrorTilt[][] {
  const movable = board.mirrors.flatMap((mirror, index) => (mirror.fixed ? [] : [index]))
  if (movable.length > 16) throw new Error('光路检查器最多处理 16 面活动镜。')
  const results: MirrorTilt[][] = []
  for (let mask = 0; mask < 2 ** movable.length && results.length < limit; mask++) {
    const tilts = board.mirrors.map((mirror) => mirror.tilt)
    movable.forEach((index, bit) => {
      tilts[index] = mask & (1 << bit) ? '\\' : '/'
    })
    if (traceLaser(board, tilts).solved) results.push(tilts)
  }
  return results
}

export interface CodeScore {
  exact: number
  misplaced: number
}
export interface CodeGuess extends CodeScore {
  symbols: number[]
}
export function scoreSymbols(secret: readonly number[], guess: readonly number[]): CodeScore {
  let exact = 0,
    misplaced = 0
  const remaining = new Map<number, number>()
  secret.forEach((symbol, index) => {
    if (symbol === guess[index]) exact++
    else remaining.set(symbol, (remaining.get(symbol) ?? 0) + 1)
  })
  guess.forEach((symbol, index) => {
    if (symbol === secret[index]) return
    const count = remaining.get(symbol) ?? 0
    if (count) {
      misplaced++
      remaining.set(symbol, count - 1)
    }
  })
  return { exact, misplaced }
}
export function possibleSymbolCodes(
  symbolCount: number,
  length: number,
  history: CodeGuess[],
): number[][] {
  const candidates: number[][] = []
  for (let code = 0; code < symbolCount ** length; code++) {
    let value = code
    const symbols = Array.from({ length }, () => {
      const symbol = value % symbolCount
      value = Math.floor(value / symbolCount)
      return symbol
    })
    if (
      history.every((guess) => {
        const score = scoreSymbols(symbols, guess.symbols)
        return score.exact === guess.exact && score.misplaced === guess.misplaced
      })
    )
      candidates.push(symbols)
  }
  return candidates
}

export interface BridgeState {
  sides: number[]
  lamp: 0 | 1
  elapsed: number
}
export function crossBridge(
  state: BridgeState,
  people: number[],
  times: readonly number[],
): BridgeState | null {
  if (
    !people.length ||
    people.length > 2 ||
    new Set(people).size !== people.length ||
    people.some(
      (person) =>
        !Number.isInteger(person) ||
        person < 0 ||
        person >= times.length ||
        state.sides[person] !== state.lamp,
    )
  )
    return null
  const lamp = state.lamp === 0 ? 1 : 0
  return {
    sides: state.sides.map((side, index) => (people.includes(index) ? lamp : side)),
    lamp,
    elapsed: state.elapsed + Math.max(...people.map((person) => times[person])),
  }
}
export function solveBridge(
  times: readonly number[],
): { minutes: number; crossings: number[][] } | null {
  const initial: BridgeState = { sides: times.map(() => 0), lamp: 0, elapsed: 0 }
  const queue: { state: BridgeState; crossings: number[][] }[] = [{ state: initial, crossings: [] }]
  const best = new Map<string, number>()
  while (queue.length) {
    queue.sort((a, b) => a.state.elapsed - b.state.elapsed)
    const { state, crossings } = queue.shift()!
    if (state.sides.every((side) => side === 1)) return { minutes: state.elapsed, crossings }
    const key = `${state.sides.join('')}:${state.lamp}`
    if ((best.get(key) ?? Infinity) <= state.elapsed) continue
    best.set(key, state.elapsed)
    const available = state.sides.flatMap((side, index) => (side === state.lamp ? [index] : []))
    const groups = available.flatMap((first, index) => [
      [first],
      ...available.slice(index + 1).map((second) => [first, second]),
    ])
    for (const group of groups) {
      const next = crossBridge(state, group, times)!
      queue.push({ state: next, crossings: [...crossings, group] })
    }
  }
  return null
}
