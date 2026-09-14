import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Artifact } from '../game/types'
import { extractZipEntry, parseZip, repairZipEncryptionFlag, zipDownloadName } from '../game/zip'
import type { ZipArchive, ZipEntry } from '../game/zip'
import { hexDump } from '../game/forensics'
import { Icon } from './Icon'
import '../styles/zip.css'

function download(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]))
  const link = document.createElement('a')
  link.href = url
  link.download = zipDownloadName(filename)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function readableText(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const binary = [...text].some((character) => {
      const code = character.charCodeAt(0)
      return code < 9 || (code > 13 && code < 32) || code === 127
    })
    return binary ? null : text
  } catch {
    return null
  }
}
interface Extracted {
  bytes: Uint8Array
  text: string | null
  digest: string
  nested: ZipArchive | null
  unflagged: boolean
}
interface Frame {
  name: string
  archive: ZipArchive
}

function ZipEntryPanel({
  frame,
  entry,
  depth,
  open,
}: {
  frame: Frame
  entry: ZipEntry
  depth: number
  open: (frame: Frame) => void
}) {
  const [password, setPassword] = useState('')
  const [visiblePassword, setVisiblePassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Extracted | null>(null)
  const job = useRef(0)
  const digestRef = useRef<HTMLInputElement>(null)
  useEffect(
    () => () => {
      job.current++
    },
    [],
  )
  async function extract(ignoreEncryption = false) {
    const token = ++job.current
    setBusy(true)
    setMessage('')
    setResult(null)
    try {
      const bytes = await extractZipEntry(frame.archive, entry, { password, ignoreEncryption })
      const digest = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))),
      ]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
      let nested = null
      try {
        nested = parseZip(bytes)
      } catch {
        /* Most extracted entries are not ZIP archives. */
      }
      if (token === job.current)
        setResult({
          bytes,
          text: readableText(bytes),
          digest,
          nested,
          unflagged: ignoreEncryption && entry.encrypted,
        })
    } catch (error) {
      if (token === job.current)
        setMessage(error instanceof Error ? error.message : '文件暂时无法读取。')
    } finally {
      if (token === job.current) setBusy(false)
    }
  }
  async function repair() {
    const token = ++job.current
    setBusy(true)
    setMessage('')
    try {
      const bytes = await repairZipEncryptionFlag(frame.archive, entry)
      if (token === job.current) {
        download(bytes, `${zipDownloadName(frame.name).replace(/\.[^.]*$/, '')}-repaired.zip`)
        setMessage('修复件已生成：本地文件头和中央目录的加密标记同时清除，文件内容保持原字节。')
      }
    } catch (error) {
      if (token === job.current)
        setMessage(error instanceof Error ? error.message : '修复件无法生成。')
    } finally {
      if (token === job.current) setBusy(false)
    }
  }
  return (
    <section className="zip-entry-panel" aria-label={`条目检验：${entry.name}`}>
      <div className="zip-entry-heading">
        <Icon name={entry.encrypted ? 'lock' : 'file'} size={22} />
        <div>
          <h4>{entry.name}</h4>
          <span>
            {entry.method === 0
              ? '存储 / 未压缩'
              : entry.method === 8
                ? 'DEFLATE 压缩'
                : `压缩方法 ${entry.method}`}{' '}
            · {entry.encrypted ? '带加密标记' : '未加密'}
          </span>
        </div>
      </div>
      <dl className="zip-entry-facts">
        <div>
          <dt>原始大小</dt>
          <dd>{entry.size} bytes</dd>
        </div>
        <div>
          <dt>载荷大小</dt>
          <dd>{entry.compressedSize} bytes</dd>
        </div>
        <div>
          <dt>目录内 CRC-32</dt>
          <dd>{entry.crc.toString(16).padStart(8, '0').toUpperCase()}</dd>
        </div>
        <div>
          <dt>记录时间</dt>
          <dd>{entry.modified}</dd>
        </div>
      </dl>
      {entry.comment && (
        <p className="zip-entry-comment">
          <Icon name="file" size={14} />
          {entry.comment}
        </p>
      )}
      {entry.encrypted && (
        <div className="zip-password">
          <label htmlFor="zip-password">
            条目提取密码
            <input
              id="zip-password"
              type={visiblePassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setMessage('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !busy && password) {
                  event.preventDefault()
                  void extract()
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            className="icon-button"
            onClick={() => setVisiblePassword(!visiblePassword)}
            aria-label={visiblePassword ? '隐藏提取密码' : '显示提取密码'}
            aria-pressed={visiblePassword}
          >
            <Icon name="eye" size={17} />
          </button>
        </div>
      )}
      <button
        className="button button-dark button-small zip-read-button"
        disabled={busy || (entry.encrypted && !password)}
        onClick={() => void extract()}
      >
        <Icon name={entry.encrypted ? 'key' : 'file'} size={15} />
        {busy ? '正在检验…' : entry.encrypted ? '解密并读取' : '读取并校验文件'}
      </button>
      {result && (
        <div className="zip-extracted">
          <div className="zip-crc-success">
            <Icon name="check" size={15} />
            <span>长度与 CRC-32 校验通过 · {result.bytes.length} bytes</span>
          </div>
          {result.unflagged && (
            <div className="zip-repair-result">
              <strong>内容可按未加密方式完整读取</strong>
              <p>这份载荷的真实字节不需要密码，加密标记与内容不符。</p>
              <button
                className="button button-ghost button-small"
                onClick={() => void repair()}
                disabled={busy}
              >
                <Icon name="download" size={14} />
                下载解除错误标记的 ZIP
              </button>
            </div>
          )}
          {result.text !== null ? (
            <label className="zip-text-result">
              <span>读取到的文件原文</span>
              <textarea
                readOnly
                aria-label="解出的文件正文"
                value={result.text}
                rows={Math.max(5, Math.min(12, result.text.split('\n').length + 1))}
                spellCheck={false}
              />
            </label>
          ) : (
            <div className="zip-binary-result">
              <Icon name={result.nested ? 'archive' : 'file'} size={27} />
              <div>
                <strong>{result.nested ? '里面还有一个 ZIP 压缩包' : '这是一份二进制文件'}</strong>
                <p>
                  {result.nested
                    ? `${result.nested.entries.length} 个条目，文件结构已确认。`
                    : '可下载原始字节，或展开下方的十六进制检查。'}
                </p>
              </div>
            </div>
          )}
          {result.nested && (
            <button
              className="button button-ghost button-small zip-open-nested"
              disabled={depth >= 5}
              onClick={() => open({ name: entry.name, archive: result.nested! })}
            >
              <Icon name="folder" size={15} />
              继续打开内部压缩包
              <Icon name="arrowRight" size={14} />
            </button>
          )}
          <div className="zip-digest">
            <label>
              <span>文件 SHA-256</span>
              <input
                ref={digestRef}
                readOnly
                value={result.digest}
                aria-label="文件 SHA-256"
                spellCheck={false}
              />
            </label>
            <button
              className="icon-button"
              aria-label="复制 SHA-256"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.digest)
                  setMessage('SHA-256 已复制，可以与留存指纹比对。')
                } catch {
                  digestRef.current?.focus()
                  digestRef.current?.select()
                  setMessage('摘要已选中，可以手动复制。')
                }
              }}
            >
              <Icon name="copy" size={16} />
            </button>
          </div>
          <button
            className="text-button zip-download-entry"
            onClick={() => download(result.bytes, entry.name)}
          >
            <Icon name="download" size={14} />
            下载提取的文件
          </button>
        </div>
      )}
      <details className="zip-inspector">
        <summary>检查文件头与标记</summary>
        <dl>
          <div>
            <dt>中央目录标记</dt>
            <dd>0x{entry.flags.toString(16).padStart(4, '0').toUpperCase()}</dd>
          </div>
          <div>
            <dt>本地文件头标记</dt>
            <dd>0x{entry.localFlags.toString(16).padStart(4, '0').toUpperCase()}</dd>
          </div>
          <div>
            <dt>加密位（最低位）</dt>
            <dd>{entry.flags & 1 ? '1 · 声称加密' : '0 · 未加密'}</dd>
          </div>
          <div>
            <dt>载荷起始位置</dt>
            <dd>0x{entry.dataOffset.toString(16).toUpperCase()}</dd>
          </div>
        </dl>
        <p>原始载荷前 192 字节 · 左边是偏移与十六进制，右边是可显示的 ASCII。</p>
        <pre tabIndex={0} role="region" aria-label="条目原始载荷十六进制">
          {hexDump(
            frame.archive.bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize),
            192,
          )}
        </pre>
        {entry.encrypted && (
          <div className="zip-flag-check">
            <p>
              若载荷看起来与加密标记不符，可以尝试按未加密方式读取。只有长度与 CRC-32
              一起通过，才会接受结果。
            </p>
            <button
              className="button button-ghost button-small"
              disabled={busy}
              onClick={() => void extract(true)}
            >
              按未加密读取此条目
            </button>
          </div>
        )}
      </details>
      <p className="zip-message" role="status">
        {message}
      </p>
    </section>
  )
}

