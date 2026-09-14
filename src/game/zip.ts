import { crc32 } from './forensics.ts'

export const MAX_ZIP_BYTES = 8 * 1024 * 1024
export const MAX_ZIP_MEMBER_BYTES = 5 * 1024 * 1024
export interface ZipEntry {
  index: number
  name: string
  comment: string
  flags: number
  localFlags: number
  method: number
  crc: number
  size: number
  compressedSize: number
  localOffset: number
  centralOffset: number
  dataOffset: number
  dosTime: number
  modified: string
  encrypted: boolean
  directory: boolean
}
export interface ZipArchive {
  bytes: Uint8Array
  entries: ZipEntry[]
  comment: string
  prefixLength: number
  centralOffset: number
  centralSize: number
}

const cp437 = [
  ...'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ',
]
function legacyText(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => (byte < 128 ? String.fromCharCode(byte) : cp437[byte - 128]))
    .join('')
}
function text(bytes: Uint8Array, utf8 = true): string {
  if (utf8) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      /* Old ZIP comments have no encoding bit. */
    }
  }
  return legacyText(bytes)
}
function dateTime(date: number, time: number): string {
  const year = 1980 + (date >>> 9),
    month = (date >>> 5) & 15,
    day = date & 31
  const hour = time >>> 11,
    minute = (time >>> 5) & 63,
    second = (time & 31) * 2
  if (!month || month > 12 || !day || day > 31 || hour > 23 || minute > 59 || second > 59)
    return '未记录'
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}
function unicodeFilename(raw: Uint8Array, extra: Uint8Array, fallback: string): string {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength)
  for (let offset = 0; offset + 4 <= extra.length;) {
    const kind = view.getUint16(offset, true),
      length = view.getUint16(offset + 2, true)
    if (offset + 4 + length > extra.length) break
    if (
      kind === 0x7075 &&
      length >= 5 &&
      extra[offset + 4] === 1 &&
      view.getUint32(offset + 5, true) === crc32(raw)
    )
      return text(extra.subarray(offset + 9, offset + 4 + length))
    offset += 4 + length
  }
  return fallback
}

export function parseZip(bytes: Uint8Array): ZipArchive {
  if (bytes.length > MAX_ZIP_BYTES) throw new Error('压缩包超过 8 MB，检验台无法读取。')
  if (bytes.length < 22) throw new Error('文件太短，没有完整的 ZIP 目录。')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length
    ) {
      end = offset
      break
    }
  }
  if (end < 0) throw new Error('没有找到完整的 ZIP 结束目录，文件可能并非压缩包或已被截断。')
  const count = view.getUint16(end + 10, true)
  const size = view.getUint32(end + 12, true)
  const declaredOffset = view.getUint32(end + 16, true)
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count
  )
    throw new Error('当前检验台不读取跨卷压缩包。')
  if (count === 0xffff || size === 0xffffffff || declaredOffset === 0xffffffff)
    throw new Error('当前检验台不读取 ZIP64 压缩包。')
  if (count > 256) throw new Error('目录包含超过 256 个条目，请使用更小的物证。')
  let centralOffset = declaredOffset
  if (count && (centralOffset + 4 > end || view.getUint32(centralOffset, true) !== 0x02014b50))
    centralOffset = end - size
  const adjustment = centralOffset - declaredOffset
  if (
    centralOffset < 0 ||
    centralOffset + size !== end ||
    (count && view.getUint32(centralOffset, true) !== 0x02014b50)
  )
    throw new Error('ZIP 中央目录的位置或长度无效。')
  const entries: ZipEntry[] = []
  let cursor = centralOffset
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error('ZIP 条目目录不完整。')
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true)
    const dosTime = view.getUint16(cursor + 12, true),
      dosDate = view.getUint16(cursor + 14, true)
    const crc = view.getUint32(cursor + 16, true),
      compressedSize = view.getUint32(cursor + 20, true),
      uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true),
      extraLength = view.getUint16(cursor + 30, true),
      commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true) + adjustment
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (
      view.getUint16(cursor + 34, true) ||
      next > end ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff
    )
      throw new Error('条目使用了不支持的扩展目录或长度。')
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    const extra = bytes.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength)
    const name = unicodeFilename(rawName, extra, text(rawName, Boolean(flags & 0x800)))
    if (
      localOffset < 0 ||
      localOffset + 30 > centralOffset ||
      view.getUint32(localOffset, true) !== 0x04034b50
    )
      throw new Error('条目的本地文件头不存在或位置无效。')
    const localFlags = view.getUint16(localOffset + 6, true)
    if (view.getUint16(localOffset + 8, true) !== method)
      throw new Error('本地文件头与中央目录的压缩方法不一致。')
    const dataOffset =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true)
    if (dataOffset > centralOffset || compressedSize > centralOffset - dataOffset)
      throw new Error('条目载荷超过压缩包边界。')
    entries.push({
      index,
      name,
      flags,
      localFlags,
      method,
      crc,
      size: uncompressedSize,
      compressedSize,
      localOffset,
      centralOffset: cursor,
      dataOffset,
      dosTime,
      modified: dateTime(dosDate, dosTime),
      encrypted: Boolean(flags & 1),
      directory: name.endsWith('/'),
      comment: text(
        bytes.subarray(cursor + 46 + nameLength + extraLength, next),
        Boolean(flags & 0x800),
      ),
    })
    cursor = next
  }
  if (cursor !== centralOffset + size) throw new Error('中央目录含有未识别的额外记录。')
  return {
    bytes,
    entries,
    centralOffset,
    centralSize: size,
    prefixLength: entries.length
      ? Math.min(...entries.map((entry) => entry.localOffset))
      : centralOffset,
    comment: text(bytes.subarray(end + 22)),
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  return value >>> 0
})
function zipCrypto(bytes: Uint8Array, password: string): Uint8Array {
  let key0 = 0x12345678,
    key1 = 0x23456789,
    key2 = 0x34567890
  const crcByte = (key: number, byte: number) => ((key >>> 8) ^ crcTable[(key ^ byte) & 255]) >>> 0
  function update(byte: number) {
    key0 = crcByte(key0, byte)
    key1 = (Math.imul((key1 + (key0 & 255)) >>> 0, 134775813) + 1) >>> 0
    key2 = crcByte(key2, key1 >>> 24)
  }
  for (const byte of new TextEncoder().encode(password)) update(byte)
  const decoded = new Uint8Array(bytes.length)
  bytes.forEach((byte, index) => {
    const temp = (key2 & 0xffff) | 2
    const plain = byte ^ ((Math.imul(temp, temp ^ 1) >>> 8) & 255)
    decoded[index] = plain
    update(plain)
  })
  return decoded
}
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > MAX_ZIP_MEMBER_BYTES) throw new Error('条目解压后超过 5 MB，已停止读取。')
      parts.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

