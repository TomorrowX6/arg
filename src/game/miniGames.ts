export type WeighingResult = 'left' | 'balanced' | 'right'
export interface Weighing {
  left: number[]
  right: number[]
  result: WeighingResult
}

export function weighCoins(left: number[], right: number[], heavy: number): WeighingResult {
  const leftWeight = left.length * 10 + Number(left.includes(heavy))
  const rightWeight = right.length * 10 + Number(right.includes(heavy))
  return leftWeight === rightWeight ? 'balanced' : leftWeight > rightWeight ? 'left' : 'right'
}

export function possibleHeavyCoins(count: number, history: Weighing[]): number[] {
  return Array.from({ length: count }, (_, index) => index + 1).filter((coin) =>
    history.every((record) => weighCoins(record.left, record.right, coin) === record.result),
  )
}

export type JugState = [number, number]
export type JugAction = 'fill0' | 'fill1' | 'empty0' | 'empty1' | 'pour01' | 'pour10'
export const JUG_ACTIONS: JugAction[] = ['fill0', 'fill1', 'empty0', 'empty1', 'pour01', 'pour10']

export function changeJugs(state: JugState, capacity: JugState, action: JugAction): JugState {
  const result: JugState = [...state]
  if (action === 'fill0') result[0] = capacity[0]
  else if (action === 'fill1') result[1] = capacity[1]
  else if (action === 'empty0') result[0] = 0
  else if (action === 'empty1') result[1] = 0
  else {
    const from = action === 'pour01' ? 0 : 1,
      to = 1 - from
    const amount = Math.min(result[from], capacity[to] - result[to])
    result[from] -= amount
    result[to] += amount
  }
  return result
}

export function solveJugs(
  capacity: JugState,
  targetJug: number,
  target: number,
): JugAction[] | null {
  const queue: { state: JugState; path: JugAction[] }[] = [{ state: [0, 0], path: [] }]
  const seen = new Set(['0,0'])
  for (let index = 0; index < queue.length && index < 10000; index++) {
    const { state, path } = queue[index]
    if (state[targetJug] === target) return path
    for (const action of JUG_ACTIONS) {
      const next = changeJugs(state, capacity, action),
        key = next.join(',')
      if (!seen.has(key)) {
        seen.add(key)
        queue.push({ state: next, path: [...path, action] })
      }
    }
  }
  return null
}

export interface FerryState {
  boat: number
  sides: number[]
}
export interface FerryMove {
  state: FerryState
  conflict?: number[]
  error?: 'away'
}

export function crossRiver(
  state: FerryState,
  cargo: number | null,
  conflicts: number[][],
): FerryMove {
  if (
    cargo !== null &&
    (cargo < 0 || cargo >= state.sides.length || state.sides[cargo] !== state.boat)
  )
    return { state, error: 'away' }
  const next = { boat: 1 - state.boat, sides: [...state.sides] }
  if (cargo !== null) next.sides[cargo] = next.boat
  const conflict = conflicts.find(
    ([a, b]) => next.sides[a] === next.sides[b] && next.sides[a] !== next.boat,
  )
  return conflict ? { state, conflict } : { state: next }
}

export type MoveDirection = 'up' | 'right' | 'down' | 'left'
export const DIRECTIONS: MoveDirection[] = ['up', 'right', 'down', 'left']
export interface Warehouse {
  width: number
  height: number
  walls: number[]
  goals: number[]
  start: WarehouseState
}
export interface WarehouseState {
  player: number
  boxes: number[]
}

export function parseWarehouse(rows: string[]): Warehouse {
  const width = rows[0]?.length ?? 0
  if (!width || rows.some((row) => row.length !== width)) throw new Error('仓库每行宽度必须一致。')
  const walls: number[] = [],
    goals: number[] = [],
    boxes: number[] = [],
    players: number[] = []
  for (const [index, cell] of [...rows.join('')].entries()) {
    if (!'# .$@+*'.includes(cell)) throw new Error('仓库含有未知地块。')
    if (cell === '#') walls.push(index)
    if ('.+*'.includes(cell)) goals.push(index)
    if ('$*'.includes(cell)) boxes.push(index)
    if ('@+'.includes(cell)) players.push(index)
  }
  if (players.length !== 1 || boxes.length === 0 || boxes.length !== goals.length)
    throw new Error('仓库需要一位档案员，且箱子与目标格数量相同。')
  return {
    width,
    height: rows.length,
    walls,
    goals,
    start: { player: players[0], boxes: boxes.sort((a, b) => a - b) },
  }
}

export function moveWarehouse(
  warehouse: Warehouse,
  state: WarehouseState,
  direction: MoveDirection,
): WarehouseState {
  const { width, height, walls } = warehouse
  const delta = { up: -width, right: 1, down: width, left: -1 }[direction]
  const adjacent = (position: number) => {
    const next = position + delta
    if (next < 0 || next >= width * height) return -1
    if (
      (direction === 'left' || direction === 'right') &&
      Math.floor(position / width) !== Math.floor(next / width)
    )
      return -1
    return walls.includes(next) ? -1 : next
  }
  const next = adjacent(state.player)
  if (next < 0) return state
  if (!state.boxes.includes(next)) return { player: next, boxes: state.boxes }
  const beyond = adjacent(next)
  if (beyond < 0 || state.boxes.includes(beyond)) return state
  return {
    player: next,
    boxes: state.boxes.map((box) => (box === next ? beyond : box)).sort((a, b) => a - b),
  }
}

export function isWarehouseSolved(warehouse: Warehouse, state: WarehouseState): boolean {
  return state.boxes.every((box) => warehouse.goals.includes(box))
}

export function solveWarehouse(warehouse: Warehouse, limit = 100000): MoveDirection[] | null {
  const queue: { state: WarehouseState; parent: number; direction?: MoveDirection }[] = [
    { state: warehouse.start, parent: -1 },
  ]
  const key = (state: WarehouseState) => `${state.player}:${state.boxes.join(',')}`
  const seen = new Set([key(warehouse.start)])
  for (let index = 0; index < queue.length && index < limit; index++) {
    const { state } = queue[index]
    if (isWarehouseSolved(warehouse, state)) {
      const path: MoveDirection[] = []
      let step = index
      while (queue[step].parent !== -1) {
        path.unshift(queue[step].direction!)
        step = queue[step].parent
      }
      return path
    }
    for (const direction of DIRECTIONS) {
      const next = moveWarehouse(warehouse, state, direction),
        id = key(next)
      if (!seen.has(id)) {
        seen.add(id)
        queue.push({ state: next, parent: index, direction })
      }
    }
  }
  return null
}
