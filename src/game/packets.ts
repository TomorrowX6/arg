export interface DnsQuestion {
  name: string
  type: number
}
export interface DnsAnswer extends DnsQuestion {
  ttl: number
  value: string
}
export interface DnsMessage {
  id: number
  response: boolean
  questions: DnsQuestion[]
  answers: DnsAnswer[]
}
export interface CapturePacket {
  index: number
  time: number
  capturedLength: number
  wireLength: number
  source: string
  destination: string
  sourcePort?: number
  destinationPort?: number
  protocol: 'DNS' | 'TCP' | 'UDP' | 'IPv4' | 'Ethernet'
  info: string
  payload: Uint8Array
  dns?: DnsMessage
  tcp?: { sequence: number; acknowledgment: number; flags: number }
  headerChecksumValid?: boolean
}
export interface PacketCapture {
  packets: CapturePacket[]
  snapLength: number
  nanoseconds: boolean
}
const utf8 = new TextDecoder()
const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
export const dnsTypeName = (type: number) =>
  ({ 1: 'A', 5: 'CNAME', 16: 'TXT', 28: 'AAAA' })[type] ?? `TYPE${type}`

export function internetChecksum(bytes: Uint8Array): number {
  let sum = 0
  for (let index = 0; index < bytes.length; index += 2)
    sum += (bytes[index] << 8) + (bytes[index + 1] ?? 0)
  while (sum >>> 16) sum = (sum & 0xffff) + (sum >>> 16)
  return ~sum & 0xffff
}
export function readDns(bytes: Uint8Array): DnsMessage {
  if (bytes.length < 12) throw new Error('DNS 报文头不完整。')
  const view = viewOf(bytes)
  function nameAt(start: number): { name: string; next: number } {
    const labels: string[] = [],
      visited = new Set<number>()
    let cursor = start,
      next = -1
    while (cursor < bytes.length) {
      if (visited.has(cursor) || visited.size > 255) throw new Error('DNS 名称压缩指针形成回路。')
      visited.add(cursor)
      const length = bytes[cursor]
      if (length === 0) return { name: labels.join('.'), next: next < 0 ? cursor + 1 : next }
      if ((length & 0xc0) === 0xc0) {
        if (cursor + 1 >= bytes.length) throw new Error('DNS 压缩指针不完整。')
        if (next < 0) next = cursor + 2
        cursor = ((length & 0x3f) << 8) | bytes[cursor + 1]
      } else {
        if (length > 63 || cursor + 1 + length > bytes.length) throw new Error('DNS 名称长度无效。')
        labels.push(utf8.decode(bytes.subarray(cursor + 1, cursor + 1 + length)))
        cursor += length + 1
      }
    }
    throw new Error('DNS 名称越过报文边界。')
  }
  const questionCount = view.getUint16(4),
    answerCount = view.getUint16(6)
  if (questionCount > 64 || answerCount > 128) throw new Error('DNS 记录数量超出检验范围。')
  const questions: DnsQuestion[] = [],
    answers: DnsAnswer[] = []
  let cursor = 12
  for (let index = 0; index < questionCount; index++) {
    const name = nameAt(cursor)
    cursor = name.next
    if (cursor + 4 > bytes.length) throw new Error('DNS 问题段不完整。')
    questions.push({ name: name.name, type: view.getUint16(cursor) })
    cursor += 4
  }
  for (let index = 0; index < answerCount; index++) {
    const name = nameAt(cursor)
    cursor = name.next
    if (cursor + 10 > bytes.length) throw new Error('DNS 应答段不完整。')
    const type = view.getUint16(cursor),
      ttl = view.getUint32(cursor + 4),
      length = view.getUint16(cursor + 8)
    cursor += 10
    if (cursor + length > bytes.length) throw new Error('DNS 应答内容不完整。')
    let value = ''
    if (type === 16) {
      let position = cursor
      const parts: string[] = []
      while (position < cursor + length) {
        const size = bytes[position++]
        if (position + size > cursor + length) throw new Error('DNS TXT 字段不完整。')
        parts.push(utf8.decode(bytes.subarray(position, position + size)))
        position += size
      }
      value = parts.join('')
    } else if (type === 1 && length === 4) value = [...bytes.subarray(cursor, cursor + 4)].join('.')
    else if (type === 5) value = nameAt(cursor).name
    else
      value = [...bytes.subarray(cursor, cursor + length)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(' ')
    answers.push({ name: name.name, type, ttl, value })
    cursor += length
  }
  return { id: view.getUint16(0), response: !!(view.getUint16(2) & 0x8000), questions, answers }
}

function readFrame(
  frame: Uint8Array,
  record: Pick<CapturePacket, 'index' | 'time' | 'capturedLength' | 'wireLength'>,
): CapturePacket {
  const packet: CapturePacket = {
    ...record,
    source: '—',
    destination: '—',
    protocol: 'Ethernet',
    info: '未识别的以太网帧',
    payload: frame,
  }
  if (frame.length < 14) return { ...packet, info: '以太网帧被截断' }
  const view = viewOf(frame)
  let offset = 14,
    etherType = view.getUint16(12)
  if (etherType === 0x8100 && frame.length >= 18) {
    offset = 18
    etherType = view.getUint16(16)
  }
  if (etherType !== 0x0800 || frame.length < offset + 20) return packet
  const headerLength = (frame[offset] & 15) * 4,
    totalLength = view.getUint16(offset + 2)
  if (
    frame[offset] >>> 4 !== 4 ||
    headerLength < 20 ||
    totalLength < headerLength ||
    offset + totalLength > frame.length
  )
    return { ...packet, info: 'IPv4 数据不完整' }
  packet.source = [...frame.subarray(offset + 12, offset + 16)].join('.')
  packet.destination = [...frame.subarray(offset + 16, offset + 20)].join('.')
  packet.headerChecksumValid = internetChecksum(frame.subarray(offset, offset + headerLength)) === 0
  packet.protocol = 'IPv4'
  packet.info = `IPv4 协议 ${frame[offset + 9]}`
  const body = frame.subarray(offset + headerLength, offset + totalLength),
    transport = viewOf(body)
  packet.payload = body
  if (view.getUint16(offset + 6) & 0x3fff) return { ...packet, info: 'IPv4 分片' }
  if (frame[offset + 9] === 17 && body.length >= 8) {
    const length = transport.getUint16(4)
    if (length < 8 || length > body.length) return { ...packet, info: 'UDP 数据不完整' }
    packet.sourcePort = transport.getUint16(0)
    packet.destinationPort = transport.getUint16(2)
    packet.protocol = 'UDP'
    packet.payload = body.subarray(8, length)
    packet.info = `${packet.payload.length} 字节数据`
    if (packet.sourcePort === 53 || packet.destinationPort === 53) {
      packet.protocol = 'DNS'
      try {
        packet.dns = readDns(packet.payload)
        packet.info = `${packet.dns.response ? '应答' : '查询'} ${packet.dns.questions.map((question) => `${dnsTypeName(question.type)} ${question.name}`).join(' · ')}`
      } catch (error) {
        packet.info = error instanceof Error ? error.message : 'DNS 数据无法读取'
      }
    }
  }
  if (frame[offset + 9] === 6 && body.length >= 20) {
    const length = (body[12] >>> 4) * 4
    if (length < 20 || length > body.length) return { ...packet, info: 'TCP 数据不完整' }
    packet.sourcePort = transport.getUint16(0)
    packet.destinationPort = transport.getUint16(2)
    packet.protocol = 'TCP'
    packet.payload = body.subarray(length)
    packet.tcp = {
      sequence: transport.getUint32(4),
      acknowledgment: transport.getUint32(8),
      flags: body[13],
    }
    const flags = [
      [2, 'SYN'],
      [16, 'ACK'],
      [8, 'PSH'],
      [1, 'FIN'],
      [4, 'RST'],
    ]
      .filter(([mask]) => body[13] & (mask as number))
      .map(([, name]) => name)
    packet.info = `[${flags.join(', ')}] Seq=${packet.tcp.sequence} · ${packet.payload.length} 字节`
  }
  return packet
}
export function parsePcap(bytes: Uint8Array): PacketCapture {
  if (bytes.length < 24) throw new Error('抓包文件头不完整，需要经典 PCAP 格式。')
  if (bytes.length > 4 * 1024 * 1024) throw new Error('这个检验台支持 4 MB 以内的抓包物证。')
  const view = viewOf(bytes),
    magic = view.getUint32(0)
  const little = magic === 0xd4c3b2a1 || magic === 0x4d3cb2a1
  if (![0xd4c3b2a1, 0xa1b2c3d4, 0x4d3cb2a1, 0xa1b23c4d].includes(magic))
    throw new Error('这不是经典 PCAP 格式。')
  if (view.getUint16(4, little) !== 2 || view.getUint16(6, little) !== 4)
    throw new Error('暂不支持这个 PCAP 版本。')
  if (view.getUint32(20, little) !== 1) throw new Error('这个检验台读取以太网类型的 PCAP。')
  const nanoseconds = magic === 0x4d3cb2a1 || magic === 0xa1b23c4d
  const packets: CapturePacket[] = []
  let cursor = 24
  while (cursor < bytes.length) {
    if (cursor + 16 > bytes.length) throw new Error('抓包记录的头部被截断。')
    const time =
      view.getUint32(cursor, little) +
      view.getUint32(cursor + 4, little) / (nanoseconds ? 1e9 : 1e6)
    const capturedLength = view.getUint32(cursor + 8, little),
      wireLength = view.getUint32(cursor + 12, little)
    cursor += 16
    if (cursor + capturedLength > bytes.length) throw new Error('抓包记录缺少末尾字节。')
    if (packets.length >= 10000) throw new Error('记录数量超出检验范围。')
    packets.push(
      readFrame(bytes.subarray(cursor, cursor + capturedLength), {
        index: packets.length + 1,
        time,
        capturedLength,
        wireLength,
      }),
    )
    cursor += capturedLength
  }
  return { packets, snapLength: view.getUint32(16, little), nanoseconds }
}

export function extractDnsHex(packets: CapturePacket[], suffix: string): string {
  const domain = suffix
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '')
  if (!domain) throw new Error('先填写要提取的域名后缀。')
  const fragments = new Map<number, string>()
  for (const packet of packets) {
    if (!packet.dns || packet.dns.response) continue
    for (const question of packet.dns.questions) {
      if (!question.name.toLowerCase().endsWith(`.${domain}`)) continue
      const prefix = question.name.slice(0, -domain.length - 1).split('.')
      if (prefix.length !== 2 || !/^\d+$/.test(prefix[0])) continue
      const index = Number(prefix[0]),
        content = prefix[1].toUpperCase()
      if (
        !Number.isSafeInteger(index) ||
        index < 1 ||
        index > 10000 ||
        !/^(?:[0-9A-F]{2})+$/.test(content)
      )
        throw new Error('编号片段需要从 1 开始，内容必须是成对的十六进制数字。')
      if (fragments.has(index) && fragments.get(index) !== content)
        throw new Error(`第 ${index} 片段出现了相互矛盾的内容。`)
      fragments.set(index, content)
    }
  }
  if (!fragments.size) throw new Error('没有找到这个后缀下的编号片段。再核对一下域名。')
  const ordered = [...fragments].sort((a, b) => a[0] - b[0])
  for (let i = 0; i < ordered.length; i++)
    if (ordered[i][0] !== i + 1) throw new Error(`缺少第 ${i + 1} 片段，暂不能拼成完整内容。`)
  return ordered
    .map(([, value]) => value)
    .join('')
    .match(/.{2}/g)!
    .join(' ')
}
export const tcpStreamId = (packet: CapturePacket) =>
  `${packet.source}:${packet.sourcePort} → ${packet.destination}:${packet.destinationPort}`
