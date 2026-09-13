import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const folder = fileURLToPath(new URL('../public/assets/evidence/', import.meta.url))
await mkdir(folder, { recursive: true })
const be16 = (value) => {
  const out = Buffer.alloc(2)
  out.writeUInt16BE(value)
  return out
}
const be32 = (value) => {
  const out = Buffer.alloc(4)
  out.writeUInt32BE(value)
  return out
}
const ip = (address) => Buffer.from(address.split('.').map(Number))
function checksum(bytes) {
  let sum = 0
  for (let index = 0; index < bytes.length; index += 2)
    sum += (bytes[index] << 8) + (bytes[index + 1] ?? 0)
  while (sum >>> 16) sum = (sum & 65535) + (sum >>> 16)
  return ~sum & 65535
}
let packetId = 0
function ethernetIpv4(source, destination, protocol, payload) {
  const header = Buffer.alloc(20)
  header[0] = 0x45
  header.writeUInt16BE(20 + payload.length, 2)
  header.writeUInt16BE(++packetId, 4)
  header.writeUInt16BE(0x4000, 6)
  header[8] = 64
  header[9] = protocol
  ip(source).copy(header, 12)
  ip(destination).copy(header, 16)
  header.writeUInt16BE(checksum(header), 10)
  const ethernet = Buffer.from('0217000000170217000000140800', 'hex')
  return Buffer.concat([ethernet, header, payload])
}
function udp(source, destination, sourcePort, destinationPort, payload) {
  return ethernetIpv4(
    source,
    destination,
    17,
    Buffer.concat([
      be16(sourcePort),
      be16(destinationPort),
      be16(8 + payload.length),
      be16(0),
      payload,
    ]),
  )
}
function dnsName(name) {
  return Buffer.concat([
    ...name
      .split('.')
      .flatMap((label) => [Buffer.from([label.length]), Buffer.from(label, 'ascii')]),
    Buffer.from([0]),
  ])
}
function dnsQuery(id, name, type = 16) {
  return Buffer.concat([
    be16(id),
    be16(0x0100),
    be16(1),
    be16(0),
    be16(0),
    be16(0),
    dnsName(name),
    be16(type),
    be16(1),
  ])
}
function dnsReply(id, name, text) {
  const body = Buffer.from(text, 'ascii')
  return Buffer.concat([
    be16(id),
    be16(0x8180),
    be16(1),
    be16(1),
    be16(0),
    be16(0),
    dnsName(name),
    be16(16),
    be16(1),
    Buffer.from([0xc0, 0x0c]),
    be16(16),
    be16(1),
    be32(60),
    be16(body.length + 1),
    Buffer.from([body.length]),
    body,
  ])
}
function pcap(frames) {
  const header = Buffer.alloc(24)
  header.writeUInt32LE(0xa1b2c3d4)
  header.writeUInt16LE(2, 4)
  header.writeUInt16LE(4, 6)
  header.writeUInt32LE(65535, 16)
  header.writeUInt32LE(1, 20)
  const seconds = Math.floor(Date.parse('1999-11-17T15:17:00Z') / 1000)
  return Buffer.concat([
    header,
    ...frames.flatMap((frame, index) => {
      const record = Buffer.alloc(16),
        micros = index * 75000
      record.writeUInt32LE(seconds + Math.floor(micros / 1e6))
      record.writeUInt32LE(micros % 1e6, 4)
      record.writeUInt32LE(frame.length, 8)
      record.writeUInt32LE(frame.length, 12)
      return [record, frame]
    }),
  ])
}
const dnsFrames = []
for (const [index, name] of [
  'weather.wugang.invalid',
  '03.303137.drop.wugang.invalid',
  '01.424F.drop.wugang.invalid',
  '02.5820.drop.wugang.invalid',
  '02.5820.drop.wugang.invalid',
  'clock.wugang.invalid',
].entries()) {
  const id = 0x1700 + index
  dnsFrames.push(udp('192.0.2.14', '198.51.100.53', 43017, 53, dnsQuery(id, name)))
  dnsFrames.push(
    udp(
      '198.51.100.53',
      '192.0.2.14',
      53,
      43017,
      dnsReply(id, name, name.includes('.drop.') ? 'FRAGMENT ACCEPTED' : 'NO CHANGE'),
    ),
  )
}
await writeFile(`${folder}/post-office-dns.pcap`, pcap(dnsFrames))

