import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { changeJugs, solveJugs } from '../src/game/miniGames'
import type { JugState } from '../src/game/miniGames'
import { decodeVigenere, nonogramClues } from '../src/game/mechanics'
import { countNonogramSolutions } from '../src/game/procedural'

const cases = JSON.parse(readFileSync('content/puzzles-20-breakfast.json', 'utf8'))
function permutations(values: string[]): string[][] {
  if (!values.length) return [[]]
  return values.flatMap((value, index) =>
    permutations(values.filter((_, i) => i !== index)).map((rest) => [value, ...rest]),
  )
}

describe('the morning breakfast trail', () => {
  it('has exactly one serving order under the four written constraints', () => {
    const possible = permutations(['A', 'B', 'C', 'D', 'E']).filter(
      (order) =>
        order.indexOf('C') + 1 === order.indexOf('A') &&
        ![0, 4].includes(order.indexOf('E')) &&
        order.indexOf('E') + 1 === order.indexOf('B') &&
        order[4] === 'D',
    )
    expect(possible).toEqual([['C', 'A', 'E', 'B', 'D']])
    expect(cases[0].artifact.config.correct).toEqual(possible[0])
  })
  it('allows the written eight-step jug route and has no shorter solution', () => {
    const config = cases[1].artifact.config
    const path = solveJugs(config.capacity, config.targetJug, config.target)!
    expect(path).toEqual([
      'fill1',
      'pour10',
      'fill1',
      'pour10',
      'empty0',
      'pour10',
      'fill1',
      'pour10',
    ])
    expect(
      path.reduce<JugState>((state, action) => changeJugs(state, config.capacity, action), [0, 0]),
    ).toEqual([5, 0])
  })
  it('has a unique cat-face nonogram and uses all three recovered tokens', () => {
    const { size, solution } = cases[2].artifact.config as { size: number; solution: number[] }
    const rows = Array.from({ length: size }, (_, row) =>
      nonogramClues(solution.slice(row * size, (row + 1) * size)),
    )
    const columns = Array.from({ length: size }, (_, col) =>
      nonogramClues(solution.filter((_, index) => index % size === col)),
    )
    expect(countNonogramSolutions(size, rows, columns)).toBe(1)
    const key = cases
      .slice(0, 3)
      .map((puzzle: { answers: string[] }) => puzzle.answers[0])
      .join('')
    expect(key).toBe('RISEWATERPAWS')
    expect(decodeVigenere(cases[3].artifact.code, key)).toBe('BREAKFAST IS ON ME')
  })
})
