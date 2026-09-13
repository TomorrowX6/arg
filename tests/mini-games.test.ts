import { describe, expect, it } from 'vitest'
import {
  changeJugs,
  crossRiver,
  isWarehouseSolved,
  moveWarehouse,
  parseWarehouse,
  possibleHeavyCoins,
  solveJugs,
  solveWarehouse,
  weighCoins,
} from '../src/game/miniGames'
import type { FerryState, JugState, Weighing } from '../src/game/miniGames'

describe('the supply station mechanisms', () => {
  it('can identify any of nine heavier coins in two balanced-count weighings', () => {
    for (let heavy = 1; heavy <= 9; heavy++) {
      const first: Weighing = {
        left: [1, 2, 3],
        right: [4, 5, 6],
        result: weighCoins([1, 2, 3], [4, 5, 6], heavy),
      }
      const group = possibleHeavyCoins(9, [first])
      expect(group).toHaveLength(3)
      const second: Weighing = {
        left: [group[0]],
        right: [group[1]],
        result: weighCoins([group[0]], [group[1]], heavy),
      }
      expect(possibleHeavyCoins(9, [first, second])).toEqual([heavy])
    }
    expect(possibleHeavyCoins(9, [])).toHaveLength(9)
  })
  it('pours only available water and stops when the receiving jug fills', () => {
    expect(changeJugs([5, 2], [5, 3], 'pour01')).toEqual([4, 3])
    expect(changeJugs([1, 0], [5, 3], 'pour01')).toEqual([0, 1])
    expect(changeJugs([5, 3], [5, 3], 'pour01')).toEqual([5, 3])
    expect(changeJugs([0, 3], [5, 3], 'pour10')).toEqual([3, 0])
    const path = solveJugs([5, 3], 0, 4)!
    expect(path).toHaveLength(6)
    const end = path.reduce<JugState>((state, action) => changeJugs(state, [5, 3], action), [0, 0])
    expect(end).toEqual([4, 3])
    expect(solveJugs([6, 4], 0, 5)).toBeNull()
  })
  it('blocks unattended conflicting pairs and supports the seven-crossing ferry solution', () => {
    const initial: FerryState = { boat: 0, sides: [0, 0, 0] },
      conflicts = [
        [0, 1],
        [1, 2],
      ]
    const invalid = crossRiver(initial, 0, conflicts)
    expect(invalid.state).toBe(initial)
    expect(invalid.conflict).toEqual([1, 2])
    let state = initial
    for (const cargo of [1, null, 0, 1, 2, null, 1]) {
      const move = crossRiver(state, cargo, conflicts)
      expect(move.conflict).toBeUndefined()
      expect(move.error).toBeUndefined()
      state = move.state
    }
    expect(state).toEqual({ boat: 1, sides: [1, 1, 1] })
    expect(crossRiver({ boat: 1, sides: [0, 1, 0] }, 0, conflicts).error).toBe('away')
  })
  it('supports crate pushing, blocks walls and proves the warehouse is solvable', () => {
    const warehouse = parseWarehouse([
      '#######',
      '#  .  #',
      '#  #  #',
      '# $$ .#',
      '#  @  #',
      '#     #',
      '#######',
    ])
    const path = solveWarehouse(warehouse)!
    expect(path).toHaveLength(10)
    const end = path.reduce(
      (state, direction) => moveWarehouse(warehouse, state, direction),
      warehouse.start,
    )
    expect(isWarehouseSolved(warehouse, end)).toBe(true)
    expect(end.boxes).toEqual([...warehouse.goals].sort((a, b) => a - b))
    const blocked = moveWarehouse(warehouse, warehouse.start, 'up')
    expect(blocked).toBe(warehouse.start)
    const edge = parseWarehouse(['@$.'])
    expect(moveWarehouse(edge, edge.start, 'left')).toBe(edge.start)
    expect(moveWarehouse(edge, edge.start, 'up')).toBe(edge.start)
    expect(isWarehouseSolved(edge, moveWarehouse(edge, edge.start, 'right'))).toBe(true)
  })
})
