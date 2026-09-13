import { describe, expect, it } from 'vitest'
import { caesar, decodeBase64, isConnected, runTerminal, toggleLights } from '../src/game/mechanics'
import { normalizeAnswer, checkAnswer } from '../src/game/answers'
import { createHash } from 'node:crypto'
import { archiveDate, generateFieldPuzzle } from '../src/game/field'

describe('answer handling', () => {
  it('accepts Unicode width, CTF wrappers, case and spaces while retaining meaningful punctuation', () => {
    expect(normalizeAnswer('  ＦＬＡＧ{Ｎｏｒｔｈ Ｐｉｅｒ} ')).toBe('northpier')
    expect(normalizeAnswer('23:17')).toBe('23:17')
    expect(normalizeAnswer(' 回 声 仍 在 ')).toBe('回声仍在')
  })
  it('validates salted SHA256 without accepting a different puzzle or blank answer', async () => {
    const hash = createHash('sha256').update('echo-archive:sample:echo').digest('hex')
    expect(await checkAnswer('sample', ' E C H O ', [hash])).toBe(true)
    expect(await checkAnswer('different', 'ECHO', [hash])).toBe(false)
    expect(await checkAnswer('sample', ' ', [hash])).toBe(false)
  })
})

describe('mechanics', () => {
  it('wraps the alphabet in both directions', () => {
    expect(caesar('Abc Xyz!', -3)).toBe('Xyz Uvw!')
    expect(caesar(caesar('NORTH PIER', 17), -17)).toBe('NORTH PIER')
  })
  it('decodes UTF8 Base64 and rejects invalid payloads', () => {
    expect(decodeBase64('5Zue5aOw')).toBe('回声')
    expect(() => decodeBase64('@@invalid')).toThrow()
  })
  it('toggles only orthogonal neighbors and the same move cancels itself', () => {
    expect(toggleLights(Array(9).fill(0), 3, 0)).toEqual([1, 1, 0, 1, 0, 0, 0, 0, 0])
    const board = [1, 0, 1, 0, 1, 0, 1, 0, 1]
    expect(toggleLights(toggleLights(board, 3, 4), 3, 4)).toEqual(board)
  })
  it('solves the introductory grid using its published hints', () => {
    let board = Array(9).fill(1)
    for (const index of [0, 2, 6, 8, 4]) board = toggleLights(board, 3, index)
    expect(board.every((n) => n === 0)).toBe(true)
  })
  it('keeps the terminal inside its fictional filesystem', () => {
    const files = { 'note.txt': 'hello archive', '.operator': 'LARK' }
    expect(runTerminal('ls', files)).not.toContain('operator')
    expect(runTerminal('ls -a', files)).toContain('.operator')
    expect(runTerminal('cat .operator', files)).toBe('LARK')
    expect(runTerminal('cat /etc/passwd', files)).toContain('无法读取')
    expect(runTerminal('cat constructor', files)).toContain('无法读取')
    expect(runTerminal('rm -rf /', files)).toContain('未知命令')
  })
  it('treats route edges as bidirectional without allowing teleportation', () => {
    expect(isConnected('B', 'A', [['A', 'B']])).toBe(true)
    expect(isConnected('A', 'C', [['A', 'B']])).toBe(false)
  })
})

describe('replayable field transmissions', () => {
  it('uses UTC+8 for daily seeds across the UTC midnight boundary', () => {
    expect(archiveDate(new Date('2026-09-13T17:30:00Z'))).toBe('2026-09-14')
    expect(archiveDate(new Date('2026-09-13T15:59:59Z'))).toBe('2026-09-13')
  })
  it('is deterministic and produces valid self-contained clues for a large sample', () => {
    for (let index = 0; index < 1000; index++) {
      const a = generateFieldPuzzle('2026-09-14', index),
        b = generateFieldPuzzle('2026-09-14', index)
      expect(a).toEqual(b)
      expect(a.answer).toMatch(/^[A-Z]+$/)
      expect(a.hints).toHaveLength(3)
      expect(a.hints[2]).toContain(a.answer)
      expect(a.artifact.code).toBeTruthy()
    }
  })
})
