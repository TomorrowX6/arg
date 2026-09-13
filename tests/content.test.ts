import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Puzzle } from '../src/game/types'
import {
  puzzles,
  mainPuzzles,
  getStatus,
  getNextPuzzle,
  getNextSidePuzzle,
  puzzleById,
} from '../src/data/archive'
import { normalizeAnswer } from '../src/game/answers'
import { decodeVigenere, decodeXor, isConnected } from '../src/game/mechanics'

const authored = readdirSync('content')
  .filter((name) => /^puzzles.*\.json$/.test(name))
  .flatMap((file) => JSON.parse(readFileSync(`content/${file}`, 'utf8'))) as (Omit<
  Puzzle,
  'answerHashes'
> & { answers: string[] })[]

describe('the authored campaign', () => {
  it('does not treat JavaScript prototype names as archive identities', () => {
    expect(puzzleById.constructor).toBeUndefined()
    expect(puzzleById.__proto__).toBeUndefined()
  })
  it('keeps optional investigations separate from the next main case', () => {
    expect(getNextPuzzle({ solved: {}, activePuzzle: 'x01' })?.id).toBe('a01')
    const state = { solved: { x01: { at: '2026-09-14T00:00:00Z', hints: 0, attempts: 1 } } }
    expect(
      getNextSidePuzzle(
        puzzles.find((puzzle) => puzzle.id === 'x01')!,
        state,
      )?.id,
    ).toBe('x02')
    expect(mainPuzzles).toHaveLength(36)
  })
  it('compiles every source record and hashes all accepted answers consistently', () => {
    expect(puzzles).toHaveLength(authored.length)
    for (const source of authored) {
      const compiled = puzzles.find((p) => p.id === source.id)!
      expect(compiled).toBeDefined()
      for (const answer of source.answers) {
        const hash = createHash('sha256')
          .update(`echo-archive:${source.id}:${normalizeAnswer(answer)}`)
          .digest('hex')
        expect(compiled.answerHashes).toContain(hash)
      }
      expect(compiled).not.toHaveProperty('answers')
    }
  })
  it('has unique identities, three useful hints and actual story rewards', () => {
    expect(new Set(puzzles.map((p) => p.id)).size).toBe(puzzles.length)
    expect(new Set(puzzles.map((p) => p.number)).size).toBe(puzzles.length)
    for (const puzzle of puzzles) {
      expect(puzzle.hints).toHaveLength(3)
      expect(puzzle.briefing.length).toBeGreaterThan(0)
      expect(puzzle.resolution.length).toBeGreaterThan(20)
      expect(puzzle.evidence.text.length).toBeGreaterThan(10)
      expect(puzzle.answerHashes.length).toBeGreaterThan(0)
      expect(puzzle.artifact.type).toBe(puzzle.kind)
    }
  })
  it('lets every authored case become reachable without circular prerequisites', () => {
    const solved: Record<string, { at: string; hints: number; attempts: number }> = {}
    let remaining = [...puzzles]
    for (let pass = 0; pass < puzzles.length && remaining.length; pass++) {
      const ready = remaining.filter((p) => getStatus(p, { solved }) === 'available')
      expect(ready.length, `Unreachable: ${remaining.map((p) => p.id).join(',')}`).toBeGreaterThan(
        0,
      )
      for (const p of ready) solved[p.id] = { at: new Date().toISOString(), hints: 0, attempts: 1 }
      remaining = remaining.filter((p) => !solved[p.id])
    }
    expect(remaining).toHaveLength(0)
  })
  it('contains feasible ranges, connected routes and complete sort permutations', () => {
    for (const puzzle of puzzles) {
      const config = puzzle.artifact.config
      if (!config) continue
      if (puzzle.kind === 'frequency') {
        expect(config.target).toBeGreaterThanOrEqual(config.min as number)
        expect(config.target).toBeLessThanOrEqual(config.max as number)
      }
      if (puzzle.kind === 'route') {
        const path = config.path as string[]
        for (let i = 1; i < path.length; i++)
          expect(isConnected(path[i - 1], path[i], config.edges as string[][])).toBe(true)
      }
      if (puzzle.kind === 'sort') {
        const ids = (config.items as { id: string }[]).map((i) => i.id)
        expect([...(config.correct as string[])].sort()).toEqual(ids.sort())
      }
      if (puzzle.kind === 'nonogram') {
        expect(config.solution as number[]).toHaveLength((config.size as number) ** 2)
        expect((config.solution as number[]).every((n) => n === 0 || n === 1)).toBe(true)
      }
    }
  })
  it('verifies the multi-stage cryptographic reveals against independent clues', () => {
    expect(decodeVigenere(puzzles.find((p) => p.id === 'c06')!.artifact.code!, 'LARK')).toBe(
      'CONSENT',
    )
    expect(decodeXor(puzzles.find((p) => p.id === 'd04')!.artifact.code!, '17')).toBe('BIRD')
    const candidates = ['林雀', '陈舟', '许衡']
    const possible = candidates.filter(
      (person) =>
        [person !== '林雀', person === '陈舟', person !== '陈舟'].filter(Boolean).length === 1,
    )
    expect(possible).toEqual(['林雀'])
    const copies = ['0100111001001111', '0101111001000111', '0000111001001101']
    const recovered = [...copies[0]]
      .map((_, i) => (copies.filter((c) => c[i] === '1').length >= 2 ? '1' : '0'))
      .join('')
    expect(
      recovered
        .match(/.{8}/g)!
        .map((byte) => String.fromCharCode(parseInt(byte, 2)))
        .join(''),
    ).toBe('NO')
  })
})
