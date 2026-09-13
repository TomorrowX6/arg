import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Artifact } from '../game/types'
import {
  decodeHttpBody,
  dnsTypeName,
  extractDnsHex,
  parsePcap,
  readHttp,
  reassembleTcp,
  tcpStreams,
} from '../game/packets'
import { hexDump } from '../game/forensics'
import { Icon } from './Icon'
import '../styles/forensics.css'
import '../styles/signals.css'

export function PacketDevice({ artifact }: { artifact: Artifact }) {
  const config = artifact.config as { src: string; filename: string }
  const source = `${import.meta.env.BASE_URL}${config.src}`
  const { id } = useParams()
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState('packets')
  const [protocol, setProtocol] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(1)
  const [suffix, setSuffix] = useState('')
  const [dnsResult, setDnsResult] = useState('')
  const [stream, setStream] = useState('')
  const [assembled, setAssembled] = useState<ReturnType<typeof reassembleTcp> | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [decoding, setDecoding] = useState(false)
  const parsed = useMemo(() => {
    if (!bytes) return { capture: null, error: '' }
    try {
      return { capture: parsePcap(bytes), error: '' }
    } catch (error) {
      return { capture: null, error: error instanceof Error ? error.message : '抓包文件读取失败。' }
    }
  }, [bytes])
  const packets = parsed.capture?.packets ?? []
  const streams = tcpStreams(packets)
  const currentStream = stream || streams[0] || ''
  const current = packets.find((packet) => packet.index === selected)
  const visible = packets.filter(
    (packet) =>
      (protocol === 'all' || packet.protocol === protocol) &&
      `${packet.source} ${packet.destination} ${packet.info}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const http = useMemo(() => {
    if (!assembled) return null
    try {
      return readHttp(assembled.bytes)
    } catch {
      return null
    }
  }, [assembled])
  const tabs = [
    { id: 'packets', label: '数据包', icon: 'activity' },
    ...(packets.some((packet) => packet.dns)
      ? [{ id: 'dns', label: 'DNS 拼接', icon: 'grid' }]
      : []),
    ...(streams.length ? [{ id: 'tcp', label: 'TCP 追踪', icon: 'activity' }] : []),
  ]
  useEffect(() => {
    const controller = new AbortController()
    fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('抓包物证暂时无法调取，请重试。')
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
  function extract() {
    setDnsResult('')
    setFeedback('')
    try {
      setDnsResult(extractDnsHex(packets, suffix))
      setFeedback('已按编号排序并合并相同重传，片段仍以十六进制显示。')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '片段提取失败。')
    }
  }
  function follow() {
    setAssembled(null)
    setBody(null)
    setFeedback('')
    try {
      setAssembled(reassembleTcp(packets, currentStream))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '数据流重组失败。')
    }
  }
  async function decode() {
    if (!assembled) return
    setDecoding(true)
    setBody(null)
    setFeedback('')
    try {
      setBody(await decodeHttpBody(assembled.bytes))
      setFeedback('已按 HTTP 头部读取正文。文字使用 UTF-8 解码。')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '正文读取失败。')
    } finally {
      setDecoding(false)
    }
  }
  function downloadStream() {
    if (!assembled) return
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(assembled.bytes)], { type: 'application/octet-stream' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = config.filename.replace(/\.pcap$/i, '-stream.bin')
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="packet-device">
      <div className="forensic-filebar">
        <div className="forensic-fileicon">
          <Icon name="activity" size={23} />
        </div>
        <div>
          <strong>{config.filename}</strong>
          <span>
            {bytes
              ? `${bytes.length.toLocaleString()} bytes · ${packets.length} 条记录`
              : '调取原始物证…'}{' '}
            · PCAP
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
      ) : !parsed.capture ? (
        <p className="signal-loading" role="status">
          正在读取网络记录…
        </p>
      ) : (
        <>
          <div className="forensic-tabs" role="group" aria-label="网络检验方式">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? 'active' : ''}
                aria-pressed={tab === item.id}
                onClick={() => {
                  setTab(item.id)
                  setFeedback('')
                }}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="packet-panel">
            {tab === 'packets' && (
              <>
                <div className="packet-filter">
                  <label>
                    <span>筛选记录</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="域名、地址或序列号"
                    />
                  </label>
                  <label>
                    <span>协议</span>
                    <select value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                      <option value="all">全部协议</option>
                      {[...new Set(packets.map((packet) => packet.protocol))].map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="packet-list-head" aria-hidden="true">
                  <span>NO.</span>
                  <span>协议</span>
                  <span>来源 → 去向 / 摘要</span>
                  <span>字节</span>
                </div>
                <div className="packet-list" role="group" aria-label="抓包记录">
                  {visible.length ? (
                    visible.map((packet) => (
                      <button
                        key={packet.index}
                        className={`packet-row ${selected === packet.index ? 'selected' : ''}`}
                        aria-pressed={selected === packet.index}
                        onClick={() => setSelected(packet.index)}
                        aria-label={`查看第 ${packet.index} 包，${packet.protocol}，${packet.info}`}
                      >
                        <span className="packet-index">
                          {String(packet.index).padStart(2, '0')}
                        </span>
                        <span
                          className={`packet-protocol protocol-${packet.protocol.toLowerCase()}`}
                        >
                          {packet.protocol}
                        </span>
                        <span className="packet-summary">
                          <span>
                            {packet.source}
                            {packet.sourcePort !== undefined ? `:${packet.sourcePort}` : ''} →{' '}
                            {packet.destination}
                            {packet.destinationPort !== undefined
                              ? `:${packet.destinationPort}`
                              : ''}
                          </span>
                          <strong>{packet.info}</strong>
                        </span>
                        <span className="packet-length">{packet.capturedLength}</span>
                      </button>
                    ))
                  ) : (
                    <p className="mini-help">没有匹配的记录。试着缩短关键词或显示全部协议。</p>
                  )}
                </div>
                <p className="packet-list-count">
                  显示 {visible.length} / {packets.length} 条。点击一条记录，查看真实字段。
                </p>
                {current && (
                  <section className="packet-detail" aria-label={`第 ${current.index} 包的详情`}>
                    <div className="packet-detail-title">
                      <Icon name="fingerprint" size={16} />
                      <strong>
                        第 {String(current.index).padStart(2, '0')} 包 · {current.protocol}
                      </strong>
                      <span>+{((current.time - packets[0].time) * 1000).toFixed(0)} ms</span>
                    </div>
                    <dl>
                      <div>
                        <dt>来源</dt>
                        <dd>
                          {current.source}
                          {current.sourcePort !== undefined ? `:${current.sourcePort}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>去向</dt>
                        <dd>
                          {current.destination}
                          {current.destinationPort !== undefined
                            ? `:${current.destinationPort}`
                            : ''}
                        </dd>
                      </div>
                      {current.tcp && (
                        <>
                          <div>
                            <dt>序列号 SEQ</dt>
                            <dd>{current.tcp.sequence}</dd>
                          </div>
                          <div>
                            <dt>载荷长度</dt>
                            <dd>{current.payload.length} bytes</dd>
                          </div>
                        </>
                      )}
                      {current.headerChecksumValid !== undefined && (
                        <div>
                          <dt>IPv4 头部校验</dt>
                          <dd>{current.headerChecksumValid ? '有效' : '不匹配'}</dd>
                        </div>
                      )}
                    </dl>
                    {current.dns && (
                      <div className="packet-dns-fields">
                        {current.dns.questions.map((question, index) => (
                          <p key={`q${index}`}>
                            <span>
                              {current.dns!.response ? '对应问题' : '查询'} ·{' '}
                              {dnsTypeName(question.type)}
                            </span>
                            <code>{question.name}</code>
                          </p>
                        ))}
                        {current.dns.answers.map((answer, index) => (
                          <p key={`a${index}`}>
                            <span>
                              应答 · {dnsTypeName(answer.type)} · TTL {answer.ttl}
                            </span>
                            <code>{answer.value}</code>
                          </p>
                        ))}
                      </div>
                    )}
                    <details className="packet-raw">
                      <summary>
                        查看载荷字节
                        <Icon name="chevronDown" size={14} />
                      </summary>
                      <pre tabIndex={0} aria-label="数据包载荷十六进制">
                        {hexDump(current.payload, 1024) || '没有应用层载荷。'}
                      </pre>
                    </details>
                  </section>
                )}
              </>
            )}
            {tab === 'dns' && (
              <div className="packet-extractor">
                <div className="signal-method-heading">
                  <Icon name="grid" size={23} />
                  <div>
                    <h4>藏在域名里的片段</h4>
                    <p>从查询名称中提取编号与内容，让零散的地址重新排成一句话。</p>
                  </div>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    extract()
                  }}
                >
                  <label>
                    片段域名后缀
                    <input
                      value={suffix}
                      onChange={(event) => {
                        setSuffix(event.target.value)
                        setDnsResult('')
                        setFeedback('')
                      }}
                      placeholder="例如 drop.wugang.invalid"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </label>
                  <button className="button button-dark button-small" disabled={!suffix.trim()}>
                    拼接编号片段
                    <Icon name="arrowRight" size={14} />
                  </button>
                </form>
                <p className="signal-help">
                  查询格式为「编号.十六进制片段.域名后缀」。编号从 1
                  开始；相同重传会合并，缺号或矛盾片段会被指出。
                </p>
                {dnsResult && (
                  <div className="packet-result">
                    <label>
                      拼接后的十六进制
                      <textarea value={dnsResult} readOnly rows={3} />
                    </label>
                    <Link
                      className="button button-ghost button-small"
                      to={`/tools?${new URLSearchParams({ method: 'hex', input: dnsResult, ...(id ? { from: id } : {}) }).toString()}`}
                    >
                      带入十六进制解码器
                      <Icon name="arrowUpRight" size={14} />
                    </Link>
                  </div>
                )}
              </div>
            )}
            {tab === 'tcp' && (
              <div className="packet-stream">
                <div className="signal-method-heading">
                  <Icon name="activity" size={23} />
                  <div>
                    <h4>把句子放回正确的位置</h4>
                    <p>到达顺序可以不同，序列号记录着每一段原本的位置。</p>
                  </div>
                </div>
                <label className="signal-select">
                  要追踪的数据流
                  <select
                    value={currentStream}
                    onChange={(event) => {
                      setStream(event.target.value)
                      setAssembled(null)
                      setBody(null)
                      setFeedback('')
                    }}
                    disabled={decoding}
                  >
                    {streams.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button button-dark button-small"
                  onClick={follow}
                  disabled={!currentStream || decoding}
                >
                  按序列号重组
                  <Icon name="arrowRight" size={14} />
                </button>
                {assembled && (
                  <div className="packet-assembled">
                    <div className="packet-stream-stats">
                      <span>{assembled.segments} 个片段</span>
                      <span>{assembled.retransmissions} 个相同重传</span>
                      <span>{assembled.bytes.length} bytes</span>
                    </div>
                    <label>
                      重组后的原文
                      <textarea
                        className="packet-stream-text"
                        readOnly
                        value={new TextDecoder().decode(assembled.bytes)}
                        rows={10}
                      />
                    </label>
                    <div className="device-controls">
                      {http && (
                        <button
                          className="button button-ghost button-small"
                          onClick={decode}
                          disabled={decoding}
                        >
                          {decoding
                            ? '正在读取…'
                            : http.headers['content-encoding'] === 'gzip'
                              ? '解压 GZIP 正文'
                              : '读取 HTTP 正文'}
                          <Icon name="archive" size={14} />
                        </button>
                      )}
                      <button className="text-button" onClick={downloadStream}>
                        <Icon name="download" size={14} />
                        下载重组字节
                      </button>
                    </div>
                    {http && (
                      <p className="signal-help">
                        {http.headers['content-encoding'] === 'gzip'
                          ? 'Content-Encoding 表明正文经过 gzip 压缩。头部后面的字节需要先解压，再读取文字。'
                          : 'HTTP 头部与正文之间有一个空行。可以单独提取正文，保留其中的原始换行。'}
                      </p>
                    )}
                    {body !== null && (
                      <label className="packet-http-body">
                        HTTP 正文
                        <textarea readOnly rows={7} value={body || '（正文为空）'} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="signal-feedback" role="status">
              {feedback}
            </p>
          </div>
        </>
      )}
      <p className="signal-provenance">
        <Icon name="file" size={13} />
        这是一份可下载的原始抓包；检验结果来自文件中的字段与载荷。
      </p>
    </div>
  )
}
