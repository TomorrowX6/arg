import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../public/assets/evidence/', import.meta.url))
await mkdir(out, { recursive: true })
const alphabet = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
}
const width = 480,
  height = 300
function scene(variant) {
  const pixels = new Uint8Array(width * height * 3)
  const put = (x, y, c) => {
    if (x >= 0 && x < width && y >= 0 && y < height) pixels.set(c, (y * width + x) * 3)
  }
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c)
  }
  const text = (value, x, y, scale, c) => {
    for (const [n, char] of [...value].entries())
      for (const [row, line] of (alphabet[char] ?? []).entries())
        for (const [col, bit] of [...line].entries())
          if (bit === '1') rect(x + n * 6 * scale + col * scale, y + row * scale, scale, scale, c)
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const grain = (x * 13 + y * 17 + x * y * 7) % 5
      put(
        x,
        y,
        y < 175
          ? [37 + grain + Math.floor(y / 15), 62 + grain, 66 + grain]
          : [37 + grain, 66 + grain, 68 + grain + Math.floor(y / 25)],
      )
    }
  for (let i = 0; i < 12; i++) {
    const x = i * 43 - 7,
      top = 97 + ((i * 31) % 50)
    rect(x, top, 29, 175 - top, [31, 49, 47])
    for (let y = top + 9; y < 167; y += 13)
      for (let dx = 6; dx < 25; dx += 10)
        if ((i + y + dx) % 3) rect(x + dx, y, 4, 5, [142, 143, 95])
  }
  rect(364, 66, 11, 109, [158, 152, 112])
  rect(360, 59, 19, 11, [221, 190, 129])
  rect(362, 54, 15, 5, [51, 68, 52])
  for (let y = 181; y < 280; y += 9)
    for (let x = 12 + ((y * 17) % 71); x < 470; x += 61)
      rect(x, y, 11 + ((x * y) % 19), 1, [83, 108, 102])
  rect(0, 267, 480, 33, [29, 46, 42])
  rect(0, 256, 185, 11, [75, 79, 58])
  rect(20, 218, 6, 52, [46, 58, 45])
  rect(145, 219, 6, 50, [46, 58, 45])
  rect(20, 223, 131, 3, [98, 101, 75])
  rect(228, 208, 111, 12, [146, 105, 69])
  rect(238, 197, 88, 11, [190, 168, 120])
  rect(248, 181, 49, 16, [144, 151, 129])
  rect(256, 185, 11, 9, [224, 195, 128])
  rect(276, 185, 11, 9, [224, 195, 128])
  rect(15, 14, 450, 1, [142, 156, 132])
  text('WUGANG - 1999', 27, 24, 1, [185, 191, 160])
  text('RUAN QING', 364, 278, 1, [166, 177, 149])
  if (variant === 'pier') {
    rect(31, 83, 152, 55, [194, 179, 128])
    rect(35, 87, 144, 47, [41, 64, 55])
    rect(49, 138, 6, 80, [100, 105, 78])
    rect(164, 138, 6, 80, [100, 105, 78])
    text('PIER 04', 44, 103, 3, [224, 214, 163])
  } else if (variant === 'frame') {
    rect(29, 43, 178, 142, [169, 150, 105])
    rect(38, 52, 160, 124, [44, 64, 57])
    rect(101, 113, 39, 45, [103, 120, 99])
    rect(108, 79, 25, 31, [183, 159, 116])
    rect(104, 76, 33, 11, [56, 66, 53])
    text('THE LAST PRINT', 52, 159, 1, [202, 199, 157])
  } else {
    for (let x = 70; x < 155; x++)
      for (let y = 66; y < 135; y++)
        if ((x - 112) ** 2 + (y - 101) ** 2 < 29 ** 2) put(x, y, [184, 184, 140])
    text('BEFORE THE DAWN', 31, 48, 1, [193, 198, 158])
  }
  return pixels
}
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]),
    result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  payload.copy(result, 4)
  result.writeUInt32BE(crc32(payload), data.length + 8)
  return result
}
function png(pixels, metadata = {}) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  const scanlines = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y++)
    scanlines.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    ...Object.entries(metadata).map(([key, value]) =>
      chunk('tEXt', Buffer.from(`${key}\0${value}`, 'latin1')),
    ),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const broken = png(scene('pier'), { Author: 'RUAN QING', Date: '1999-11-17' })
broken.fill(0, 0, 4)
await writeFile(`${out}/pier-04.png`, broken)
await writeFile(
  `${out}/last-print.png`,
  png(scene('frame'), {
    Photographer: 'RUAN QING',
    Created: '1999-11-17T23:10:00+08:00',
    Comment: Buffer.from('BLUE 0').toString('base64'),
    Camera: 'WG-COMPACT-01',
  }),
)
const hidden = scene('sea'),
  bits = [...Buffer.from('FERRY AT SIX\0')].flatMap((byte) =>
    [...byte.toString(2).padStart(8, '0')].map(Number),
  )
for (let i = 0; i < bits.length; i++) hidden[i * 3 + 2] = (hidden[i * 3 + 2] & 254) | bits[i]
await writeFile(
  `${out}/before-dawn.png`,
  png(hidden, {
    Photographer: 'RUAN QING',
    Reading: 'Top left, row by row. Most significant bit first in each group of eight.',
    Pixels: '104',
  }),
)
console.log('Evidence generated: 3 original PNG case files.')
