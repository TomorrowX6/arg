import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  findStarTrail,
  mixStencils,
  moveTraffic,
  orbitalAlignment,
  orbitalPhase,
  pixelText,
  readPixelText,
  solveSudoku,
  solveTraffic,
  starTrailStatus,
  sudokuCandidates,
  sudokuComplete,
  sudokuConflicts,
  trafficComplete,
  trafficInitial,
  validTraffic,
} from '../src/game/observatory'
import type { StarConfig, SudokuConfig, TrafficConfig } from '../src/game/observatory'

const cases = JSON.parse(readFileSync('content/puzzles-15-observatory.json', 'utf8'))
const config = (id: string) =>
  cases.find((puzzle: { id: string }) => puzzle.id === id).artifact.config
describe('the observatory mechanisms', () => {
  it('gives both authored star calendars one solution while keeping every original digit', () => {
    const expected = {
      x33: [3, 4, 1, 2, 2, 1, 4, 3, 4, 2, 3, 1, 1, 3, 2, 4],
      x36: [
        1, 6, 4, 5, 3, 2, 5, 2, 3, 1, 4, 6, 6, 3, 5, 2, 1, 4, 2, 4, 1, 6, 5, 3, 3, 1, 2, 4, 6, 5, 4,
        5, 6, 3, 2, 1,
      ],
    }
    for (const id of ['x33', 'x36'] as const) {
      const source = config(id) as SudokuConfig
      const solutions = solveSudoku(source)
      expect(solutions).toEqual([expected[id]])
      expect(sudokuComplete(source, solutions[0])).toBe(true)
      expect(sudokuComplete(source, source.givens)).toBe(false)
      expect(sudokuConflicts(source, source.givens)).toEqual([])
    }
    expect(sudokuCandidates(config('x33'), config('x33').givens, 1)).toEqual([4])
    expect(sudokuCandidates(config('x36'), config('x36').givens, 27)).toEqual([4])
  })
  it('detects row, column and box conflicts instead of marking every non-solution digit wrong', () => {
    const source: SudokuConfig = {
      size: 4,
      boxRows: 2,
      boxColumns: 2,
      givens: Array(16).fill(0),
      message: '',
    }
    for (const pair of [
      [0, 1],
      [0, 4],
      [0, 5],
    ]) {
      const board = [...source.givens]
      for (const cell of pair) board[cell] = 2
      expect(sudokuConflicts(source, board)).toEqual(pair)
    }
    expect(solveSudoku(source)).toHaveLength(2)
    const invalid = { ...source, givens: [1, 1, ...Array(14).fill(0)] }
    expect(solveSudoku(invalid)).toEqual([])
  })
  it('walks every edge in the published hints once and permits revisiting a star', () => {
    const paths: Record<string, string[]> = {
      x34: ['A', 'B', 'E', 'C', 'B', 'D', 'A', 'C', 'D'],
      x37: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'F', 'D', 'B'],
    }
    for (const id of ['x34', 'x37']) {
      const source = config(id) as StarConfig
      expect(starTrailStatus(source, paths[id]).complete).toBe(true)
      expect(starTrailStatus(source, findStarTrail(source)!).complete).toBe(true)
      expect(starTrailStatus(source, paths[id].slice(0, -1)).complete).toBe(false)
      expect(starTrailStatus(source, ['A', 'B', 'A']).valid).toBe(false)
    }
    expect(
      findStarTrail({
        start: 'A',
        end: 'B',
        edges: [
          ['A', 'B'],
          ['C', 'D'],
        ],
      }),
    ).toBeNull()
  })
  it('solves both rail rooms optimally and keeps every intermediate vehicle collision-free', () => {
    for (const [id, length] of [
      ['x35', 11],
      ['x38', 15],
    ] as const) {
      const source = config(id) as TrafficConfig
      expect(validTraffic(source)).toBe(true)
      const moves = solveTraffic(source)!
      expect(moves).toHaveLength(length)
      let positions = trafficInitial(source)
      for (const move of moves) {
        expect(trafficComplete(source, positions)).toBe(false)
        const next = moveTraffic(source, positions, move.vehicle, move.delta)
        expect(next).not.toBeNull()
        positions = next!
        expect(validTraffic(source, positions)).toBe(true)
      }
      expect(trafficComplete(source, positions)).toBe(true)
    }
  })
  it('does not let a long rail move jump across an occupied cell or leave the board', () => {
    const source: TrafficConfig = {
      size: 5,
      target: 'T',
      message: '',
      vehicles: [
        { id: 'T', label: '主镜', axis: 'h', length: 2, row: 2, column: 0 },
        { id: 'A', label: '遮挡', axis: 'v', length: 2, row: 1, column: 2 },
      ],
    }
    const initial = trafficInitial(source)
    expect(moveTraffic(source, initial, 0, 3)).toBeNull()
    expect(moveTraffic(source, initial, 0, -1)).toBeNull()
    expect(moveTraffic(source, initial, 0, 0.5)).toBeNull()
    const cleared = moveTraffic(source, initial, 1, 2)!
    expect(moveTraffic(source, cleared, 0, 3)).toEqual([3, 3])
    expect(validTraffic(source, [1, 1])).toBe(false)
  })
  it('finds the first shared zero, and rejects clocks that never align', () => {
    const { gears } = config('x39')
    expect(orbitalAlignment(gears)).toEqual({ minute: 137, cycle: 693 })
    expect(
      gears.map((gear: { period: number; phase: number; label: string }) => orbitalPhase(gear, 11)),
    ).toEqual([0, 0, 6])
    expect(
      gears.map((gear: { period: number; phase: number; label: string }) =>
        orbitalPhase(gear, 137),
      ),
    ).toEqual([0, 0, 0])
    expect(
      orbitalAlignment([
        { label: 'a', period: 2, phase: 0 },
        { label: 'b', period: 2, phase: 1 },
      ]),
    ).toBeNull()
  })
  it('reads a complete alphabet from pixels and rejects a corrupted separator', () => {
    const word = pixelText('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(readPixelText(word.bits, word.rows, word.columns)).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    const damaged = [...word.bits]
    damaged[5] = '1'
    expect(readPixelText(damaged.join(''), word.rows, word.columns)).toBeNull()
  })
  it('has exactly one readable combination among all 128 subsets of the seven actual stencils', () => {
    const { rows, columns, layers } = config('x40')
    const found: { selected: number[]; text: string }[] = []
    for (let mask = 0; mask < 128; mask++) {
      const selected = Array.from({ length: 7 }, (_, i) => i).filter((i) => (mask >> i) & 1)
      const text = readPixelText(
        mixStencils(
          layers.map((layer: { bits: string }) => layer.bits),
          selected,
        ),
        rows,
        columns,
      )
      if (text) found.push({ selected, text })
    }
    expect(found).toEqual([{ selected: [0, 2, 6], text: 'DAWN' }])
    expect(
      mixStencils(
        layers.map((layer: { bits: string }) => layer.bits),
        [0, 2, 6],
      ),
    ).toBe(pixelText('DAWN').bits)
  })
})
