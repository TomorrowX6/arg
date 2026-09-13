import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  PNG_SIGNATURE,
  crc32,
  extractPixelBits,
  hasPngSignature,
  parseHexBytes,
  parsePng,
  readPngPixels,
  readTextChunk,
} from '../src/game/forensics'

const file = (name: string) => new Uint8Array(readFileSync(`public/assets/evidence/${name}`))

describe('the downloadable forensic evidence', () => {
  it('repairs only the broken signature while preserving all image chunks', async () => {
    const original = file('pier-04.png')
    expect(hasPngSignature(original)).toBe(false)
    expect(() => parsePng(original)).toThrow('文件签名')
    const restored = new Uint8Array(original)
    restored.set(PNG_SIGNATURE)
    expect(restored.subarray(8)).toEqual(original.subarray(8))
    const chunks = parsePng(restored)
    expect(chunks.every((chunk) => chunk.crcValid)).toBe(true)
    const image = await readPngPixels(restored)
    expect([image.width, image.height, image.channels]).toEqual([480, 300, 3])
  })
  it('stores the next clue inside a real tEXt block with a valid CRC', () => {
    const chunks = parsePng(file('last-print.png'))
    const metadata = chunks
      .filter((chunk) => chunk.type === 'tEXt')
      .map((chunk) => readTextChunk(chunk.data))
    const comment = metadata.find((entry) => entry.keyword === 'Comment')!
    expect(Buffer.from(comment.value, 'base64').toString()).toBe('BLUE 0')
    expect(chunks.every((chunk) => chunk.crcValid)).toBe(true)
  })
  it('extracts the final message from actual pixel bytes, not a configured answer', async () => {
    const image = await readPngPixels(file('before-dawn.png'))
    const blue = extractPixelBits(image.pixels, image.channels, 2, 0, 104)
    expect(blue.text).toBe('FERRY AT SIX')
    expect(blue.bits.endsWith('00000000')).toBe(true)
    expect(extractPixelBits(image.pixels, image.channels, 0, 0, 104).text).not.toBe(blue.text)
    expect(extractPixelBits(image.pixels, image.channels, 2, 7, 104).text).not.toBe(blue.text)
  })
  it('rejects incomplete bytes and out-of-bounds chunks instead of rendering them', () => {
    expect(parseHexBytes('89 50 4e 47\n0d 0a 1a 0a')).toEqual(Uint8Array.from(PNG_SIGNATURE))
    expect(() => parseHexBytes('89 5')).toThrow()
    expect(() => parseHexBytes('GG')).toThrow()
    const source = file('last-print.png')
    expect(() => parsePng(source.subarray(0, 20))).toThrow('长度超过')
    const corrupt = new Uint8Array(source)
    corrupt[30] ^= 1
    expect(parsePng(corrupt)[0].crcValid).toBe(false)
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
  it('reconstructs RGB scanlines using every PNG filter', async () => {
    const rows = [
      [20, 70, 120, 190, 250, 40],
      [30, 90, 130, 220, 10, 75],
      [80, 25, 99, 4, 241, 123],
      [8, 48, 110, 252, 3, 26],
      [15, 39, 141, 9, 245, 87],
    ]
    const raw: number[] = []
    for (const [filter, row] of rows.entries()) {
      raw.push(filter)
      row.forEach((value, x) => {
        const left = x >= 3 ? row[x - 3] : 0,
          up = filter ? rows[filter - 1][x] : 0,
          corner = filter && x >= 3 ? rows[filter - 1][x - 3] : 0
        const p = left + up - corner
        const candidates = [left, up, corner]
        const chosen = candidates.reduce((best, candidate) =>
          Math.abs(p - candidate) < Math.abs(p - best) ? candidate : best,
        )
        const prediction = [0, left, up, Math.floor((left + up) / 2), chosen][filter]
        raw.push((value - prediction + 256) % 256)
      })
    }
    const chunk = (type: string, data: Buffer) => {
      const out = Buffer.alloc(data.length + 12)
      out.writeUInt32BE(data.length)
      out.write(type, 4)
      data.copy(out, 8)
      out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), data.length + 8)
      return out
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(2)
    header.writeUInt32BE(5, 4)
    header[8] = 8
    header[9] = 2
    const png = Buffer.concat([
      Buffer.from(PNG_SIGNATURE),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(Uint8Array.from(raw))),
      chunk('IEND', Buffer.alloc(0)),
    ])
    const image = await readPngPixels(png)
    expect(Array.from(image.pixels)).toEqual(rows.flat())
  })
})