function ZipBrowser({
  frame,
  depth,
  open,
}: {
  frame: Frame
  depth: number
  open: (frame: Frame) => void
}) {
  const [selected, setSelected] = useState(
    frame.archive.entries.find((entry) => !entry.directory)?.index ?? 0,
  )
  const entry = frame.archive.entries[selected]
  return (
    <div className="zip-browser">
      <div className="zip-file-list" role="group" aria-label="压缩包文件目录">
        <div className="zip-list-label">目录 · {frame.archive.entries.length} 个条目</div>
        {frame.archive.entries.map((entry) => (
          <button
            key={entry.index}
            disabled={entry.directory}
            aria-pressed={selected === entry.index}
            className={selected === entry.index ? 'selected' : ''}
            onClick={() => setSelected(entry.index)}
            aria-label={`查看条目 ${entry.name}`}
          >
            <Icon name={entry.directory ? 'folder' : entry.encrypted ? 'lock' : 'file'} size={15} />
            <span>
              {entry.name}
              <small>{entry.directory ? '目录记录' : `${entry.size} bytes`}</small>
            </span>
          </button>
        ))}
      </div>
      {entry && !entry.directory ? (
        <ZipEntryPanel key={entry.index} frame={frame} entry={entry} depth={depth} open={open} />
      ) : (
        <p className="zip-empty">这层封套没有可读取的文件。</p>
      )}
    </div>
  )
}