function tcp(
  source,
  destination,
  sourcePort,
  destinationPort,
  sequence,
  acknowledgment,
  flags,
  payload = Buffer.alloc(0),
) {
  const header = Buffer.alloc(20)
  header.writeUInt16BE(sourcePort)
  header.writeUInt16BE(destinationPort, 2)
  header.writeUInt32BE(sequence, 4)
  header.writeUInt32BE(acknowledgment, 8)
  header[12] = 0x50
  header[13] = flags
  header.writeUInt16BE(4096, 14)
  const pseudo = Buffer.concat([
    ip(source),
    ip(destination),
    Buffer.from([0, 6]),
    be16(header.length + payload.length),
    header,
    payload,
  ])
  header.writeUInt16BE(checksum(pseudo), 16)
  return ethernetIpv4(source, destination, 6, Buffer.concat([header, payload]))
}
function tcpCapture(body, { gzip = false, path = '/box/017' } = {}) {
  const client = '192.0.2.14',
    server = '198.51.100.17',
    port = 43017
  const request = Buffer.from(
    `GET ${path} HTTP/1.1\r\nHost: post.wugang.invalid\r\nConnection: close\r\n\r\n`,
  )
  const content = gzip
    ? gzipSync(Buffer.from(body, 'utf8'), { level: 9, mtime: 0 })
    : Buffer.from(body, 'utf8')
  const response = Buffer.concat([
    Buffer.from(
      `HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${content.length}\r\n${gzip ? 'Content-Encoding: gzip\r\n' : ''}X-Archive-Box: 017\r\nConnection: close\r\n\r\n`,
    ),
    content,
  ])
  const frames = [
    tcp(client, server, port, 80, 1000, 0, 2),
    tcp(server, client, 80, port, 7000, 1001, 18),
    tcp(client, server, port, 80, 1001, 7001, 16),
    tcp(client, server, port, 80, 1001, 7001, 24, request),
  ]
  const segments = []
  for (let offset = 0; offset < response.length; offset += 58)
    segments.push({ offset, data: response.subarray(offset, offset + 58) })
  const order = [2, 0, 1, 1, ...segments.map((_, index) => index).filter((index) => index > 2)]
  for (const index of order)
    if (segments[index])
      frames.push(
        tcp(
          server,
          client,
          80,
          port,
          7001 + segments[index].offset,
          1001 + request.length,
          24,
          segments[index].data,
        ),
      )
  frames.push(tcp(server, client, 80, port, 7001 + response.length, 1001 + request.length, 17))
  frames.push(tcp(client, server, port, 80, 1001 + request.length, 7002 + response.length, 16))
  return pcap(frames)
}
await writeFile(
  `${folder}/letter-stream.pcap`,
  tcpCapture(
    'BOX: 017\nFROM: LARK\nTO: THE NEXT ARCHIVIST\nSTATUS: STILL HERE\nENCLOSURES: letter-017.txt, station-stereo.wav\nNOTE: NOT EVERY SPACE IS EMPTY.\n',
  ),
)
await writeFile(
  `${folder}/receipt-stream.pcap`,
  tcpCapture(
    '签收回执 / BOX 017\nREAD: ALLOWED\nPUBLISH: ASK FIRST\nDELIVER: WHEN READY\n校验词：AFTER THE RAIN\n',
    { gzip: true, path: '/receipt/017' },
  ),
)

const cover =
  '给下一个替我开窗的人\n\n如果你读到这封信，邮局门口的树应该已经抽芽。请不要替我擦去地址上的雨点。有人曾在窗边等过一阵子，后来学会把等待写进信里。信纸上最轻的东西，也许才是下一站。\n\n林雀，留于第十七只信箱。\n'
const secret = [...Buffer.from('WINDOW SEVEN')]
  .map((byte) => byte.toString(2).padStart(8, '0'))
  .join('')
  .replaceAll('0', '\u200b')
  .replaceAll('1', '\u200c')
const letter = [...cover]
  .map((char, index) => char + secret.slice(index * 2, index * 2 + 2))
  .join('')
if ([...cover].length * 2 < secret.length) throw new Error('Cover letter is too short.')
await writeFile(`${folder}/letter-017.txt`, letter, 'utf8')

const glyphs = {
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
}
const rows = Array.from({ length: 7 }, (_, row) =>
  [...'OPEN'].map((letter) => glyphs[letter][row]).join('0'),
)
const sampleRate = 8000,
  cellSamples = 1280,
  sampleCount = rows[0].length * cellSamples
const samples = Buffer.alloc(sampleCount * 4)
for (let index = 0; index < sampleCount; index++) {
  const time = index / sampleRate,
    column = Math.floor(index / cellSamples),
    position = index % cellSamples
  const envelope = Math.min(1, position / 64, (cellSamples - 1 - position) / 64)
  let common = 0.045 * Math.sin(2 * Math.PI * 250 * time),
    difference = 0
  for (let row = 0; row < 7; row++) {
    const frequency = ((96 - row * 8) * sampleRate) / 512
    common += 0.028 * Math.sin(2 * Math.PI * frequency * time)
    if (rows[row][column] === '1')
      difference += 0.046 * envelope * Math.sin(2 * Math.PI * frequency * time)
  }
  samples.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, common + difference)) * 32767),
    index * 4,
  )
  samples.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, common - difference)) * 32767),
    index * 4 + 2,
  )
}
function riffChunk(name, data) {
  const size = Buffer.alloc(4)
  size.writeUInt32LE(data.length)
  return Buffer.concat([
    Buffer.from(name),
    size,
    data,
    ...(data.length % 2 ? [Buffer.from([0])] : []),
  ])
}
const fmt = Buffer.alloc(16)
fmt.writeUInt16LE(1)
fmt.writeUInt16LE(2, 2)
fmt.writeUInt32LE(sampleRate, 4)
fmt.writeUInt32LE(sampleRate * 4, 8)
fmt.writeUInt16LE(4, 12)
fmt.writeUInt16LE(16, 14)
const info = Buffer.concat([
  Buffer.from('INFO'),
  riffChunk('IART', Buffer.from('Echo Archive / Window 7\0')),
  riffChunk('ICMT', Buffer.from('Listen to the difference. 750-1500 Hz. 160 ms per column.\0')),
])
const waveBody = Buffer.concat([
  Buffer.from('WAVE'),
  riffChunk('fmt ', fmt),
  riffChunk('LIST', info),
  riffChunk('data', samples),
])
const riffSize = Buffer.alloc(4)
riffSize.writeUInt32LE(waveBody.length)
await writeFile(
  `${folder}/station-stereo.wav`,
  Buffer.concat([Buffer.from('RIFF'), riffSize, waveBody]),
)
console.log('Transmission evidence generated: 3 PCAP files, a UTF-8 letter and a stereo WAV.')
