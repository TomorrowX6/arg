import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  crossBridge,
  possibleSymbolCodes,
  reflectBeam,
  scoreSymbols,
  solveBridge,
  solveLaser,
  traceLaser,
} from '../src/game/fairground'
import type { BeamDirection, BridgeState, LaserBoard, MirrorTilt } from '../src/game/fairground'

const cases = JSON.parse(readFileSync('content/puzzles-13-fairground.json', 'utf8'))

describe('the fairground mechanisms and story clues', () => {
  it('reflects all incoming directions and stops at walls, boundaries and repeated beam states', () => {
    expect(
      ['up', 'right', 'down', 'left'].map((direction) =>
        reflectBeam(direction as BeamDirection, '/'),
      ),
    ).toEqual(['right', 'up', 'left', 'down'])
    expect(
      ['up', 'right', 'down', 'left'].map((direction) =>
        reflectBeam(direction as BeamDirection, '\\'),
      ),
    ).toEqual(['left', 'down', 'right', 'up'])
    const simple: LaserBoard = {
      size: 3,
      source: { x: -1, y: 1, direction: 'right' },
      exit: { x: 3, y: 1 },
      mirrors: [],
      walls: [],
      receivers: [4],
    }
    expect(traceLaser(simple)).toMatchObject({
      solved: true,
      ending: 'exit',
      receivers: [4],
      cells: [3, 4, 5],
    })
    expect(traceLaser({ ...simple, receivers: [0] })).toMatchObject({
      solved: false,
      ending: 'exit',
    })
    expect(traceLaser({ ...simple, walls: [4] }).ending).toBe('wall')
    expect(traceLaser({ ...simple, exit: { x: 3, y: 2 } }).ending).toBe('edge')
    const loop: LaserBoard = {
      size: 3,
      source: { x: 0, y: 1, direction: 'up' },
      exit: { x: 3, y: 2 },
      mirrors: [
        { cell: 0, tilt: '/' },
        { cell: 2, tilt: '\\' },
        { cell: 8, tilt: '/' },
        { cell: 6, tilt: '\\' },
      ],
      walls: [],
      receivers: [],
    }
    expect(traceLaser(loop).ending).toBe('loop')
  })
  it('solves both authored optical boards using the exact moves in their complete hints', () => {
    for (const [id, flips] of [
      ['x22', [12, 24]],
      ['x25', [9, 25, 29, 14, 6]],
    ] as const) {
      const config = cases.find((puzzle: { id: string }) => puzzle.id === id).artifact
        .config as LaserBoard
      expect(traceLaser(config).solved).toBe(false)
      const tilts = config.mirrors.map((mirror) =>
        new Set<number>(flips).has(mirror.cell + 1)
          ? mirror.tilt === '/'
            ? '\\'
            : '/'
          : mirror.tilt,
      ) as MirrorTilt[]
      const traced = traceLaser(config, tilts)
      expect(traced.solved).toBe(true)
      expect(traced.receivers).toHaveLength(config.receivers.length)
      expect(solveLaser(config, 2)).toHaveLength(1)
    }
  })
  it('does not count repeated code symbols twice and filters only candidates consistent with every record', () => {
    expect(scoreSymbols([1, 2, 1, 3], [1, 1, 1, 1])).toEqual({ exact: 2, misplaced: 0 })
    expect(scoreSymbols([1, 2, 1, 3], [2, 1, 3, 1])).toEqual({ exact: 0, misplaced: 4 })
    expect(scoreSymbols([1, 2, 1, 3], [1, 1, 4, 4])).toEqual({ exact: 1, misplaced: 1 })
    const history = [
      { symbols: [0, 0, 0, 0], exact: 0, misplaced: 0 },
      { symbols: [3, 5, 3, 4], exact: 4, misplaced: 0 },
    ]
    expect(possibleSymbolCodes(6, 4, history)).toEqual([[3, 5, 3, 4]])
    expect(possibleSymbolCodes(6, 4, history.slice(0, 1))).toHaveLength(625)
  })
  it('carries the lamp with at most two people, charges the slower time and finds the optimal plan', () => {
    const start: BridgeState = { sides: [0, 0, 0, 0], lamp: 0, elapsed: 0 }
    const times = [1, 2, 5, 10]
    expect(crossBridge(start, [], times)).toBeNull()
    expect(crossBridge(start, [0, 0], times)).toBeNull()
    expect(crossBridge(start, [0, 1, 2], times)).toBeNull()
    const first = crossBridge(start, [0, 1], times)!
    expect(first).toEqual({ sides: [1, 1, 0, 0], lamp: 1, elapsed: 2 })
    expect(crossBridge(first, [2], times)).toBeNull()
    const plan = [[0, 1], [0], [2, 3], [1], [0, 1]]
    expect(plan.reduce((state, people) => crossBridge(state, people, times)!, start)).toEqual({
      sides: [1, 1, 1, 1],
      lamp: 1,
      elapsed: 17,
    })
    expect(solveBridge(times)?.minutes).toBe(17)
    expect(solveBridge([1, 3, 6, 8])?.minutes).toBe(18)
    expect(start.sides).toEqual([0, 0, 0, 0])
  })
  it('gives a unique seating deduction and a fair five-ticket finale', () => {
    function permutations<T>(items: T[]): T[][] {
      return items.length
        ? items.flatMap((item, i) =>
            permutations(items.filter((_, j) => i !== j)).map((rest) => [item, ...rest]),
          )
        : [[]]
    }
    const possible = permutations(['阿禾', '小满', '秦叔', '宁婆', '空椅']).filter((order) => {
      const [a, x, q, n, empty] = ['阿禾', '小满', '秦叔', '宁婆', '空椅'].map((name) =>
        order.indexOf(name),
      )
      return n - x === 2 && a - x === 1 && a - q > 1 && empty - n === 1
    })
    expect(possible).toEqual([['秦叔', '小满', '阿禾', '宁婆', '空椅']])
    const table = cases.at(-1).artifact.table as string[][]
    const words = ['开场', '灯影', '共赴', '留座', '回声']
      .map((mark) => {
        const row = table.find((row) => row[0] === mark)!
        return [...row[1]][Number(row[2]) - 1]
      })
      .join('')
    expect(words).toBe('我们会再见')
    expect(cases.at(-1).answers).toContain(words)
  })
})
