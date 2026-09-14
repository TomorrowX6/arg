import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  campNeighbors,
  loopEdges,
  loopStatus,
  pairTents,
  solveLoop,
  solveTents,
  tentStatus,
} from '../src/game/camp'
import { decodeVigenere } from '../src/game/mechanics'

const cases = JSON.parse(readFileSync('content/puzzles-17-camp.json', 'utf8'))
const config = (id: string) =>
  cases.find((puzzle: { id: string }) => puzzle.id === id).artifact.config

describe('the camp has room for both logic and a duck', () => {
  it('gives both tree maps exactly one legal placement', () => {
    const expected: Record<string, number[]> = {
      x47: [0, 2, 8, 11],
      x49: [0, 5, 9, 13, 21, 23, 25],
    }
    for (const id of ['x47', 'x49']) {
      const source = config(id)
      expect(solveTents(source)).toEqual([expected[id]])
      expect(tentStatus(source, expected[id]).complete).toBe(true)
      expect(tentStatus(source, expected[id].slice(1)).complete).toBe(false)
    }
  })
  it('finds a one-to-one pairing when a greedy first choice would fail', () => {
    const source = {
      size: 4,
      trees: [1, 3],
      rowCounts: [2, 0, 0, 0],
      columnCounts: [1, 0, 1, 0],
      message: '',
    }
    expect(pairTents(source, [2, 0])).toEqual([
      { tree: 1, tent: 0 },
      { tree: 3, tent: 2 },
    ])
    expect(tentStatus(source, [2, 0]).complete).toBe(true)
    const stranded = {
      size: 5,
      trees: [1, 3, 24],
      rowCounts: [3, 0, 0, 0, 0],
      columnCounts: [1, 0, 1, 0, 1],
      message: '',
    }
    const result = tentStatus(stranded, [0, 2, 4])
    expect(result.conflicts).toEqual([])
    expect(result.pairs).toHaveLength(2)
    expect(result.complete).toBe(false)
    expect(solveTents(stranded)).toEqual([])
  })
  it('does not allow touching corners, tree occupancy or duplicate tent entries', () => {
    expect(campNeighbors(4, 0)).toEqual([1, 4])
    expect(campNeighbors(4, 0, true)).toEqual([1, 4, 5])
    expect(tentStatus(config('x47'), [0, 5]).conflicts).toEqual([0, 5])
    expect(tentStatus(config('x47'), [1, 2, 8, 11]).complete).toBe(false)
    expect(tentStatus(config('x47'), [0, 0, 8, 11]).complete).toBe(false)
  })
  it('gives each loop puzzle one connected solution matching the written line coordinates', () => {
    const expected: Record<string, string[]> = {
      x48: ['h0-0', 'h0-1', 'h1-0', 'h3-1', 'v0-0', 'v0-2', 'v1-1', 'v1-2', 'v2-1', 'v2-2'],
      x50: [
        'h0-0',
        'h0-1',
        'h0-2',
        'h1-0',
        'h1-2',
        'h2-2',
        'h2-3',
        'h3-1',
        'h4-2',
        'h4-3',
        'v0-0',
        'v0-3',
        'v1-1',
        'v1-2',
        'v2-1',
        'v2-4',
        'v3-2',
        'v3-4',
      ],
    }
    for (const id of ['x48', 'x50']) {
      const source = config(id),
        edges = loopEdges(source)
      const solutions = solveLoop(source)
      expect(solutions).toHaveLength(1)
      expect(edges.filter((_, index) => solutions[0][index]).map((edge) => edge.id)).toEqual(
        expected[id],
      )
      expect(loopStatus(source, solutions[0]).complete).toBe(true)
      expect(
        loopStatus(
          source,
          solutions[0].map((value) => (value === 0 ? 2 : 1)),
        ).complete,
      ).toBe(true)
    }
  })
  it('rejects separate closed loops even when every local vertex rule is satisfied', () => {
    const source = { rows: 1, columns: 3, clues: [null, null, null], message: '' }
    const edges = loopEdges(source)
    const selected = ['h0-0', 'h1-0', 'v0-0', 'v0-1', 'h0-2', 'h1-2', 'v0-2', 'v0-3']
    const result = loopStatus(
      source,
      edges.map((edge) => (selected.includes(edge.id) ? 1 : 0)),
    )
    expect(result.closed).toBe(true)
    expect(result.components).toBe(2)
    expect(result.complete).toBe(false)
    expect(solveLoop(source)).toHaveLength(2)
    expect(solveLoop({ rows: 1, columns: 1, clues: [0], message: '' })).toEqual([])
    expect(solveLoop({ rows: 1, columns: 1, clues: [4], message: '' })).toEqual([[1, 1, 1, 1]])
  })
  it('detects a branch and distinguishes a missing clue from a zero', () => {
    const source = { rows: 2, columns: 2, clues: [0, null, null, null], message: '' }
    const values = loopEdges(source).map((edge) =>
      ['h1-0', 'h1-1', 'v0-1'].includes(edge.id) ? 1 : 0,
    )
    const result = loopStatus(source, values)
    expect(result.branches).toEqual([4])
    expect(result.clueConflicts).toEqual([0])
    expect(result.complete).toBe(false)
  })
  it('uses the four actual clues to identify the key, then decrypts the last instruction', () => {
    const text = cases
      .slice(0, 4)
      .map((puzzle: { answers: string[] }) => puzzle.answers[0].toLowerCase())
      .join('-')
    const digest = createHash('sha256').update(text).digest('hex')
    expect(
      cases[4].artifact.table.filter((row: string[]) => row[0] === digest.slice(0, 12)),
    ).toEqual([[digest.slice(0, 12), 'DUCK']])
    expect(decodeVigenere(cases[5].artifact.code, 'DUCK')).toBe('BRING BISCUITS')
  })
})
