import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bacon, polybius } from '../src/game/codecs'
import { decodeXor } from '../src/game/mechanics'

const cases = JSON.parse(readFileSync('content/puzzles-19-library.json', 'utf8'))

describe('the library paper trail', () => {
  it('opens the box with modern Bacon notation and follows the mirrored coordinates', () => {
    expect(bacon(cases[0].artifact.code, 'decode')).toBe('OPEN')
    const restored = [...cases[1].artifact.code].reverse().join('')
    expect(restored).toBe('43 23 15 31 21 / 44 23 42 15 15')
    expect(polybius(restored, 'decode')).toBe('SHELF THREE')
  })
  it('extracts the actual book coordinates and uses their ASCII bytes as the repeating key', () => {
    const artifact = cases[2].artifact
    const lines = artifact.table.slice(1).map((row: string[]) => row[1])
    const key = artifact.code
      .split(' / ')
      .map((group: string) => {
        const [line, word, letter] = group.split('·').map(Number)
        return lines[line - 1].split(' ')[word - 1].replace(/[^a-z]/gi, '')[letter - 1]
      })
      .join('')
      .toUpperCase()
    expect(key).toBe('MARGIN')
    const bytes = [...key].map((letter) => letter.charCodeAt(0).toString(16)).join(' ')
    expect(decodeXor(cases[3].artifact.code, bytes)).toBe('TAKE YOUR TIME')
  })
})
