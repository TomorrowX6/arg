export interface SudokuConfig {
  size: number
  boxRows: number
  boxColumns: number
  givens: number[]
  message: string
}

function sudokuGroups(config: SudokuConfig): number[][] {
  const { size, boxRows, boxColumns } = config
  if (boxRows * boxColumns !== size || size % boxRows || size % boxColumns) return []
  const groups: number[][] = []
  for (let i = 0; i < size; i++) {
    groups.push(Array.from({ length: size }, (_, x) => i * size + x))
    groups.push(Array.from({ length: size }, (_, y) => y * size + i))
  }
  for (let y = 0; y < size; y += boxRows) {
    for (let x = 0; x < size; x += boxColumns) {
      groups.push(
        Array.from(
          { length: size },
          (_, i) => (y + Math.floor(i / boxColumns)) * size + x + (i % boxColumns),
        ),
      )
    }
  }
  return groups
}

export function sudokuConflicts(config: SudokuConfig, board: number[]): number[] {
  const conflicts = new Set<number>()
  board.forEach((value, index) => {
    if (!Number.isInteger(value) || value < 0 || value > config.size) conflicts.add(index)
  })
  for (const group of sudokuGroups(config)) {
    for (const index of group) {
      if (board[index] && group.some((other) => other !== index && board[other] === board[index]))
        conflicts.add(index)
    }
  }
  return [...conflicts].sort((a, b) => a - b)
}

export function sudokuCandidates(config: SudokuConfig, board: number[], index: number): number[] {
  if (board[index]) return []
  const peers = sudokuGroups(config)
    .filter((group) => group.includes(index))
    .flat()
  return Array.from({ length: config.size }, (_, i) => i + 1).filter(
    (value) => !peers.some((peer) => board[peer] === value),
  )
}

export function sudokuComplete(config: SudokuConfig, board: number[]): boolean {
  return (
    board.length === config.size ** 2 &&
    sudokuGroups(config).length > 0 &&
    board.every((value, i) => value > 0 && (!config.givens[i] || config.givens[i] === value)) &&
    sudokuConflicts(config, board).length === 0
  )
}

export function solveSudoku(config: SudokuConfig, limit = 2): number[][] {
  if (
    config.givens.length !== config.size ** 2 ||
    !sudokuGroups(config).length ||
    sudokuConflicts(config, config.givens).length
  )
    return []
  const board = [...config.givens]
  const solutions: number[][] = []
  function visit() {
    if (solutions.length >= limit) return
    let next = -1
    let candidates: number[] = []
    for (let i = 0; i < board.length; i++) {
      if (board[i]) continue
      const values = sudokuCandidates(config, board, i)
      if (!values.length) return
      if (next === -1 || values.length < candidates.length) {
        next = i
        candidates = values
      }
    }
    if (next === -1) {
      solutions.push([...board])
      return
    }
    for (const value of candidates) {
      board[next] = value
      visit()
      board[next] = 0
      if (solutions.length >= limit) break
    }
  }
  visit()
  return solutions
}

export interface StarNode {
  id: string
  label: string
  x: number
  y: number
}
export interface StarConfig {
  nodes: StarNode[]
  edges: [string, string][]
  start: string
  end: string
  message: string
}
export function starTrailStatus(
  config: Pick<StarConfig, 'edges' | 'start' | 'end'>,
  path: string[],
) {
  const used = new Set<number>()
  let valid = path.length > 0 && path[0] === config.start
  for (let i = 1; i < path.length; i++) {
    const edge = config.edges.findIndex(
      ([a, b], index) =>
        !used.has(index) &&
        ((a === path[i - 1] && b === path[i]) || (b === path[i - 1] && a === path[i])),
    )
    if (edge < 0) {
      valid = false
      break
    }
    used.add(edge)
  }
  const current = path.at(-1)
  const available = config.edges.flatMap(([a, b], i) =>
    used.has(i) ? [] : a === current ? [b] : b === current ? [a] : [],
  )
  return {
    valid,
    used,
    available,
    complete: valid && used.size === config.edges.length && current === config.end,
  }
}
export function findStarTrail(
  config: Pick<StarConfig, 'edges' | 'start' | 'end'>,
): string[] | null {
  const used = new Set<number>()
  const stack = [config.start]
  const trail: string[] = []
  while (stack.length) {
    const current = stack.at(-1)!
    const index = config.edges.findIndex(
      ([a, b], i) => !used.has(i) && (a === current || b === current),
    )
    if (index < 0) trail.push(stack.pop()!)
    else {
      used.add(index)
      const [a, b] = config.edges[index]
      stack.push(a === current ? b : a)
    }
  }
  const path = trail.reverse()
  return starTrailStatus(config, path).complete ? path : null
}

