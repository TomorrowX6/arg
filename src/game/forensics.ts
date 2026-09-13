export const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const

export interface PngChunk {
  type: string
  offset: number
  length: number
  data: Uint8Array
  crcValid: boolean
}

export function hasPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function parsePng(bytes: Uint8Array): PngChunk[] {
  if (!hasPngSignature(bytes)) throw new Error('文件签名不符合 PNG 格式。先检查开头的 8 个字节。')
  const chunks: PngChunk[] = []
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset)
    if (offset + 12 + length > bytes.length) throw new Error('数据块不完整，长度超过文件边界。')
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const data = bytes.slice(offset + 8, offset + 8 + length)
    chunks.push({
      type,
      offset,
      length,
      data,
      crcValid:
        crc32(bytes.subarray(offset + 4, offset + 8 + length)) ===
        view.getUint32(offset + 8 + length),
    })
    offset += length + 12
    if (type === 'IEND') break
  }
  if (chunks[0]?.type !== 'IHDR' || chunks.at(-1)?.type !== 'IEND')
    throw new Error('文件缺少完整的图像头或结束块。')
  return chunks
}

export function readTextChunk(data: Uint8Array): { keyword: string; value: string } {
  const split = data.indexOf(0)
  if (split < 1) throw new Error('文本块没有有效的关键词分隔符。')
  const decoder = new TextDecoder('iso-8859-1')
  return {
    keyword: decoder.decode(data.subarray(0, split)),
    value: decoder.decode(data.subarray(split + 1)),
  }
}

export function parseHexBytes(input: string): Uint8Array {
  const clean = input.trim().replace(/\s+/g, '')
  if (!clean || clean.length % 2 || !/^[\da-f]+$/i.test(clean))
    throw new Error('请按两位一组填写十六进制字节，例如 89 50 4E 47。')
  return Uint8Array.from(clean.match(/.{2}/g)!, (pair) => parseInt(pair, 16))
}

export function hexDump(bytes: Uint8Array, limit = 256): string {
  const lines: string[] = []
  for (let offset = 0; offset < Math.min(limit, bytes.length); offset += 16) {
    const row = bytes.subarray(offset, Math.min(offset + 16, limit, bytes.length))
    const hex = Array.from(row, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(
      ' ',
    )
    const ascii = Array.from(row, (byte) =>
      byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·',
    ).join('')
    lines.push(`${offset.toString(16).padStart(6, '0').toUpperCase()}  ${hex.padEnd(47)}  ${ascii}`)
  }
  return lines.join('\n')
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

// The archive uses non-interlaced, 8-bit RGB/RGBA PNGs. Decode scanlines directly
// so colour management and canvas conversion cannot alter the hidden low bits.
export async function readPngPixels(
  bytes: Uint8Array,
): Promise<{ width: number; height: number; pixels: Uint8Array; channels: number }> {
  const chunks = parsePng(bytes)
  if (chunks.some((chunk) => !chunk.crcValid))
    throw new Error('有数据块未通过 CRC 校验，请先恢复文件。')
  const header = chunks[0].data
  if (header.length !== 13) throw new Error('图像头长度无效。')
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const width = view.getUint32(0),
    height = view.getUint32(4)
  const channels = header[9] === 2 ? 3 : header[9] === 6 ? 4 : 0
  if (!channels || header[8] !== 8 || header[10] !== 0 || header[11] !== 0 || header[12] !== 0)
    throw new Error('这台读取器支持未交错的 8 位 RGB / RGBA 图片。')
  if (!width || !height || width * height > 4_000_000) throw new Error('图像尺寸超出读取范围。')
  const idat = chunks.filter((chunk) => chunk.type === 'IDAT')
  const packed = new Uint8Array(idat.reduce((total, chunk) => total + chunk.length, 0))
  let cursor = 0
  for (const chunk of idat) {
    packed.set(chunk.data, cursor)
    cursor += chunk.length
  }
  if (typeof DecompressionStream === 'undefined')
    throw new Error('当前浏览器不支持图像解压。请使用较新的浏览器，或下载文件继续分析。')
  const reader = new Blob([packed])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
    .getReader()
  const stride = width * channels
  const expected = height * (stride + 1)
  const raw = new Uint8Array(expected)
  let filled = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (filled + value.length > expected) throw new Error('解压长度超过图像尺寸。')
      raw.set(value, filled)
      filled += value.length
    }
  } finally {
    await reader.cancel()
  }
  if (filled !== expected) throw new Error('解压后的像素数据不完整。')
  const pixels = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    if (filter > 4) throw new Error('出现未知的 PNG 行过滤器。')
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0
      const up = y ? pixels[(y - 1) * stride + x] : 0
      const corner = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, corner)][filter]
      pixels[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255
    }
  }
  return { width, height, pixels, channels }
}

export function extractPixelBits(
  pixels: Uint8Array,
  channels: number,
  channel: number,
  bit: number,
  count = 256,
): { bits: string; text: string } {
  if (![3, 4].includes(channels) || channel < 0 || channel > 2 || bit < 0 || bit > 7)
    throw new Error('请选择有效的颜色通道和位平面。')
  let bits = ''
  const total = Math.min(Math.floor(pixels.length / channels), count)
  for (let i = 0; i < total; i++) bits += (pixels[i * channels + channel] >> bit) & 1
  let text = ''
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8), 2)
    if (byte === 0) break
    text += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·'
  }
  return { bits: bits.match(/.{1,8}/g)?.join(' ') ?? '', text }
}
