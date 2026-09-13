import { nonogramClues, rotateWire, slideTile, toggleLights } from './mechanics'
import type { MoveDirection } from './miniGames'

export type RandomSource = () => number
export function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]
}
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
export function transformSquare<T>(
  cells: readonly T[],
  size: number,
  turns: number,
  mirror: boolean,
): T[] {
  const result = [...cells]
  cells.forEach((cell, index) => {
    let x = index % size,
      y = Math.floor(index / size)
    for (let turn = 0; turn < turns % 4; turn++) [x, y] = [size - 1 - y, x]
    if (mirror) x = size - 1 - x
    result[y * size + x] = cell
  })
  return result
}
export function transformDirection(
  direction: MoveDirection,
  turns: number,
  mirror: boolean,
): MoveDirection {
  const order: MoveDirection[] = ['up', 'right', 'down', 'left']
  const rotated = order[(order.indexOf(direction) + turns) % 4]
  return mirror ? (rotated === 'left' ? 'right' : rotated === 'right' ? 'left' : rotated) : rotated
}

export const nonogramPatterns = [
  ['11111', '00100', '00100', '00100', '00100'],
  ['01010', '11111', '11111', '01110', '00100'],
  ['00100', '01110', '11111', '10001', '11111'],
  ['11111', '10001', '10101', '10001', '11111'],
  ['11110', '10000', '11100', '10000', '10000'],
  ['00100', '01100', '11111', '01100', '00100'],
  ['00100', '00110', '11111', '01110', '00100'],
  ['11111', '10000', '11110', '10000', '11111'],
  ['00000', '00100', '01110', '11111', '00000'],
]

export function countNonogramSolutions(
  size: number,
  rows: number[][],
  columns: number[][],
  limit = 2,
): number {
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    size > 8 ||
    rows.length !== size ||
    columns.length !== size
  )
    throw new Error('数织检查器支持 1–8 阶方阵。')
  const choices = Array.from({ length: 2 ** size }, (_, mask) =>
    Array.from({ length: size }, (_, index) => (mask >> (size - index - 1)) & 1),
  )
  const options = (clues: number[]) =>
    choices.filter((row) => nonogramClues(row).join(',') === (clues.length ? clues : [0]).join(','))
  const rowChoices = rows.map(options),
    columnChoices = columns.map(options)
  let count = 0
  function visit(row: number, possible: number[][][]): void {
    if (count >= limit) return
    if (row === size) {
      count++
      return
    }
    for (const candidate of rowChoices[row]) {
      const next = possible.map((column, index) =>
        column.filter((pattern) => pattern[row] === candidate[index]),
      )
      if (next.every((column) => column.length)) visit(row + 1, next)
    }
  }
  if (columnChoices.every((column) => column.length)) visit(0, columnChoices)
  return count
}

export function makeLights(random: RandomSource): { initial: number[]; solution: number[] } {
  const solution = shuffle(
    Array.from({ length: 9 }, (_, i) => i),
    random,
  ).slice(0, 3 + Math.floor(random() * 3))
  const initial = solution.reduce((board, index) => toggleLights(board, 3, index), Array(9).fill(0))
  return { initial, solution }
}

export function makeSliding(random: RandomSource): { initial: number[]; solution: number[] } {
  let board = [1, 2, 3, 4, 5, 6, 7, 8, 0],
    previous = -1
  const moved: number[] = []
  const steps = 10 + Math.floor(random() * 7)
  for (let i = 0; i < steps; i++) {
    const blank = board.indexOf(0)
    const candidates = [blank - 3, blank + 3, blank - 1, blank + 1].filter(
      (index) => index !== previous && slideTile(board, 3, index) !== board,
    )
    const index = pick(candidates, random)
    moved.push(board[index])
    board = slideTile(board, 3, index)
    previous = blank
  }
  if (board.every((tile, index) => tile === (index + 1) % 9)) {
    moved.push(board[7])
    board = slideTile(board, 3, 7)
  }
  return { initial: board, solution: moved.reverse() }
}

export function makeCircuit(
  random: RandomSource,
  size = 3,
): { initial: number[]; solution: number[]; path: number[] } {
  const path = [0]
  let x = 0,
    y = 0
  while (x < size - 1 || y < size - 1) {
    if (x === size - 1) y++
    else if (y === size - 1) x++
    else if (random() < 0.5) x++
    else y++
    path.push(y * size + x)
  }
  const target = Array.from({ length: size * size }, () => pick([3, 5, 6, 9, 10, 12], random))
  for (let index = 0; index < path.length; index++) {
    const cell = path[index],
      prev = path[index - 1],
      next = path[index + 1]
    const incoming = index === 0 ? 8 : cell - prev === 1 ? 8 : 1
    const outgoing = index === path.length - 1 ? 2 : next - cell === 1 ? 2 : 4
    target[cell] = incoming | outgoing
  }
  const turns = target.map(() => Math.floor(random() * 4))
  const initial = target.map((mask, index) => {
    for (let n = 0; n < turns[index]; n++) mask = rotateWire(mask)
    return mask
  })
  while (initial[0] & 8) {
    initial[0] = rotateWire(initial[0])
    turns[0] = (turns[0] + 1) % 4
  }
  return {
    initial,
    solution: turns.map((turn, index) => (path.includes(index) ? (4 - turn) % 4 : 0)),
    path,
  }
}

export const warehouseTemplates: { layout: string[]; solution: MoveDirection[] }[] = [
  {
    layout: ['#######', '#  .  #', '#  #  #', '# $$ .#', '#  @  #', '#     #', '#######'],
    solution: ['left', 'up', 'up', 'left', 'up', 'right', 'down', 'down', 'right', 'right'],
  },
  {
    layout: ['#######', '#   . #', '# # $ #', '# . $ #', '#   @ #', '#     #', '#######'],
    solution: ['right', 'up', 'left', 'left', 'right', 'up'],
  },
]

export function makeWarehouse(random: RandomSource): {
  layout: string[]
  solution: MoveDirection[]
} {
  const template = pick(warehouseTemplates, random),
    turns = Math.floor(random() * 4),
    mirror = random() < 0.5
  const flat = transformSquare([...template.layout.join('')], 7, turns, mirror)
  return {
    layout: Array.from({ length: 7 }, (_, row) => flat.slice(row * 7, row * 7 + 7).join('')),
    solution: template.solution.map((direction) => transformDirection(direction, turns, mirror)),
  }
}
