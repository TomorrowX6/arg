import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  countNonogramSolutions,
  makeCircuit,
  makeLights,
  makeSliding,
  makeWarehouse,
  nonogramPatterns,
  transformSquare,
} from '../src/game/procedural'
import { seededRandom, generateFieldPuzzle } from '../src/game/field'
import {
  generateFieldV2,
  isArchiveDate,
  nextFieldIndex,
  FIELD_MAX_INDEX,
} from '../src/game/field-v2'
import {
  nonogramClues,
  rotateWire,
  slideTile,
  toggleLights,
  traceCircuit,
  isSlidingSolvable,
} from '../src/game/mechanics'
import { isWarehouseSolved, moveWarehouse, parseWarehouse } from '../src/game/miniGames'
import { fieldWords } from '../src/data/field-words'

describe('generated boards and transmission protocol v2', () => {
  it('keeps the published v2 artifacts stable for every family', () => {
    const fingerprints = Array.from({ length: 24 }, (_, index) => {
      const { answer, artifact } = generateFieldV2('2026-09-14', index)
      return createHash('sha256').update(JSON.stringify({ answer, artifact })).digest('hex')
    })
    expect(fingerprints).toMatchSnapshot()
  })
  it('uses only uniquely solvable nonogram patterns, including their rotations and reflections', () => {
    expect(countNonogramSolutions(2, [[1], [1]], [[1], [1]])).toBe(2)
    for (const [index, pattern] of nonogramPatterns.entries())
      for (let turn = 0; turn < 4; turn++)
        for (const mirror of [true, false]) {
          const flat = transformSquare([...pattern.join('')].map(Number), 5, turn, mirror)
          const rows = Array.from({ length: 5 }, (_, row) =>
            nonogramClues(flat.slice(row * 5, row * 5 + 5)),
          )
          const columns = Array.from({ length: 5 }, (_, col) =>
            nonogramClues(flat.filter((_, i) => i % 5 === col)),
          )
          expect(
            countNonogramSolutions(5, rows, columns),
            `pattern ${index}, turn ${turn}, mirror ${mirror}`,
          ).toBe(1)
        }
  })
  it('generates lights, sliding and circuit boards whose published moves actually solve them', () => {
    for (let seed = 0; seed < 150; seed++) {
      const random = seededRandom(`generator-test-${seed}`)
      const lights = makeLights(random)
      expect(lights.initial.some(Boolean)).toBe(true)
      expect(
        lights.solution.reduce((state, move) => toggleLights(state, 3, move), lights.initial),
      ).toEqual(Array(9).fill(0))
      const sliding = makeSliding(random)
      expect(isSlidingSolvable(sliding.initial, 3)).toBe(true)
      expect(sliding.initial).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0])
      expect(
        sliding.solution.reduce(
          (state, tile) => slideTile(state, 3, state.indexOf(tile)),
          sliding.initial,
        ),
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0])
      const size = seed % 2 ? 3 : 4,
        circuit = makeCircuit(random, size)
      expect(traceCircuit(circuit.initial, size).connected).toBe(false)
      const restored = circuit.initial.map((mask, index) => {
        for (let i = 0; i < circuit.solution[index]; i++) mask = rotateWire(mask)
        return mask
      })
      expect(traceCircuit(restored, size).connected).toBe(true)
    }
  })
  it('transforms warehouse coordinates and directional solutions consistently', () => {
    const layouts = new Set<string>()
    for (let seed = 0; seed < 150; seed++) {
      const board = makeWarehouse(seededRandom(`warehouse-${seed}`))
      layouts.add(board.layout.join('\n'))
      const warehouse = parseWarehouse(board.layout)
      const final = board.solution.reduce(
        (state, direction) => moveWarehouse(warehouse, state, direction),
        warehouse.start,
      )
      expect(isWarehouseSolved(warehouse, final)).toBe(true)
    }
    expect(layouts.size).toBe(16)
  })
  it('produces deterministic, self-contained content across all 24 families', () => {
    const methods = new Set<string>(),
      words = new Set<string>()
    for (let index = 0; index < 1200; index++) {
      const first = generateFieldV2('2026-09-14', index),
        second = generateFieldV2('2026-09-14', index)
      expect(first).toEqual(second)
      expect(first.id).toBe(`field-v2-2026-09-14-${index}`)
      expect(first.hints).toHaveLength(3)
      expect(first.hints[2]).toContain(first.answer)
      expect(first.answer).toMatch(/^[A-Z]+$/)
      expect(first.artifact.code || first.artifact.config).toBeTruthy()
      methods.add(first.method)
      words.add(first.answer)
    }
    expect(methods.size).toBe(24)
    expect(words.size).toBe(fieldWords.length)
    expect(generateFieldPuzzle('2026-09-14', 0).id).toBe('field-2026-09-14-0')
  })
  it('rejects impossible calendar dates and never stalls at an index boundary', () => {
    expect(isArchiveDate('2026-02-29')).toBe(false)
    expect(isArchiveDate('2024-02-29')).toBe(true)
    expect(isArchiveDate('2026-02-31')).toBe(false)
    expect(isArchiveDate('not-a-date')).toBe(false)
    expect(nextFieldIndex(12, 'device')).toBe(13)
    expect(nextFieldIndex(23, 'cipher')).toBe(24)
    expect(nextFieldIndex(13, 'cipher', -1)).toBe(12)
    expect(nextFieldIndex(0, 'all', -1)).toBeNull()
    expect(nextFieldIndex(FIELD_MAX_INDEX, 'all')).toBeNull()
  })
})
