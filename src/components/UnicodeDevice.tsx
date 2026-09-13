import { useEffect, useMemo, useState } from 'react'
import type { Artifact } from '../game/types'
import { extractInvisibleText, invisibleCharacters } from '../game/unicode'
import { Icon } from './Icon'
import '../styles/forensics.css'
import '../styles/signals.css'

export function UnicodeDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { src: string; filename: string }
  const source = `${import.meta.env.BASE_URL}${config.src}`
  const [letter, setLetter] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [inspected, setInspected] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [zero, setZero] = useState(0x200b),
    [one, setOne] = useState(0x200c)
  const [result, setResult] = useState<ReturnType<typeof extractInvisibleText> | null>(null)
  const [feedback, setFeedback] = useState('')
  const hidden = useMemo(() => (letter ? invisibleCharacters(letter) : []), [letter])
  useEffect(() => {
    const controller = new AbortController()
    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('原始信件暂时无法调取，请重试。')
        return response.arrayBuffer()
      })
      .then((buffer) => {
        setLetter(new TextDecoder('utf-8', { fatal: true }).decode(buffer))
        setLoadError('')
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setLoadError(error.message)
      })
    return () => controller.abort()
  }, [source, retry])
  function extract() {
    if (!letter) return
    setResult(null)
    setFeedback('')
    try {
      setResult(extractInvisibleText(letter, zero, one))
      setFeedback('已按文件中的出现顺序提取，八位一组读取 UTF-8 字节。')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '这些字节不能组成有效文字。')
    }
  }
  return (
    <div className="unicode-device">
      <div className="forensic-filebar">
        <div className="forensic-fileicon">
          <Icon name="mail" size={23} />
        </div>
        <div>
          <strong>{config.filename}</strong>
          <span>
            {letter
              ? `${new TextEncoder().encode(letter).length} bytes · ${[...letter].length} 个字符`
              : '调取原始物证…'}{' '}
            · UTF-8
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
      {loadError ? (
        <div className="forensic-error" role="alert">
          {loadError}
          <button className="text-button" onClick={() => setRetry(retry + 1)}>
            重新调取
          </button>
        </div>
      ) : letter === null ? (
        <p className="signal-loading" role="status">
          正在展开信纸…
        </p>
      ) : (
        <>
          <div
            className={`unicode-letter ${reveal ? 'show-hidden' : ''}`}
            role="document"
            aria-label="原始信件文字"
          >
            {reveal
              ? [...letter].map((char, index) => {
                  const special = hidden.find((item) => item.value === char.codePointAt(0))
                  return special ? (
                    <mark
                      key={index}
                      title={`${special.label} U+${special.value.toString(16).toUpperCase()}`}
                    >
                      {special.value === zero ? '₀' : special.value === one ? '₁' : '·'}
                    </mark>
                  ) : (
                    char
                  )
                })
              : letter}
          </div>
          <div className="device-controls">
            <button
              className="button button-dark button-small"
              onClick={() => {
                setInspected(true)
                setFeedback(
                  `检出 ${hidden.length} 种特殊字符，共 ${hidden.reduce((sum, item) => sum + item.count, 0)} 个。`,
                )
              }}
            >
              <Icon name="search" size={14} />
              逐字符检查
            </button>
            <button
              className="text-button"
              aria-pressed={reveal}
              onClick={() => setReveal(!reveal)}
            >
              <Icon name="eye" size={14} />
              {reveal ? '恢复普通显示' : '显示隐藏字符'}
            </button>
          </div>
          {inspected && (
            <div className="unicode-inspection">
              <div className="unicode-counts" role="list" aria-label="特殊字符清单">
                {hidden.map((item) => (
                  <div key={item.value} role="listitem">
                    <code>U+{item.value.toString(16).toUpperCase().padStart(4, '0')}</code>
                    <span>{item.label}</span>
                    <strong>{item.count} 个</strong>
                  </div>
                ))}
              </div>
              <p className="signal-help">
                看不见的字符仍有明确的码位。选择哪一种代表 0、哪一种代表
                1，按出现顺序提取；可见文字保持原样。
              </p>
              <div className="unicode-mapping">
                {[
                  { label: '代表 0 的字符', value: zero, set: setZero },
                  { label: '代表 1 的字符', value: one, set: setOne },
                ].map((mapping) => (
                  <label key={mapping.label}>
                    {mapping.label}
                    <select
                      value={mapping.value}
                      onChange={(event) => {
                        mapping.set(Number(event.target.value))
                        setResult(null)
                        setFeedback('')
                      }}
                    >
                      {hidden.map((item) => (
                        <option key={item.value} value={item.value}>
                          U+{item.value.toString(16).toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className="button button-dark button-small"
                onClick={extract}
                disabled={hidden.length < 2}
              >
                提取隐藏字节
                <Icon name="arrowRight" size={14} />
              </button>
              {result && (
                <div className="unicode-result">
                  <label>
                    隐藏位串
                    <textarea readOnly value={result.bits} rows={4} />
                  </label>
                  <label>
                    隐藏文字
                    <input readOnly value={result.text} />
                  </label>
                </div>
              )}
            </div>
          )}
          <p className="signal-feedback" role="status">
            {feedback}
          </p>
        </>
      )}
      <p className="signal-provenance">
        <Icon name="file" size={13} />
        检查的是下载文件中的真实 Unicode 字符，显示开关不会改写原件。
      </p>
    </div>
  )
}
