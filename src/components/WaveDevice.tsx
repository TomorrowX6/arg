import { useEffect, useMemo, useRef, useState } from 'react'
import type { Artifact } from '../game/types'
import { makeSpectrogram, parseWave, readFrequencyGrid, waveChannel } from '../game/waveform'
import type { Spectrogram, WaveChannel } from '../game/waveform'
import { Icon } from './Icon'
import '../styles/forensics.css'
import '../styles/signals.css'

function drawWave(canvas: HTMLCanvasElement, samples: Float32Array) {
  const context = canvas.getContext('2d')
  if (!context) return
  const { width, height } = canvas
  context.fillStyle = '#1e342b'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#476046'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, height / 2)
  context.lineTo(width, height / 2)
  context.stroke()
  context.strokeStyle = '#d5c185'
  for (let x = 0; x < width; x++) {
    const start = Math.floor((x * samples.length) / width),
      end = Math.floor(((x + 1) * samples.length) / width)
    let low = 0,
      high = 0
    for (let index = start; index < end; index++) {
      low = Math.min(low, samples[index])
      high = Math.max(high, samples[index])
    }
    context.beginPath()
    context.moveTo(x, height / 2 - high * height * 0.95)
    context.lineTo(x, height / 2 - low * height * 0.95)
    context.stroke()
  }
}
function drawSpectrum(canvas: HTMLCanvasElement, spectrum: Spectrogram, low: number, high: number) {
  const context = canvas.getContext('2d')
  if (!context) return
  const first = Math.max(0, Math.ceil(low / spectrum.binHz)),
    last = Math.min(spectrum.bins - 1, Math.floor(high / spectrum.binHz))
  const image = new ImageData(spectrum.width, last - first + 1)
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const amplitude = spectrum.values[(last - y) * spectrum.width + x]
      const level = Math.max(0, Math.min(1, (20 * Math.log10(amplitude + 1e-9) + 74) / 48)) ** 1.4
      const index = (y * image.width + x) * 4
      image.data[index] = 26 + level * 220
      image.data[index + 1] = 45 + level * 163
      image.data[index + 2] = 35 + level * 99
      image.data[index + 3] = 255
    }
  const buffer = document.createElement('canvas')
  buffer.width = image.width
  buffer.height = image.height
  buffer.getContext('2d')!.putImageData(image, 0, 0)
  context.imageSmoothingEnabled = false
  context.drawImage(buffer, 0, 0, canvas.width, canvas.height)
}

