import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  fftMagnitudes,
  makeSpectrogram,
  parseWave,
  readFrequencyGrid,
  waveChannel,
} from '../src/game/waveform'
import { extractInvisibleText, invisibleCharacters } from '../src/game/unicode'

const bitmap = [
  '01110011110011111010001',
  '10001010001010000011001',
  '10001010001010000011001',
  '10001011110011110010101',
  '10001010000010000010011',
  '10001010000010000010011',
  '01110010000011111010001',
]

describe('sample-derived audio and Unicode evidence', () => {
  it('locates a known tone at its correct FFT frequency and magnitude', () => {
    const samples = Float32Array.from(
      { length: 1024 },
      (_, index) => 0.25 * Math.sin((2 * Math.PI * 24 * index) / 512),
    )
    const frequencies = fftMagnitudes(samples.subarray(0, 512))
    expect([...frequencies].indexOf(Math.max(...frequencies))).toBe(24)
    expect(frequencies[24]).toBeCloseTo(0.25, 5)
    const spectrogram = makeSpectrogram(samples, 8000)
    expect(spectrogram.binHz * 24).toBe(375)
    expect(spectrogram.width).toBe(5)
    expect(spectrogram.values[24 * spectrogram.width]).toBeGreaterThan(0.12)
    expect(() => fftMagnitudes(new Float32Array(511))).toThrow('2 的幂')
  })
  it('reads real stereo PCM and reveals the OPEN glyphs only after separating the shared background', () => {
    const recording = parseWave(readFileSync('public/assets/evidence/station-stereo.wav'))
    expect(recording.channels).toHaveLength(2)
    expect(recording.sampleRate).toBe(8000)
    expect(recording.duration).toBe(3.68)
    expect(recording.metadata.ICMT).toContain('160 ms')
    const difference = waveChannel(recording, 'side'),
      mixture = waveChannel(recording, 'mix')
    expect(readFrequencyGrid(difference, recording.sampleRate).map((row) => row.join(''))).toEqual(
      bitmap,
    )
    expect(
      readFrequencyGrid(mixture, recording.sampleRate).every((row) => row.every(Boolean)),
    ).toBe(true)
    const spectrum = makeSpectrogram(difference, recording.sampleRate)
    expect(spectrum.values.every(Number.isFinite)).toBe(true)
    expect(spectrum.values.some((value) => value > 0.02)).toBe(true)
  })
  it('rejects incomplete WAV chunks and invalid time windows', () => {
    const bytes = readFileSync('public/assets/evidence/station-stereo.wav')
    expect(() => parseWave(bytes.subarray(0, bytes.length - 1))).toThrow('末尾')
    expect(() => parseWave(new Uint8Array(100))).toThrow('不是')
    expect(() => readFrequencyGrid(new Float32Array(8000), 8000, 0)).toThrow('有效')
  })
  it('extracts real invisible Unicode code points without changing the visible letter', () => {
    const letter = readFileSync('public/assets/evidence/letter-017.txt', 'utf8')
    expect(invisibleCharacters(letter)).toMatchObject([
      { value: 0x200b, count: 53 },
      { value: 0x200c, count: 43 },
    ])
    const result = extractInvisibleText(letter)
    expect(result.text).toBe('WINDOW SEVEN')
    expect(result.bits.split(' ')).toHaveLength(12)
    expect(letter.replace(/[\u200b\u200c]/g, '')).toContain('信纸上最轻的东西，也许才是下一站。')
    expect(() => extractInvisibleText(letter, 0x200b, 0x200b)).toThrow('不同字符')
    expect(() => extractInvisibleText(letter, 0x200c, 0x200b)).toThrow('UTF-8')
    expect(() => extractInvisibleText('\u200b')).toThrow('八位字节')
  })
})