export interface TrafficVehicle {
  id: string
  label: string
  axis: 'h' | 'v'
  length: number
  row: number
  column: number
}
export interface TrafficConfig {
  size: number
  vehicles: TrafficVehicle[]
  target: string
  message: string
}
export interface TrafficMove {
  vehicle: number
  delta: number
}
export function trafficInitial(config: TrafficConfig): number[] {
  return config.vehicles.map((vehicle) => (vehicle.axis === 'h' ? vehicle.column : vehicle.row))
}
export function trafficCells(config: TrafficConfig, positions: number[], index: number): number[] {
  const vehicle = config.vehicles[index]
  const row = vehicle.axis === 'v' ? positions[index] : vehicle.row
  const column = vehicle.axis === 'h' ? positions[index] : vehicle.column
  if (
    row < 0 ||
    column < 0 ||
    row + (vehicle.axis === 'v' ? vehicle.length : 1) > config.size ||
    column + (vehicle.axis === 'h' ? vehicle.length : 1) > config.size
  )
    return []
  return Array.from(
    { length: vehicle.length },
    (_, n) =>
      (row + (vehicle.axis === 'v' ? n : 0)) * config.size +
      column +
      (vehicle.axis === 'h' ? n : 0),
  )
}
export function validTraffic(config: TrafficConfig, positions = trafficInitial(config)): boolean {
  if (
    !Number.isInteger(config.size) ||
    config.size < 3 ||
    config.size > 8 ||
    positions.length !== config.vehicles.length ||
    !positions.every(Number.isInteger) ||
    new Set(config.vehicles.map((vehicle) => vehicle.id)).size !== config.vehicles.length
  )
    return false
  if (!config.vehicles.some((vehicle) => vehicle.id === config.target && vehicle.axis === 'h'))
    return false
  const occupied = new Set<number>()
  for (let i = 0; i < config.vehicles.length; i++) {
    const vehicle = config.vehicles[i]
    if (
      !Number.isInteger(vehicle.length) ||
      vehicle.length < 2 ||
      vehicle.length > config.size ||
      !Number.isInteger(vehicle.row) ||
      !Number.isInteger(vehicle.column)
    )
      return false
    const cells = trafficCells(config, positions, i)
    if (cells.length !== vehicle.length || cells.some((cell) => occupied.has(cell))) return false
    cells.forEach((cell) => occupied.add(cell))
  }
  return true
}
export function moveTraffic(
  config: TrafficConfig,
  positions: number[],
  index: number,
  delta: number,
): number[] | null {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= positions.length ||
    !Number.isInteger(delta) ||
    !delta ||
    Math.abs(delta) > config.size
  )
    return null
  const occupied = new Set(
    config.vehicles.flatMap((_, i) => (i === index ? [] : trafficCells(config, positions, i))),
  )
  const next = [...positions]
  for (let step = 0; step < Math.abs(delta); step++) {
    next[index] += Math.sign(delta)
    const cells = trafficCells(config, next, index)
    if (cells.length !== config.vehicles[index].length || cells.some((cell) => occupied.has(cell)))
      return null
  }
  return next
}
export function trafficComplete(config: TrafficConfig, positions: number[]): boolean {
  const target = config.vehicles.findIndex((vehicle) => vehicle.id === config.target)
  return target >= 0 && positions[target] + config.vehicles[target].length === config.size
}
export function solveTraffic(config: TrafficConfig, limit = 200000): TrafficMove[] | null {
  if (!validTraffic(config)) return null
  const start = trafficInitial(config)
  const queue = [start]
  const parent = new Map<string, { previous: string; move: TrafficMove } | null>([
    [start.join(','), null],
  ])
  for (let head = 0; head < queue.length && head < limit; head++) {
    const current = queue[head]
    const key = current.join(',')
    if (trafficComplete(config, current)) {
      const path: TrafficMove[] = []
      let cursor = key
      while (parent.get(cursor)) {
        const entry = parent.get(cursor)!
        path.unshift(entry.move)
        cursor = entry.previous
      }
      return path
    }
    for (let index = 0; index < current.length; index++) {
      for (const delta of [-1, 1]) {
        const next = moveTraffic(config, current, index, delta)
        if (!next || parent.has(next.join(','))) continue
        parent.set(next.join(','), { previous: key, move: { vehicle: index, delta } })
        queue.push(next)
      }
    }
  }
  return null
}