export function ZipDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { src: string; filename: string }
  const source = `${import.meta.env.BASE_URL}${config.src}`
  const { id } = useParams()
  const [frames, setFrames] = useState<Frame[]>([])
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const current = frames.at(-1)
  useEffect(() => {
    const controller = new AbortController()
    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('压缩物证暂时无法调取，请重试。')
        return response.arrayBuffer()
      })
      .then((buffer) => {
        setFrames([{ name: config.filename, archive: parseZip(new Uint8Array(buffer)) }])
        setError('')
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setError(error.message)
      })
    return () => controller.abort()
  }, [source, config.filename, retry])
  const hex = current?.archive.comment.match(/(?:[\da-fA-F]{2}[ \t]+){2,}[\da-fA-F]{2}/)?.[0]
  return (
    <div className="zip-device">
      <div className="zip-filebar">
        <Icon name="archive" size={26} />
        <div>
          <strong>{config.filename}</strong>
          <span>
            {frames[0]
              ? `${frames[0].archive.bytes.length.toLocaleString()} bytes · ZIP / 压缩物证`
              : '正在调取原始文件…'}
          </span>
        </div>
        <a
          href={source}
          download={config.filename}
          className="icon-button"
          aria-label={`下载原始文件 ${config.filename}`}
        >
          <Icon name="download" size={18} />
        </a>
      </div>
      {error ? (
        <div className="zip-error" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            onClick={() => {
              setError('')
              setRetry(retry + 1)
            }}
          >
            重新调取
          </button>
        </div>
      ) : !current ? (
        <p className="zip-loading" role="status">
          正在核对封套目录…
        </p>
      ) : (
        <>
          <nav className="zip-breadcrumb" aria-label="压缩包层级">
            {frames.map((frame, index) => (
              <button
                key={index}
                disabled={index === frames.length - 1}
                onClick={() => setFrames(frames.slice(0, index + 1))}
              >
                <Icon name={index === 0 ? 'archive' : 'folder'} size={13} />
                <span>{zipDownloadName(frame.name)}</span>
                {index < frames.length - 1 && <Icon name="chevronRight" size={13} />}
              </button>
            ))}
            <span>第 {frames.length} 层</span>
          </nav>
          {current.archive.prefixLength > 0 && (
            <p className="zip-prefix">
              <Icon name="eye" size={15} />
              文件前面有 {current.archive.prefixLength} 字节的封套文字，内部 ZIP 目录仍然完整。
            </p>
          )}
          {current.archive.comment && (
            <details className="zip-archive-comment">
              <summary>查看压缩包批注</summary>
              <pre>{current.archive.comment}</pre>
              {hex && (
                <Link
                  className="text-link"
                  to={`/tools?${new URLSearchParams({ method: 'hex', input: hex, ...(id ? { from: id } : {}) }).toString()}`}
                >
                  用十六进制读批注
                  <Icon name="arrowUpRight" size={14} />
                </Link>
              )}
            </details>
          )}
          <ZipBrowser
            key={`${frames.length}:${current.name}`}
            frame={current}
            depth={frames.length}
            open={(frame) => setFrames([...frames, frame])}
          />
          {frames.length > 1 && (
            <div className="zip-level-actions">
              <button className="text-button" onClick={() => setFrames(frames.slice(0, -1))}>
                <Icon name="arrowLeft" size={14} />
                返回上一层封套
              </button>
              <button
                className="text-button"
                onClick={() => download(current.archive.bytes, current.name)}
              >
                <Icon name="download" size={14} />
                下载当前封套
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
