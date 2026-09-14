import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  moveRopeNode,
  pointSegmentDistance,
  segmentsIntersect,
  untangleStatus,
} from '../src/game/untangle'
import { decodeVigenere } from '../src/game/mechanics'

const cases = JSON.parse(readFileSync('content/puzzles-18-theatre.json', 'utf8'))
const solutions = [
  [
    [20, 20],
    [80, 20],
    [80, 80],
    [65, 35],
  ],
  [
    [50, 12],
    [88, 84],
    [12, 84],
    [50, 38],
    [67, 70],
    [33, 70],
  ],
  [
    [12, 12],
    [88, 12],
    [88, 88],
    [12, 88],
    [35, 35],
    [65, 35],
    [65, 65],
    [35, 65],
  ],
].map((points) => points.map(([x, y]) => ({ x, y })))

describe('paper theatre geometry', () => {
  it('accepts the three written layouts and a different planar arrangement', () => {
    cases
      .slice(0, 3)
      .forEach(
        (puzzle: { artifact: { config: Parameters<typeof untangleStatus>[0] } }, index: number) => {
          const config = puzzle.artifact.config
          expect(untangleStatus(config).complete).toBe(false)
          expect(untangleStatus(config).crossings.length).toBe([1, 5, 10][index])
          expect(untangleStatus(config, solutions[index]).complete).toBe(true)
        },
      )
    expect(
      untangleStatus(
        cases[2].artifact.config,
        solutions[2].map(({ x, y }) => ({ x: 100 - x, y })),
      ).complete,
    ).toBe(true)
  })
  it('detects crossing, collinear overlap and endpoint contact without treating disjoint lines as crossed', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toBe(true)
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 15, y: 0 }),
    ).toBe(true)
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 10 }),
    ).toBe(true)
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 12, y: 0 }, { x: 15, y: 0 }),
    ).toBe(false)
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 }),
    ).toBe(false)
  })
  it('rejects a rope passing through another round card even before the center lines cross', () => {
    const config = {
      nodes: [
        { id: 'A', label: '', x: 20, y: 50 },
        { id: 'B', label: '', x: 80, y: 50 },
        { id: 'C', label: '', x: 50, y: 54 },
        { id: 'D', label: '', x: 80, y: 80 },
      ],
      edges: [
        ['A', 'B'],
        ['C', 'D'],
      ] as [string, string][],
      message: '',
    }
    const status = untangleStatus(config)
    expect(status.crossings).toEqual([])
    expect(status.blocked).toEqual([{ node: 2, edge: 0 }])
    expect(status.complete).toBe(false)
    expect(pointSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
    expect(pointSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5)
  })
  it('does not allow collapsed cards, overlapping incident ropes, moved fixed points or off-stage positions', () => {
    const config = cases[0].artifact.config
    const collapsed = solutions[0].map((point) => ({ ...point }))
    collapsed[3] = { ...collapsed[0] }
    expect(untangleStatus(config, collapsed).overlaps).toContainEqual([0, 3])
    const aligned = solutions[0].map((point) => ({ ...point }))
    aligned[3] = { x: 50, y: 20 }
    expect(untangleStatus(config, aligned).crossings.length).toBeGreaterThan(0)
    const moved = solutions[0].map((point) => ({ ...point }))
    moved[0].x++
    expect(untangleStatus(config, moved).invalidPoints).toEqual([0])
    const initial = config.nodes.map(({ x, y }: { x: number; y: number }) => ({ x, y }))
    expect(moveRopeNode(config, initial, 0, { x: 50, y: 50 })).toBe(initial)
    expect(moveRopeNode(config, initial, 3, { x: -10, y: 120 })[3]).toEqual({ x: 8, y: 92 })
    expect(initial[3]).toEqual({ x: 20, y: 80 })
  })
  it('uses the three recovered words as the final cipher key', () => {
    const key = cases
      .slice(0, 3)
      .map((puzzle: { answers: string[] }) => puzzle.answers[0])
      .join('')
    expect(key).toBe('BELLWINGROW')
    expect(decodeVigenere(cases[3].artifact.code, key)).toBe('LEAVE ONE SEAT')
  })
})