export interface OrbitalGear {
  label: string
  period: number
  phase: number
}
export function orbitalPhase(gear: OrbitalGear, minute: number): number {
  return (((gear.phase + minute) % gear.period) + gear.period) % gear.period
}
export function orbitalAlignment(gears: OrbitalGear[]): { minute: number; cycle: number } | null {
  if (
    !gears.length ||
    gears.some(
      (gear) => !Number.isInteger(gear.period) || gear.period < 1 || !Number.isInteger(gear.phase),
    )
  )
    return null
  function gcd(a: number, b: number): number {
    return b ? gcd(b, a % b) : a
  }
  const cycle = gears.reduce((value, gear) => (value / gcd(value, gear.period)) * gear.period, 1)
  if (cycle > 1000000) return null
  for (let minute = 0; minute < cycle; minute++) {
    if (gears.every((gear) => orbitalPhase(gear, minute) === 0)) return { minute, cycle }
  }
  return null
}

export const PIXEL_ALPHABET: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
}
export function pixelText(text: string): { rows: number; columns: number; bits: string } {
  const letters = [...text.toUpperCase()]
  if (!letters.length || letters.some((letter) => !PIXEL_ALPHABET[letter]))
    throw new Error('像素字只支持 A–Z。')
  return {
    rows: 7,
    columns: letters.length * 6 - 1,
    bits: Array.from({ length: 7 }, (_, row) =>
      letters.map((letter) => PIXEL_ALPHABET[letter][row]).join('0'),
    ).join(''),
  }
}
export function mixStencils(layers: string[], selected: number[]): string {
  const length = layers[0]?.length ?? 0
  if (
    !length ||
    layers.some((layer) => layer.length !== length || /[^01]/.test(layer)) ||
    selected.some((index) => !Number.isInteger(index) || index < 0 || index >= layers.length)
  )
    throw new Error('叠片格式无法读取。')
  const values = Array.from({ length }, () => 0)
  for (const index of new Set(selected))
    for (let cell = 0; cell < length; cell++) values[cell] ^= Number(layers[index][cell])
  return values.join('')
}
export function readPixelText(bits: string, rows: number, columns: number): string | null {
  if (rows !== 7 || (columns + 1) % 6 || bits.length !== rows * columns || /[^01]/.test(bits))
    return null
  const letters: string[] = []
  for (let x = 0; x < columns; x += 6) {
    if (
      x > 0 &&
      Array.from({ length: rows }, (_, y) => bits[y * columns + x - 1]).some((bit) => bit !== '0')
    )
      return null
    const glyph = Array.from({ length: rows }, (_, y) =>
      bits.slice(y * columns + x, y * columns + x + 5),
    ).join('')
    const letter = Object.entries(PIXEL_ALPHABET).find(([, lines]) => lines.join('') === glyph)?.[0]
    if (!letter) return null
    letters.push(letter)
  }
  return letters.join('')
}