const channels: { id: WaveChannel; label: string; code: string }[] = [
  { id: 'mix', label: '合声', code: 'L + R' },
  { id: 'left', label: '左声道', code: 'L' },
  { id: 'right', label: '右声道', code: 'R' },
  { id: 'side', label: '差分', code: 'L − R' },
]
export function WaveDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { src: string; filename: string }
  const source = `${import.meta.env.BASE_URL}${config.src}`
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [channel, setChannel] = useState<WaveChannel>('mix')
  const [range, setRange] = useState('all')
  const [columnMs, setColumnMs] = useState('160')
  const [grid, setGrid] = useState<number[][] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [feedback, setFeedback] = useState('')
  const waveformCanvas = useRef<HTMLCanvasElement>(null),
    spectrumCanvas = useRef<HTMLCanvasElement>(null)
  const audio = useRef<AudioContext | null>(null),
    node = useRef<AudioBufferSourceNode | null>(null),
    playRequest = useRef(0)
  const parsed = useMemo(() => {
    if (!bytes) return { recording: null, error: '' }
    try {
      return { recording: parseWave(bytes), error: '' }
    } catch (error) {
      return { recording: null, error: error instanceof Error ? error.message : '音频读取失败。' }
    }
  }, [bytes])
  const recording = parsed.recording
  const samples = useMemo(
    () => (recording ? waveChannel(recording, channel) : null),
    [recording, channel],
  )
  const spectrum = useMemo(
    () => (samples && recording ? makeSpectrogram(samples, recording.sampleRate) : null),
    [samples, recording],
  )
  const low = range === 'band' ? 625 : 0,
    high = range === 'band' ? 1625 : (recording?.sampleRate ?? 8000) / 2
  useEffect(() => {
    const controller = new AbortController()
    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('声音物证暂时无法调取，请重试。')
        return response.arrayBuffer()
      })
      .then((buffer) => {
        setBytes(new Uint8Array(buffer))
        setLoadError('')
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setLoadError(error.message)
      })
    return () => controller.abort()
  }, [source, retry])
  useEffect(() => {
    if (waveformCanvas.current && samples) drawWave(waveformCanvas.current, samples)
    if (spectrumCanvas.current && spectrum)
      drawSpectrum(spectrumCanvas.current, spectrum, low, high)
  }, [samples, spectrum, low, high])
  useEffect(
    () => () => {
      playRequest.current++
      if (node.current) {
        node.current.onended = null
        try {
          node.current.stop()
        } catch {
          /* It may already have ended. */
        }
      }
      void audio.current?.close()
    },
    [],
  )
  function stop() {
    playRequest.current++
    if (node.current) {
      node.current.onended = null
      try {
        node.current.stop()
      } catch {
        /* Already stopped. */
      }
      node.current = null
    }
    setPlaying(false)
  }
  async function play() {
    if (!samples || !recording) return
    stop()
    const request = ++playRequest.current
    setFeedback('')
    try {
      const context = audio.current ?? new AudioContext()
      audio.current = context
      await context.resume()
      if (request !== playRequest.current) return
      const buffer = context.createBuffer(1, samples.length, recording.sampleRate)
      buffer.copyToChannel(new Float32Array(samples), 0)
      const current = context.createBufferSource(),
        volume = context.createGain()
      current.buffer = buffer
      volume.gain.value = 0.3
      current.connect(volume)
      volume.connect(context.destination)
      current.onended = () => {
        if (node.current === current) {
          node.current = null
          setPlaying(false)
        }
      }
      node.current = current
      current.start()
      setPlaying(true)
    } catch {
      setFeedback('音频播放暂时不可用。波形、声谱图和频带像素仍可正常查看。')
      setPlaying(false)
    }
  }
  function inspectBands() {
    if (!samples || !recording) return
    setFeedback('')
    setGrid(null)
    try {
      setGrid(readFrequencyGrid(samples, recording.sampleRate, Number(columnMs)))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '频带读数失败。')
    }
  }
  return (
    <div className="wave-device">
      <div className="forensic-filebar">
        <div className="forensic-fileicon">
          <Icon name="audio" size={23} />
        </div>
        <div>
          <strong>{config.filename}</strong>
          <span>
            {recording
              ? `${recording.channels.length} 声道 · ${recording.sampleRate} Hz · ${recording.duration.toFixed(2)} 秒`
              : '调取原始物证…'}{' '}
            · WAV / PCM
          </span>
        </div>
        <a
          className="icon-button"
          href={source}
          download={config.filename}
          aria-label={`下载原始文件 ${config.filename}`}
        >
          <Icon name="download" size={19} />
        </a>
      </div>
      {loadError || parsed.error ? (
        <div className="forensic-error" role="alert">
          {loadError || parsed.error}
          {loadError && (
            <button className="text-button" onClick={() => setRetry(retry + 1)}>
              重新调取
            </button>
          )}
        </div>
      ) : !recording ? (
        <p className="signal-loading" role="status">
          正在读取采样数据…
        </p>
      ) : (
        <>
          <div className="wave-channel-picker" role="group" aria-label="分析声道">
            {channels.map((item) => (
              <button
                key={item.id}
                className={channel === item.id ? 'active' : ''}
                aria-pressed={channel === item.id}
                onClick={() => {
                  stop()
                  setChannel(item.id)
                  setGrid(null)
                  setFeedback('')
                }}
              >
                <span>{item.label}</span>
                <small>{item.code}</small>
              </button>
            ))}
          </div>
          <p className="signal-help wave-formula">
            合声 = (L+R)/2；差分 = (L−R)/2。两种声音相同的部分，会在差分中相互抵消。
          </p>
          <div className="wave-plot-heading">
            <span>振幅 / WAVEFORM</span>
            <button className="text-button" onClick={playing ? stop : play}>
              <Icon name={playing ? 'pause' : 'play'} size={14} />
              {playing ? '停止播放' : '播放所选声道'}
            </button>
          </div>
          <div className="wave-waveform">
            <canvas
              ref={waveformCanvas}
              width={900}
              height={150}
              role="img"
              aria-label={`${channels.find((item) => item.id === channel)!.label}的波形，显示 ${recording.duration.toFixed(2)} 秒内的振幅变化`}
            />
          </div>
          <div className="wave-axis">
            <span>0.00 s</span>
            <span>{recording.duration.toFixed(2)} s</span>
          </div>
          <div className="wave-spectrum-heading">
            <div>
              <span>频率 / SPECTROGRAM</span>
              <p>亮色表示该频率的信号更强。</p>
            </div>
            <label>
              <span className="sr-only">声谱显示范围</span>
              <select value={range} onChange={(event) => setRange(event.target.value)}>
                <option value="all">完整频段</option>
                <option value="band">625–1625 Hz</option>
              </select>
            </label>
          </div>
          <div className="wave-spectrogram">
            <canvas
              ref={spectrumCanvas}
              width={900}
              height={280}
              role="img"
              aria-label={`${channels.find((item) => item.id === channel)!.label}的声谱图。横轴从 0 到 ${recording.duration.toFixed(2)} 秒，纵轴从上方 ${high} 到下方 ${low} 赫兹；可在下方转换为字符像素图。`}
            />
            <span className="wave-frequency-high">{high} Hz</span>
            <span className="wave-frequency-low">{low} Hz</span>
          </div>
          <div className="wave-axis">
            <span>时间 →</span>
            <span>{recording.duration.toFixed(2)} s</span>
          </div>
          <details className="wave-band-reader">
            <summary>
              <Icon name="grid" size={16} />
              把频带读成像素
              <Icon name="chevronDown" size={14} />
            </summary>
            <p className="signal-help">
              取 750–1500 Hz
              的七条等距频带，从高频到低频排成七行。每列选取一段时间；亮起的频带记为黑格，内容仍来自当前所选声道。
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                inspectBands()
              }}
            >
              <label>
                每列时长（毫秒）
                <input
                  type="number"
                  min="40"
                  max="1000"
                  step="10"
                  value={columnMs}
                  onChange={(event) => {
                    setColumnMs(event.target.value)
                    setGrid(null)
                  }}
                  required
                />
              </label>
              <button className="button button-dark button-small">
                读取频带像素
                <Icon name="arrowRight" size={14} />
              </button>
            </form>
            {grid && (
              <div className="wave-pixel-result">
                <span>
                  {grid.length} 行 × {grid[0].length} 列 · 从左到右观察字形
                </span>
                <pre aria-label="频带像素图">
                  {grid.map((row) => row.map((bit) => (bit ? '█' : '·')).join('')).join('\n')}
                </pre>
                <p>█ 表示有信号，· 表示空白。可以切换声道后重新读取，比较差异。</p>
              </div>
            )}
          </details>
          {Object.keys(recording.metadata).length > 0 && (
            <details className="wave-metadata">
              <summary>
                查看 WAV 文件备注
                <Icon name="chevronDown" size={14} />
              </summary>
              <dl>
                {Object.entries(recording.metadata).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <p className="signal-feedback" role="status">
            {feedback}
          </p>
        </>
      )}
      <p className="signal-provenance">
        <Icon name="headphones" size={13} />
        所有图形均由这份 WAV 的采样数据计算。无需开启声音，也能完成调查。
      </p>
    </div>
  )
}