export function tcpStreams(packets: CapturePacket[]): string[] {
  return [
    ...new Set(packets.filter((packet) => packet.tcp && packet.payload.length).map(tcpStreamId)),
  ]
}
export function reassembleTcp(
  packets: CapturePacket[],
  stream: string,
): { bytes: Uint8Array; retransmissions: number; segments: number; firstSequence: number } {
  const flow = packets.filter((packet) => packet.tcp && tcpStreamId(packet) === stream)
  const dataSequence = (packet: CapturePacket) =>
    (packet.tcp!.sequence + (packet.tcp!.flags & 2 ? 1 : 0)) >>> 0
  const segments = flow
    .filter((packet) => packet.payload.length)
    .sort((a, b) => dataSequence(a) - dataSequence(b))
  if (!segments.length) throw new Error('这条数据流没有可重组的正文。')
  const opening = flow.find((packet) => packet.tcp!.flags & 2)
  const firstSequence = opening ? dataSequence(opening) : dataSequence(segments[0])
  const length = Math.max(
    ...segments.map((packet) => dataSequence(packet) - firstSequence + packet.payload.length),
    ...flow
      .filter((packet) => packet.tcp!.flags & 1)
      .map((packet) => dataSequence(packet) - firstSequence + packet.payload.length),
  )
  if (
    length < 0 ||
    length > 2 * 1024 * 1024 ||
    segments.some((packet) => dataSequence(packet) < firstSequence)
  )
    throw new Error('序列号跨度过大或发生回绕，无法在这个检验台重组。')
  const bytes = new Uint8Array(length),
    written = new Uint8Array(length)
  let retransmissions = 0
  for (const packet of segments) {
    const offset = dataSequence(packet) - firstSequence
    let repeated = true
    packet.payload.forEach((byte, index) => {
      const position = offset + index
      if (written[position] && bytes[position] !== byte)
        throw new Error('重叠片段给出了不同内容，不能把它们当成同一份原文。')
      if (!written[position]) repeated = false
      bytes[position] = byte
      written[position] = 1
    })
    if (repeated) retransmissions++
  }
  if (written.some((value) => value === 0))
    throw new Error('数据流仍缺少一段字节，不能把缺口当作空白。')
  return { bytes, retransmissions, segments: segments.length, firstSequence }
}
export function readHttp(bytes: Uint8Array): {
  status: string
  headers: Record<string, string>
  body: Uint8Array
} {
  let end = -1
  for (let i = 0; i + 3 < bytes.length; i++)
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) {
      end = i
      break
    }
  if (end < 0) throw new Error('这段数据没有完整的 HTTP 头部。')
  const [status, ...lines] = utf8.decode(bytes.subarray(0, end)).split('\r\n')
  const headers = Object.fromEntries(
    lines.flatMap((line) => {
      const colon = line.indexOf(':')
      return colon > 0
        ? [[line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()]]
        : []
    }),
  )
  const body = bytes.subarray(end + 4)
  if (headers['content-length'] && Number(headers['content-length']) !== body.length)
    throw new Error('响应正文长度与 Content-Length 不一致。')
  return { status, headers, body }
}
export async function decodeHttpBody(bytes: Uint8Array): Promise<string> {
  const message = readHttp(bytes)
  let body = message.body
  if (message.headers['content-encoding']?.toLowerCase() === 'gzip') {
    const stream = new Blob([new Uint8Array(body)])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
    const reader = stream.getReader(),
      chunks: Uint8Array[] = []
    let total = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        total += value.length
        if (total > 2 * 1024 * 1024) {
          await reader.cancel()
          throw new Error('解压后的正文超出 2 MB。')
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    body = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.length
    }
  } else if (
    message.headers['content-encoding'] &&
    message.headers['content-encoding'] !== 'identity'
  )
    throw new Error('这份正文不是当前支持的 gzip 编码。')
  return new TextDecoder('utf-8', { fatal: true }).decode(body)
}
