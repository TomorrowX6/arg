export interface WaveRecording {
  sampleRate: number
  sampleCount: number
  channels: Float32Array[]
  duration: number
  metadata: Record<string, string>
}
export type WaveChannel = 'mix' | 'left' | 'right' | 'side'
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes).replace(/\0+$/, '')
export function parseWave(bytes: Uint8Array): WaveRecording {
  if (
    bytes.length < 12 ||
    text(bytes.subarray(0, 4)) !== 'RIFF' ||
    text(bytes.subarray(8, 12)) !== 'WAVE'
  )
    throw new Error('这不是 RIFF/WAVE 音频文件。')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    end = view.getUint32(4, true) + 8
  if (end > bytes.length) throw new Error('WAV 文件的末尾不完整。')
  let format: Uint8Array | null = null,
    data: Uint8Array | null = null
  const metadata: Record<string, string> = {}
  for (let cursor = 12; cursor + 8 <= end;) {
    const name = text(bytes.subarray(cursor, cursor + 4)),
      length = view.getUint32(cursor + 4, true),
      start = cursor + 8
    if (start + length > end) throw new Error('WAV 数据块越过了文件边界。')
    const body = bytes.subarray(start, start + length)
    if (name === 'fmt ') format = body
    if (name === 'data') data = body
    if (name === 'LIST' && text(body.subarray(0, 4)) === 'INFO') {
      const list = new DataView(body.buffer, body.byteOffset, body.byteLength)
      for (let offset = 4; offset + 8 <= body.length;) {
        const key = text(body.subarray(offset, offset + 4)),
          size = list.getUint32(offset + 4, true)
        if (offset + 8 + size > body.length) throw new Error('WAV 备注块不完整。')
        metadata[key] = text(body.subarray(offset + 8, offset + 8 + size))
        offset += 8 + size + (size % 2)
      }
    }
    cursor = start + length + (length % 2)
  }
  if (!format || format.length < 16 || !data) throw new Error('WAV 缺少格式块或采样数据。')
  const info = new DataView(format.buffer, format.byteOffset, format.byteLength)
  const encoding = info.getUint16(0, true),
    channelCount = info.getUint16(2, true),
    sampleRate = info.getUint32(4, true),
    alignment = info.getUint16(12, true),
    bits = info.getUint16(14, true)
  if (encoding !== 1 || bits !== 16 || channelCount < 1 || channelCount > 2)
    throw new Error('这个检验台读取 16 位 PCM 单声道或双声道 WAV。')
  if (
    !sampleRate ||
    sampleRate > 192000 ||
    alignment !== channelCount * 2 ||
    data.length % alignment
  )
    throw new Error('采样率或声道对齐信息无效。')
  const sampleCount = data.length / alignment
  if (sampleCount > 4_000_000) throw new Error('采样数量超出本次检验范围。')
  const samples = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const channels = Array.from({ length: channelCount }, (_, channel) =>
    Float32Array.from(
      { length: sampleCount },
      (_, index) => samples.getInt16(index * alignment + channel * 2, true) / 32768,
    ),
  )
  return { sampleRate, sampleCount, channels, duration: sampleCount / sampleRate, metadata }
}
export function waveChannel(recording: WaveRecording, channel: WaveChannel): Float32Array {
  const left = recording.channels[0],
    right = recording.channels[1] ?? left
  if (channel === 'left') return left
  if (channel === 'right') return right
  return Float32Array.from(left, (sample, index) =>
    channel === 'mix' ? (sample + right[index]) / 2 : (sample - right[index]) / 2,
  )
}
export function fftMagnitudes(input: Float32Array): Float32Array {
  const size = input.length
  if (size < 2 || size > 8192 || size & (size - 1))
    throw new Error('频谱窗口长度必须是 2 的幂，且不超过 8192。')
  const real = Float64Array.from(input),
    imaginary = new Float64Array(size)
  for (let index = 1, reversed = 0; index < size; index++) {
    let bit = size >> 1
    for (; reversed & bit; bit >>= 1) reversed ^= bit
    reversed ^= bit
    if (index < reversed) [real[index], real[reversed]] = [real[reversed], real[index]]
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = (-2 * Math.PI) / length,
      cos = Math.cos(angle),
      sin = Math.sin(angle)
    for (let start = 0; start < size; start += length) {
      let wr = 1,
        wi = 0
      for (let index = 0; index < length / 2; index++) {
        const even = start + index,
          odd = even + length / 2
        const re = real[odd] * wr - imaginary[odd] * wi,
          im = real[odd] * wi + imaginary[odd] * wr
        real[odd] = real[even] - re
        imaginary[odd] = imaginary[even] - im
        real[even] += re
        imaginary[even] += im
        const next = wr * cos - wi * sin
        wi = wr * sin + wi * cos
        wr = next
      }
    }
  }
  return Float32Array.from(
    { length: size / 2 + 1 },
    (_, index) => Math.hypot(real[index], imaginary[index]) / (size / 2),
  )
}
export interface Spectrogram {
  width: number
  bins: number
  values: Float32Array
  binHz: number
  stepSeconds: number
}
export function makeSpectrogram(
  samples: Float32Array,
  sampleRate: number,
  size = 512,
  hop = 128,
): Spectrogram {
  if (samples.length < size || !Number.isInteger(hop) || hop < 1)
    throw new Error('音频长度不足，或时间窗口无效。')
  const width = Math.floor((samples.length - size) / hop) + 1,
    bins = size / 2 + 1
  const values = new Float32Array(width * bins),
    window = Float32Array.from(
      { length: size },
      (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)),
    )
  for (let x = 0; x < width; x++) {
    const input = Float32Array.from(
      { length: size },
      (_, index) => samples[x * hop + index] * window[index],
    )
    const spectrum = fftMagnitudes(input)
    for (let bin = 0; bin < bins; bin++) values[bin * width + x] = spectrum[bin]
  }
  return { width, bins, values, binHz: sampleRate / size, stepSeconds: hop / sampleRate }
}
export function measureTone(
  samples: Float32Array,
  sampleRate: number,
  frequency: number,
  center: number,
  size = 512,
): number {
  const start = Math.max(
    0,
    Math.min(samples.length - size, Math.round(center * sampleRate) - size / 2),
  )
  let real = 0,
    imaginary = 0
  for (let index = 0; index < size; index++) {
    const angle = (2 * Math.PI * frequency * index) / sampleRate,
      sample = samples[start + index] ?? 0
    real += sample * Math.cos(angle)
    imaginary += sample * Math.sin(angle)
  }
  return (Math.hypot(real, imaginary) * 2) / size
}
export function readFrequencyGrid(
  samples: Float32Array,
  sampleRate: number,
  milliseconds = 160,
  low = 750,
  high = 1500,
  rows = 7,
): number[][] {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 40 ||
    milliseconds > 1000 ||
    rows < 2 ||
    high <= low ||
    high >= sampleRate / 2
  )
    throw new Error('请使用有效的时间窗口与频带范围。')
  const seconds = milliseconds / 1000,
    columns = Math.floor(samples.length / sampleRate / seconds + 1e-6)
  if (columns < 1 || columns > 200) throw new Error('当前时间窗口得到的列数不在 1–200 范围内。')
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      measureTone(
        samples,
        sampleRate,
        high - (row * (high - low)) / (rows - 1),
        (column + 0.5) * seconds,
      ) > 0.02
        ? 1
        : 0,
    ),
  )
}
