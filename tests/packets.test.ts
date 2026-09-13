import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  decodeHttpBody,
  extractDnsHex,
  internetChecksum,
  parsePcap,
  readDns,
  readHttp,
  reassembleTcp,
  tcpStreamId,
  tcpStreams,
} from '../src/game/packets'

const load = (name: string) => new Uint8Array(readFileSync(`public/assets/evidence/${name}.pcap`))
const response = (packets: ReturnType<typeof parsePcap>['packets']) =>
  tcpStreams(packets).find((stream) => stream.startsWith('198.51.100.17:80'))!

describe('real PCAP evidence', () => {
  it('reads actual DNS query and compressed response names, validates IPv4 checksums and assembles numbered fragments', () => {
    const capture = parsePcap(load('post-office-dns'))
    expect(capture.packets).toHaveLength(12)
    expect(capture.packets.every((packet) => packet.headerChecksumValid)).toBe(true)
    expect(capture.packets[3].dns?.answers[0]).toMatchObject({
      name: '03.303137.drop.wugang.invalid',
      type: 16,
      value: 'FRAGMENT ACCEPTED',
    })
    expect(extractDnsHex(capture.packets, 'drop.wugang.invalid')).toBe('42 4F 58 20 30 31 37')
    expect(() =>
      extractDnsHex(
        capture.packets.filter((packet) => !packet.dns?.questions[0].name.startsWith('02.')),
        'drop.wugang.invalid',
      ),
    ).toThrow('缺少第 2')
    expect(() => extractDnsHex(capture.packets, 'missing.invalid')).toThrow('没有找到')
    const conflicting = {
      ...capture.packets[6],
      dns: {
        ...capture.packets[6].dns!,
        questions: [{ name: '02.4141.drop.wugang.invalid', type: 16 }],
      },
    }
    expect(() => extractDnsHex([...capture.packets, conflicting], 'drop.wugang.invalid')).toThrow(
      '矛盾',
    )
  })
  it('detects incomplete capture records and cyclic DNS compression pointers', () => {
    const capture = load('letter-stream')
    expect(() => parsePcap(capture.subarray(0, 10))).toThrow('文件头')
    expect(() => parsePcap(capture.subarray(0, capture.length - 1))).toThrow('缺少')
    const invalid = new Uint8Array(capture)
    invalid[0] = 0
    expect(() => parsePcap(invalid)).toThrow('不是经典 PCAP')
    const dns = new Uint8Array(18)
    dns[5] = 1
    dns[12] = 0xc0
    dns[13] = 12
    expect(() => readDns(dns)).toThrow('回路')
  })
  it('supports the alternate PCAP byte order without changing packet contents', () => {
    const original = load('post-office-dns'),
      converted = new Uint8Array(original)
    const input = new DataView(original.buffer),
      output = new DataView(converted.buffer)
    output.setUint32(0, 0xa1b2c3d4)
    for (const offset of [4, 6]) output.setUint16(offset, input.getUint16(offset, true))
    for (const offset of [8, 12, 16, 20]) output.setUint32(offset, input.getUint32(offset, true))
    for (let cursor = 24; cursor < converted.length;) {
      const length = input.getUint32(cursor + 8, true)
      for (const offset of [0, 4, 8, 12])
        output.setUint32(cursor + offset, input.getUint32(cursor + offset, true))
      cursor += 16 + length
    }
    expect(parsePcap(converted)).toEqual(parsePcap(original))
  })
  it('restores out-of-order TCP data, removes an identical retransmission and decodes both plain and gzip HTTP bodies', async () => {
    for (const [name, phrase] of [
      ['letter-stream', 'STATUS: STILL HERE'],
      ['receipt-stream', '校验词：AFTER THE RAIN'],
    ]) {
      const packets = parsePcap(load(name)).packets
      expect(packets.every((packet) => packet.headerChecksumValid)).toBe(true)
      const result = reassembleTcp(packets, response(packets))
      expect(result.retransmissions).toBe(1)
      expect(result.firstSequence).toBe(7001)
      expect(readHttp(result.bytes).status).toBe('HTTP/1.1 200 OK')
      expect(await decodeHttpBody(result.bytes)).toContain(phrase)
    }
  })
  it('refuses gaps at the beginning, middle or end and refuses contradictory retransmissions', () => {
    const packets = parsePcap(load('letter-stream')).packets,
      stream = response(packets)
    const positions = [
      ...new Set(
        packets
          .filter((packet) => packet.payload.length && tcpStreamId(packet) === stream)
          .map((packet) => packet.tcp!.sequence),
      ),
    ].sort((a, b) => a - b)
    for (const position of [positions[0], positions[1], positions.at(-1)])
      expect(() =>
        reassembleTcp(
          packets.filter((packet) => !packet.payload.length || packet.tcp?.sequence !== position),
          stream,
        ),
      ).toThrow('缺少')
    const repeated = packets.find(
      (packet) => packet.tcp?.sequence === positions[1] && packet.payload.length,
    )!
    const payload = new Uint8Array(repeated.payload)
    payload[0] ^= 1
    expect(() => reassembleTcp([...packets, { ...repeated, payload }], stream)).toThrow('不同内容')
  })
  it('writes valid TCP pseudo-header checksums and detects truncated HTTP bodies', () => {
    const bytes = load('receipt-stream'),
      view = new DataView(bytes.buffer)
    for (let cursor = 24; cursor < bytes.length;) {
      const length = view.getUint32(cursor + 8, true),
        frame = bytes.subarray(cursor + 16, cursor + 16 + length)
      const segment = frame.subarray(34),
        pseudo = new Uint8Array(12 + segment.length)
      pseudo.set(frame.subarray(26, 34))
      pseudo[9] = 6
      new DataView(pseudo.buffer).setUint16(10, segment.length)
      pseudo.set(segment, 12)
      expect(internetChecksum(pseudo)).toBe(0)
      cursor += 16 + length
    }
    expect(() =>
      readHttp(new TextEncoder().encode('HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nAB')),
    ).toThrow('长度')
  })
})
