import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Artifact } from '../game/types'
import { decodeBase64 } from '../game/mechanics'
import {
  extractPixelBits,
  hasPngSignature,
  hexDump,
  parseHexBytes,
  parsePng,
  readPngPixels,
  readTextChunk,
} from '../game/forensics'
import { Icon } from './Icon'
import '../styles/forensics.css'

const chunkNames: Record<string, string> = {
  IHDR: '图像尺寸与格式',
  tEXt: '文字备注',
  IDAT: '压缩像素数据',
  IEND: '文件结束',
}
const tabs = [
  { id: 'overview', label: '文件概览', icon: 'file' },
  { id: 'hex', label: '十六进制', icon: 'terminal' },
  { id: 'chunks', label: '数据块', icon: 'archive' },
  { id: 'pixels', label: '像素通道', icon: 'eye' },
]

export function ForensicDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config ?? {}
  const source = `${import.meta.env.BASE_URL}${config.src as string}`
  const filename = (config.filename as string) ?? 'evidence.png'
  const [original, setOriginal] = useState<Uint8Array | null>(null)
  const [edited, setEdited] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('overview')
  const [prefix, setPrefix] = useState('')
  const [patchMessage, setPatchMessage] = useState('')
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null)
  const [decoded, setDecoded] = useState('')
  const [channel, setChannel] = useState(0)
  const [bit, setBit] = useState(7)
  const [pixelReading, setPixelReading] = useState<{ bits: string; text: string } | null>(null)
  const [pixelError, setPixelError] = useState('')
  const [reading, setReading] = useState(false)
  const bytes = edited ?? original
  const valid = bytes ? hasPngSignature(bytes) : false
  const preview = useMemo(
    () =>
      bytes && valid
        ? `data:image/png;base64,${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`
        : '',
    [bytes, valid],
  )
  const parsed = useMemo(() => {
    if (!bytes) return { chunks: [], error: '' }
    try {
      return { chunks: parsePng(bytes), error: '' }
    } catch (error) {
      return { chunks: [], error: error instanceof Error ? error.message : '文件读取失败。' }
    }
  }, [bytes])

  useEffect(() => {
    const controller = new AbortController()
    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('物证文件暂时无法下载，请检查连接后重试。')
        return response.arrayBuffer()
      })
      .then((buffer) => setOriginal(new Uint8Array(buffer)))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setLoadError(error.message)
      })
    return () => controller.abort()
  }, [source])

  function patch(event: FormEvent) {
    event.preventDefault()
    if (!original) return
    try {
      const header = parseHexBytes(prefix)
      if (header.length !== 8) throw new Error('需要完整的 8 个字节；其他位置不会被改动。')
      const copy = new Uint8Array(original)
      copy.set(header)
      setEdited(copy)
      setPatchMessage(
        hasPngSignature(copy)
          ? '文件签名恢复成功。返回文件概览，查看照片。'
          : '已写入这 8 个字节，但文件仍不是有效的 PNG。请对照格式卡检查。',
      )
    } catch (error) {
      setPatchMessage(error instanceof Error ? error.message : '无法应用修改。')
    }
  }

  async function readPixels() {
    if (!bytes) return
    setReading(true)
    setPixelError('')
    setPixelReading(null)
    try {
      const image = await readPngPixels(bytes)
      setPixelReading(extractPixelBits(image.pixels, image.channels, channel, bit, 104))
    } catch (error) {
      setPixelError(error instanceof Error ? error.message : '像素读取失败。')
    } finally {
      setReading(false)
    }
  }

  const selected = selectedChunk === null ? null : parsed.chunks[selectedChunk]
  const textChunk = selected?.type === 'tEXt' ? readTextChunk(selected.data) : null
  const dimensions =
    parsed.chunks[0]?.type === 'IHDR' && parsed.chunks[0].length === 13
      ? new DataView(parsed.chunks[0].data.buffer)
      : null

  return (
    <div className="forensic-device">
      <div className="forensic-filebar">
        <div className="forensic-fileicon">
          <Icon name="fingerprint" size={23} />
        </div>
        <div>
          <strong>{filename}</strong>
          <span>
            {bytes ? `${bytes.length.toLocaleString()} bytes` : '调取原始物证…'} · PNG / 图像物证
          </span>
        </div>
        <a
          className="icon-button"
          href={source}
          download={filename}
          aria-label={`下载原始文件 ${filename}`}
        >
          <Icon name="download" size={19} />
        </a>
      </div>
      {loadError ? (
        <p className="forensic-error" role="alert">
          {loadError}
          <button className="text-button" onClick={() => window.location.reload()}>
            重新连接
          </button>
        </p>
      ) : !bytes ? (
        <p role="status">正在读取物证…</p>
      ) : (
        <>
          <div className="forensic-tabs" role="group" aria-label="检验方式">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? 'active' : ''}
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </button>
            ))}
          </div>
          <section
            className="forensic-panel"
            aria-label={tabs.find((item) => item.id === tab)?.label}
          >
            {tab === 'overview' && (
              <>
                <div className="forensic-preview">
                  {preview && !parsed.error ? (
                    <img
                      src={preview}
                      width="480"
                      height="300"
                      alt={config.description as string}
                    />
                  ) : (
                    <div className="forensic-broken">
                      <Icon name="file" size={47} strokeWidth={1} />
                      <strong>照片无法打开</strong>
                      <p>
                        扩展名是 .png，文件签名却不匹配。
                        <br />
                        图像内容可能仍然完好。
                      </p>
                      <span>INVALID FILE SIGNATURE</span>
                    </div>
                  )}
                </div>
                <dl className="forensic-properties">
                  <div>
                    <dt>文件状态</dt>
                    <dd className={valid ? 'text-green' : 'forensic-error'}>
                      {valid ? 'PNG 签名有效' : '文件头损坏'}
                    </dd>
                  </div>
                  <div>
                    <dt>图像尺寸</dt>
                    <dd>
                      {dimensions
                        ? `${dimensions.getUint32(0)} × ${dimensions.getUint32(4)}`
                        : '暂时无法识别'}
                    </dd>
                  </div>
                  <div>
                    <dt>检验方式</dt>
                    <dd>本地读取 · 原件可下载</dd>
                  </div>
                </dl>
                {preview && !parsed.error && (
                  <details className="forensic-transcript">
                    <summary>照片内容的文字描述</summary>
                    <p>{config.description as string}</p>
                  </details>
                )}
                {!valid && (
                  <button className="button button-dark button-small" onClick={() => setTab('hex')}>
                    检查文件开头
                    <Icon name="arrowRight" size={15} />
                  </button>
                )}
                {edited && valid && preview && (
                  <a
                    href={preview}
                    download={`restored-${filename}`}
                    className="button button-ghost button-small"
                  >
                    <Icon name="download" size={15} />
                    下载已修复的照片
                  </a>
                )}
              </>
            )}
            {tab === 'hex' && (
              <>
                <div className="forensic-panel-title">
                  <h4>文件开头的 128 个字节</h4>
                  <span>OFFSET · HEX · ASCII</span>
                </div>
                <div className="hex-scroll" tabIndex={0} aria-label="文件十六进制转储，可横向滚动">
                  <pre>{hexDump(bytes, 128)}</pre>
                </div>
                <p className="forensic-explainer">
                  左边是字节位置，中间是十六进制数值，右边是可读字符。每组两位数代表一个字节。
                </p>
                {config.mode === 'header' && (
                  <form className="forensic-patch" onSubmit={patch}>
                    <label htmlFor="png-header">用新的 8 个字节替换文件开头</label>
                    <div>
                      <input
                        id="png-header"
                        value={prefix}
                        onChange={(event) => {
                          setPrefix(event.target.value)
                          setPatchMessage('')
                        }}
                        maxLength={48}
                        placeholder="00 00 00 00 0D 0A 1A 0A"
                        spellCheck={false}
                        autoComplete="off"
                      />
                      <button className="button button-dark button-small" disabled={!prefix.trim()}>
                        应用修复
                      </button>
                    </div>
                    <p role="status">{patchMessage}</p>
                    {edited && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setEdited(null)
                          setPrefix('')
                          setPatchMessage('已恢复为原始副本。')
                        }}
                      >
                        <Icon name="reset" size={14} />
                        恢复原件
                      </button>
                    )}
                  </form>
                )}
              </>
            )}
            {tab === 'chunks' && (
              <>
                <div className="forensic-panel-title">
                  <h4>PNG 数据块目录</h4>
                  <span>CHUNK INSPECTOR</span>
                </div>
                {parsed.error ? (
                  <p className="forensic-error">{parsed.error}</p>
                ) : (
                  <>
                    <div className="chunk-list">
                      {parsed.chunks.map((chunk, index) => (
                        <button
                          key={`${chunk.offset}-${chunk.type}`}
                          aria-pressed={selectedChunk === index}
                          className={selectedChunk === index ? 'selected' : ''}
                          onClick={() => {
                            setSelectedChunk(index)
                            setDecoded('')
                          }}
                        >
                          <code>{chunk.type}</code>
                          <span>{chunkNames[chunk.type] ?? '扩展数据块'}</span>
                          <small>{chunk.length} B</small>
                          <Icon name={chunk.crcValid ? 'check' : 'help'} size={14} />
                        </button>
                      ))}
                    </div>
                    <div className="chunk-detail" aria-live="polite">
                      {selected ? (
                        <>
                          <span className="eyebrow">
                            {selected.type} / OFFSET {selected.offset} / CRC{' '}
                            {selected.crcValid ? 'OK' : 'ERROR'}
                          </span>
                          {textChunk ? (
                            <>
                              <dl>
                                <dt>{textChunk.keyword}</dt>
                                <dd>{textChunk.value}</dd>
                              </dl>
                              <button
                                className="text-button"
                                onClick={() => {
                                  try {
                                    setDecoded(decodeBase64(textChunk.value))
                                  } catch {
                                    setDecoded('这段文字不是可解码的 Base64。')
                                  }
                                }}
                              >
                                <Icon name="key" size={14} />
                                尝试 Base64 解码
                              </button>
                              {decoded && <output className="chunk-decoded">{decoded}</output>}
                            </>
                          ) : (
                            <p>
                              {selected.type === 'IHDR'
                                ? `宽 ${dimensions?.getUint32(0)}，高 ${dimensions?.getUint32(4)}，每通道 8 位。`
                                : selected.type === 'IDAT'
                                  ? '这里保存压缩后的颜色数据。可在「像素通道」中读取。'
                                  : '这个块标记图像数据的结束。'}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>选择一个数据块，检查其中的内容。tEXt 块通常保存作者的文字备注。</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
            {tab === 'pixels' && (
              <>
                <div className="forensic-panel-title">
                  <h4>逐像素位平面读取</h4>
                  <span>RGB / BIT PLANE</span>
                </div>
                <p className="forensic-explainer">
                  每个像素包含红、绿、蓝三个数值。最低位的变化只有
                  1，肉眼很难察觉；把同一位依次读出，就可能得到另一条消息。
                </p>
                <div className="pixel-settings">
                  <label>
                    颜色通道
                    <select
                      value={channel}
                      onChange={(event) => {
                        setChannel(Number(event.target.value))
                        setPixelReading(null)
                      }}
                    >
                      <option value={0}>红色 · RED</option>
                      <option value={1}>绿色 · GREEN</option>
                      <option value={2}>蓝色 · BLUE</option>
                    </select>
                  </label>
                  <label>
                    位编号
                    <select
                      value={bit}
                      onChange={(event) => {
                        setBit(Number(event.target.value))
                        setPixelReading(null)
                      }}
                    >
                      {Array.from({ length: 8 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                          {i === 0 ? ' · 最低位' : i === 7 ? ' · 最高位' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="forensic-explainer">
                  从左上角开始，逐行读取前 104 个像素；每 8 位按高位在前组成一个 ASCII 字节，遇到 00
                  结束。
                </p>
                <button
                  className="button button-dark button-small"
                  disabled={reading || !valid}
                  onClick={readPixels}
                >
                  <Icon name="eye" size={15} />
                  {reading ? '正在读取…' : '提取所选位平面'}
                </button>
                {!valid && <p className="forensic-error">需要先恢复图像的文件头。</p>}
                <div className="pixel-result" aria-live="polite">
                  {pixelError ? (
                    <p className="forensic-error">{pixelError}</p>
                  ) : pixelReading ? (
                    <>
                      <span className="eyebrow">
                        {['RED', 'GREEN', 'BLUE'][channel]} · BIT {bit}
                      </span>
                      <pre>{pixelReading.bits}</pre>
                      <span className="eyebrow">ASCII 读数 · 不可显示的字符记作 ·</span>
                      <output>{pixelReading.text || '（在开头遇到结束符）'}</output>
                    </>
                  ) : (
                    <p>选择颜色与位编号，然后读取。</p>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
