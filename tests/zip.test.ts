import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  extractZipEntry,
  MAX_ZIP_BYTES,
  MAX_ZIP_MEMBER_BYTES,
  parseZip,
  repairZipEncryptionFlag,
  zipDownloadName,
} from '../src/game/zip'
import { crc32 } from '../src/game/forensics'

const bytes = (name: string) => new Uint8Array(readFileSync(`public/assets/evidence/${name}`))
const file = (name: string) => parseZip(bytes(name))
const decode = (data: Uint8Array) => new TextDecoder().decode(data)
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

// Independent ZIP fixture, including deliberately misleading size declarations.
function singleMember(payload: Uint8Array, declaredSize = payload.length) {
  const packed = deflateRawSync(payload)
  const local = Buffer.alloc(31)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(crc32(payload), 14)
  local.writeUInt32LE(packed.length, 18)
  local.writeUInt32LE(declaredSize, 22)
  local.writeUInt16LE(1, 26)
  local[30] = 0xe1 // CP437 ß
  const central = Buffer.alloc(47)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(crc32(payload), 16)
  central.writeUInt32LE(packed.length, 20)
  central.writeUInt32LE(declaredSize, 24)
  central.writeUInt16LE(1, 28)
  central[46] = 0xe1
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(local.length + packed.length, 16)
  return new Uint8Array(Buffer.concat([local, packed, central, end]))
}

describe('the press archive uses real ZIP bytes', () => {
  it('reads archive comments, directory records and UTF-8 filenames', async () => {
    const archive = file('editor-envelope.zip')
    expect(archive.comment).toContain('PASSWORD_HEX=70 72 6F 6F 66')
    expect(archive.entries.map((entry) => entry.name)).toEqual([
      '00-readme.txt',
      'composing-room.txt',
      'type/',
      'type/inventory.txt',
    ])
    expect(archive.entries[2].directory).toBe(true)
    expect(decode(await extractZipEntry(archive, archive.entries[0]))).toContain('批注')
    expect(file('approved-edition.zip').entries.map((entry) => entry.name)).toContain('版面-乙.txt')
    expect(parseZip(singleMember(new Uint8Array([65]))).entries[0].name).toBe('ß')
  })

  it('decrypts descriptor and CRC-based ZipCrypto, including a UTF-8 password', async () => {
    for (const [name, member, password, clue, descriptor] of [
      ['locked-proof.zip', 'proof.txt', 'proof', 'DESK=LINE SEVEN', true],
      [
        'morning-editorial.zip',
        'editorial.txt',
        'proof-lineseven-4-west-乙',
        '允许更正拒绝抹去',
        false,
      ],
    ] as const) {
      const archive = file(name)
      const entry = archive.entries.find((item) => item.name === member)!
      expect(Boolean(entry.flags & 8)).toBe(descriptor)
      expect(entry.encrypted).toBe(true)
      await expect(extractZipEntry(archive, entry)).rejects.toThrow('密码')
      await expect(extractZipEntry(archive, entry, { password: 'WRONG' })).rejects.toThrow('密码')
      expect(decode(await extractZipEntry(archive, entry, { password }))).toContain(clue)
      await expect(repairZipEncryptionFlag(archive, entry)).rejects.toThrow()
    }
  })

  it('repairs both false encryption flags only after verifying unchanged payload bytes', async () => {
    const archive = file('flagged-proof.zip')
    const entry = archive.entries[0]
    const original = new Uint8Array(archive.bytes)
    await expect(extractZipEntry(archive, entry, { password: 'proof' })).rejects.toThrow()
    const content = await extractZipEntry(archive, entry, { ignoreEncryption: true })
    expect(decode(content)).toContain('CORRECTION=PAGE 4')
    const repairedBytes = await repairZipEncryptionFlag(archive, entry)
    const changed = [...repairedBytes.keys()].filter((i) => repairedBytes[i] !== original[i])
    expect(changed).toEqual([entry.localOffset + 6, entry.centralOffset + 8])
    expect(archive.bytes).toEqual(original)
    const repaired = parseZip(repairedBytes)
    expect(repaired.entries[0].flags & 1).toBe(0)
    expect(repaired.entries[0].localFlags & 1).toBe(0)
    expect(await extractZipEntry(repaired, repaired.entries[0])).toEqual(content)
  })

  it('recognizes an archive behind its prefix and reads its nested current edition', async () => {
    const archive = file('old-press.dat')
    expect(archive.prefixLength).toBe(60)
    const nested = parseZip(
      await extractZipEntry(
        archive,
        archive.entries.find((entry) => entry.name === 'envelope/layout.bin')!,
      ),
    )
    const current = nested.entries.find((entry) => entry.name === 'plate-current.txt')!
    const withdrawn = nested.entries.find((entry) => entry.name === 'plate-withdrawn.txt')!
    expect(decode(await extractZipEntry(nested, current))).toContain('DELIVERY=WEST WINDOW')
    expect(decode(await extractZipEntry(nested, withdrawn))).toContain('STATUS=WITHDRAWN')
  })

  it('selects the actual approved bytes even when the two texts look the same', async () => {
    const archive = file('approved-edition.zip')
    const read = (name: string) =>
      extractZipEntry(
        archive,
        archive.entries.find((entry) => entry.name === name)!,
      )
    const fingerprint = decode(await read('fingerprint.txt')).match(/[a-f0-9]{64}/)![0]
    const a = await read('版面-甲.txt'),
      b = await read('版面-乙.txt')
    expect(sha256(b)).toBe(fingerprint)
    expect(sha256(a)).not.toBe(fingerprint)
    expect(a.length - b.length).toBe(3)
    expect(decode(a).replace('\u2060', '')).toBe(decode(b))
  })

  it('rejects corrupt data, foreign entries, truncated records and invalid directory bounds', async () => {
    const archive = file('editor-envelope.zip')
    await expect(extractZipEntry(archive, file('flagged-proof.zip').entries[0])).rejects.toThrow(
      '不属于',
    )
    const corrupt = bytes('flagged-proof.zip')
    const target = parseZip(corrupt)
    corrupt[target.entries[0].dataOffset] ^= 1
    await expect(
      extractZipEntry(target, target.entries[0], { ignoreEncryption: true }),
    ).rejects.toThrow('CRC-32')
    await expect(repairZipEncryptionFlag(target, target.entries[0])).rejects.toThrow('CRC-32')
    expect(() => parseZip(archive.bytes.subarray(0, -1))).toThrow('截断')
    const invalid = singleMember(new Uint8Array([1, 2, 3]))
    new DataView(invalid.buffer).setUint32(invalid.length - 10, invalid.length * 2, true)
    expect(() => parseZip(invalid)).toThrow('目录')
  })

  it('enforces actual decompression limits even when the declared size is small', async () => {
    expect(() => parseZip(new Uint8Array(MAX_ZIP_BYTES + 1))).toThrow('8 MB')
    const inflated = new Uint8Array(MAX_ZIP_MEMBER_BYTES + 1)
    const archive = parseZip(singleMember(inflated, 1))
    await expect(extractZipEntry(archive, archive.entries[0])).rejects.toThrow('5 MB')
    const declared = parseZip(singleMember(new Uint8Array([65]), MAX_ZIP_MEMBER_BYTES + 1))
    await expect(extractZipEntry(declared, declared.entries[0])).rejects.toThrow('5 MB')
    expect(zipDownloadName('../../证据.txt')).toBe('证据.txt')
    expect(zipDownloadName('C:\\archive\\a\u0000b.txt')).toBe('a_b.txt')
    expect(zipDownloadName('directory/')).toBe('archive-entry.bin')
  })
})
