import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { archiveTools } from '../src/data/tools'
import {
  MAX_TOOL_INPUT,
  a1z26,
  atbash,
  bacon,
  modularPower,
  morse,
  polybius,
  railFence,
  rot47,
  runTool,
} from '../src/game/codecs'
import type { ToolMethod } from '../src/game/codecs'

describe('the decoding workbench', () => {
  it('has working, truthful examples for every tool', async () => {
    expect(new Set(archiveTools.map((tool) => tool.id)).size).toBe(18)
    for (const tool of archiveTools) {
      const result = await runTool(
        tool.id,
        tool.example,
        'decode',
        tool.key?.value,
        tool.auxiliary?.value,
      )
      expect(result, tool.id).toBe(
        tool.id === 'sha256'
          ? createHash('sha256').update(tool.plain).digest('hex')
          : tool.id === 'modpow'
            ? '48'
            : tool.plain,
      )
    }
  })
  it('round-trips Unicode and exact whitespace in byte-oriented tools', async () => {
    const original = '余响 📻\nECHO + 23:17 '
    for (const method of ['base64', 'hex', 'binary', 'decimal', 'url', 'xor'] as ToolMethod[]) {
      const encoded = await runTool(method, original, 'encode', '17 A3')
      expect(await runTool(method, encoded, 'decode', '17 A3')).toBe(original)
    }
    expect(railFence(railFence(original, 5, 'encode'), 5, 'decode')).toBe(original)
  })
  it('keeps classical conventions explicit and handles word boundaries', () => {
    expect(atbash('Abc XYZ!')).toBe('Zyx CBA!')
    expect(rot47(rot47('Hello! / 23:17 ~'))).toBe('Hello! / 23:17 ~')
    expect(polybius('WATER', 'encode')).toBe('52 11 44 15 42')
    expect(polybius(polybius('JOIN US', 'encode'), 'decode')).toBe('IOIN US')
    expect(bacon('AAAAB ABAAA BAAAB AAABB', 'decode')).toBe('BIRD')
    expect(a1z26('13-5-5-20/1-20/4-1-23-14', 'decode')).toBe('MEET AT DAWN')
    expect(morse(morse('ECHO 014', 'encode'), 'decode')).toBe('ECHO 014')
    expect(railFence('BGRNTAIE', 3, 'decode')).toBe('BRINGTEA')
  })
  it('computes modular powers without floating-point rounding', () => {
    expect(modularPower(27n, 3n, 55n)).toBe(48n)
    expect(modularPower(48n, 27n, 55n)).toBe(27n)
    expect(modularPower(-2n, 3n, 5n)).toBe(2n)
    expect(modularPower(7n, 0n, 1n)).toBe(0n)
    expect(() => modularPower(2n, -1n, 5n)).toThrow()
  })
  it('rejects malformed bytes, undefined symbols and excessive input', async () => {
    await expect(runTool('hex', 'F', 'decode')).rejects.toThrow()
    await expect(runTool('binary', '101', 'decode')).rejects.toThrow()
    await expect(runTool('decimal', '256', 'decode')).rejects.toThrow()
    await expect(runTool('url', '%ZZ', 'decode')).rejects.toThrow()
    await expect(runTool('bacon', 'BBBBB', 'decode')).rejects.toThrow()
    await expect(runTool('rail', 'ECHO', 'decode', '1')).rejects.toThrow()
    await expect(runTool('a1z26', '0 27', 'decode')).rejects.toThrow()
    await expect(runTool('morse', '........', 'decode')).rejects.toThrow()
    await expect(runTool('xor', '52 E0 5F EC', 'decode', 'XX')).rejects.toThrow()
    await expect(runTool('modpow', '27', 'encode', '3', '0')).rejects.toThrow()
    await expect(runTool('base64', 'A'.repeat(MAX_TOOL_INPUT + 1), 'decode')).rejects.toThrow()
  })
})