export async function extractZipEntry(
  archive: ZipArchive,
  entry: ZipEntry,
  options: { password?: string; ignoreEncryption?: boolean } = {},
): Promise<Uint8Array> {
  if (archive.entries[entry.index] !== entry) throw new Error('条目不属于当前压缩包。')
  if (entry.size > MAX_ZIP_MEMBER_BYTES || entry.compressedSize > MAX_ZIP_MEMBER_BYTES)
    throw new Error('条目超过 5 MB，检验台无法展开。')
  if (entry.method !== 0 && entry.method !== 8)
    throw new Error('当前检验台支持存储与 DEFLATE 压缩。')
  if (entry.flags & 0x40) throw new Error('当前检验台支持传统 ZipCrypto，不支持强加密 ZIP。')
  let payload: Uint8Array = archive.bytes.slice(
    entry.dataOffset,
    entry.dataOffset + entry.compressedSize,
  )
  const encrypted = entry.encrypted && !options.ignoreEncryption
  if (encrypted) {
    if (options.password === undefined) throw new Error('请先填写这个条目的提取密码。')
    if (payload.length < 12) throw new Error('加密标记已设置，但载荷不足以容纳加密头。')
    payload = zipCrypto(payload, options.password!)
    const check = entry.flags & 8 ? entry.dosTime >>> 8 : entry.crc >>> 24
    if (payload[11] !== check) throw new Error('提取密码不正确，或这个加密标记与载荷不符。')
    payload = payload.slice(12)
  }
  let result: Uint8Array
  try {
    result = entry.method === 8 ? await inflate(payload) : payload
  } catch (error) {
    if (error instanceof Error && error.message.includes('5 MB')) throw error
    throw new Error(
      encrypted ? '密码或压缩载荷不正确，无法完成解压。' : '载荷不是有效的 DEFLATE 数据。',
    )
  }
  if (result.length !== entry.size || crc32(result) !== entry.crc)
    throw new Error(
      encrypted
        ? '密码或文件内容不正确，CRC-32 校验未通过。'
        : '条目长度或 CRC-32 不匹配，不能确认读取结果完整。',
    )
  return result
}

export async function repairZipEncryptionFlag(
  archive: ZipArchive,
  entry: ZipEntry,
): Promise<Uint8Array> {
  if (!entry.encrypted) throw new Error('这个条目没有加密标记。')
  await extractZipEntry(archive, entry, { ignoreEncryption: true })
  const result = new Uint8Array(archive.bytes)
  const view = new DataView(result.buffer)
  view.setUint16(entry.centralOffset + 8, entry.flags & ~1, true)
  view.setUint16(entry.localOffset + 6, entry.localFlags & ~1, true)
  return result
}
export function zipDownloadName(name: string): string {
  return [...(name.split(/[\\/]/).at(-1) || 'archive-entry.bin')]
    .map((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127 ? '_' : character
    })
    .join('')
}
