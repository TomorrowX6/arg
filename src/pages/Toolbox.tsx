import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { archiveTools, toolById } from '../data/tools'
import { puzzleById } from '../data/archive'
import { MAX_TOOL_INPUT, runTool } from '../game/codecs'
import type { ToolMethod, ToolMode } from '../game/codecs'
import { useGame } from '../game/useGame'
import '../styles/toolbox.css'

interface ToolRecord {
  id: string
  method: ToolMethod
  mode: ToolMode
  input: string
  output: string
  key: string
  auxiliary: string
}
const groups = ['字符与编码', '古典密码', '信号与计算']

export default function Toolbox() {
  const [params] = useSearchParams()
  const requested = params.get('method') ?? 'base64'
  const method = archiveTools.some((tool) => tool.id === requested)
    ? (requested as ToolMethod)
    : 'base64'
  const sourceCase = params.get('from') ? puzzleById[params.get('from')!] : undefined
  return (
    <ToolReader
      key={params.toString()}
      initialMethod={method}
      initialInput={params.get('input') ?? ''}
      sourceId={sourceCase?.id}
    />
  )
}

function ToolReader({
  initialMethod,
  initialInput,
  sourceId,
}: {
  initialMethod: ToolMethod
  initialInput: string
  sourceId?: string
}) {
  const { dispatch } = useGame()
  const [method, setMethod] = useState(initialMethod)
  const [mode, setMode] = useState<ToolMode>('decode')
  const [input, setInput] = useState(initialInput)
  const [key, setKey] = useState(toolById[initialMethod].key?.value ?? '')
  const [auxiliary, setAuxiliary] = useState(toolById[initialMethod].auxiliary?.value ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<ToolRecord[]>([])
  const outputRef = useRef<HTMLTextAreaElement>(null)
  const tool = toolById[method]
  const clearResult = () => {
    setOutput('')
    setError('')
    setStatus('')
  }
  function choose(next: ToolMethod) {
    setMethod(next)
    setKey(toolById[next].key?.value ?? '')
    setAuxiliary(toolById[next].auxiliary?.value ?? '')
    clearResult()
  }
  function example() {
    setInput(tool.single || mode === 'decode' ? tool.example : tool.plain)
    setKey(tool.key?.value ?? '')
    setAuxiliary(tool.auxiliary?.value ?? '')
    clearResult()
    setStatus('示例已放入输入框，可以直接运行。')
  }
  async function run() {
    if (busy) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const result = await runTool(method, input, mode, key, auxiliary)
      setOutput(result)
      setStatus(`处理完成，得到 ${Array.from(result).length} 个字符。`)
      setHistory(
        [
          { id: crypto.randomUUID(), method, mode, input, output: result, key, auxiliary },
          ...history,
        ].slice(0, 12),
      )
    } catch (cause) {
      setOutput('')
      setError(cause instanceof Error ? cause.message : '暂时无法处理这段资料。')
    } finally {
      setBusy(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(output)
      setStatus('结果已复制。')
    } catch {
      outputRef.current?.focus()
      outputRef.current?.select()
      setStatus('结果已选中，可使用系统复制命令。')
    }
  }
  function saveNote() {
    const text = `方法：${tool.name}${tool.single ? '' : mode === 'decode' ? ' / 解码' : ' / 编码'}${key ? `\n参数：${key}` : ''}${auxiliary ? `\n模数：${auxiliary}` : ''}\n\n输入：\n${input}\n\n结果：\n${output}`
    if (text.length > 20000) {
      setStatus('内容超过单条笔记的长度，请复制结果后分段保存。')
      return
    }
    dispatch({
      type: 'note',
      note: {
        id: crypto.randomUUID(),
        title: `${sourceId ? puzzleById[sourceId].title : '解码工具箱'} · ${tool.name}`,
        text,
        updatedAt: new Date().toISOString(),
        ...(sourceId ? { puzzleId: sourceId } : {}),
      },
    })
    setStatus('处理过程已保存到调查手记。')
  }
  function restore(record: ToolRecord) {
    setMethod(record.method)
    setMode(record.mode)
    setInput(record.input)
    setOutput(record.output)
    setKey(record.key)
    setAuxiliary(record.auxiliary)
    setError('')
    setStatus('已回到这次处理记录。')
  }

  return (
    <div className="page toolbox-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">THE DECODING ROOM / WORKBENCH</div>
          <h1>换一种读法，线索就出现了。</h1>
          <p>把资料放上工作台，一层一层打开。所有处理都在此设备完成。</p>
        </div>
        <div className="page-count">
          <strong>{archiveTools.length}</strong>
          <span>种观察线索的方法</span>
        </div>
      </header>
      {sourceId && (
        <Link className="tool-source-link" to={`/case/${sourceId}`}>
          <Icon name="arrowLeft" size={15} />
          <span>返回档案：{puzzleById[sourceId].title}</span>
          <small>原始资料已带入</small>
        </Link>
      )}
      <div className="tool-workbench">
        <aside className="tool-picker" aria-label="选择解码工具">
          <div className="tool-picker-heading">
            <Icon name="key" size={19} />
            <strong>检验工具</strong>
          </div>
          {groups.map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {archiveTools
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={method === item.id}
                    className={method === item.id ? 'active' : ''}
                    disabled={busy}
                    onClick={() => choose(item.id)}
                  >
                    <Icon
                      name={
                        group === '字符与编码' ? 'terminal' : group === '古典密码' ? 'key' : 'radio'
                      }
                      size={15}
                    />
                    {item.name}
                    {method === item.id && <Icon name="chevronRight" size={14} />}
                  </button>
                ))}
            </section>
          ))}
        </aside>
        <div className="tool-editor">
          <label className="tool-mobile-picker">
            选择解码工具
            <select
              value={method}
              onChange={(event) => choose(event.target.value as ToolMethod)}
              disabled={busy}
            >
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {archiveTools
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="tool-editor-heading">
            <div>
              <span className="eyebrow">{tool.caption}</span>
              <h2>{tool.name}</h2>
            </div>
            <button className="button button-ghost button-small" onClick={example} disabled={busy}>
              <Icon name="sparkles" size={14} />
              放入示例
            </button>
          </div>
          <p className="tool-description">{tool.description}</p>
          <div className="tool-operation-row">
            {!tool.single && (
              <div className="tool-mode" role="group" aria-label="转换方向">
                {(['decode', 'encode'] as ToolMode[]).map((direction) => (
                  <button
                    key={direction}
                    className={mode === direction ? 'active' : ''}
                    aria-pressed={mode === direction}
                    onClick={() => {
                      setMode(direction)
                      clearResult()
                    }}
                    disabled={busy}
                  >
                    {direction === 'decode' ? '解码 · 还原文字' : '编码 · 转换文字'}
                  </button>
                ))}
              </div>
            )}
            {tool.key && (
              <label className="tool-parameter">
                {tool.key.label}
                <input
                  value={key}
                  onChange={(event) => {
                    setKey(event.target.value)
                    clearResult()
                  }}
                  maxLength={256}
                  autoComplete="off"
                  spellCheck={false}
                  readOnly={busy}
                />
              </label>
            )}
            {tool.auxiliary && (
              <label className="tool-parameter">
                {tool.auxiliary.label}
                <input
                  value={auxiliary}
                  onChange={(event) => {
                    setAuxiliary(event.target.value)
                    clearResult()
                  }}
                  maxLength={128}
                  autoComplete="off"
                  spellCheck={false}
                  readOnly={busy}
                />
              </label>
            )}
          </div>
          <div className="tool-text-heading">
            <label htmlFor="tool-input">{method === 'modpow' ? '底数' : '输入资料'}</label>
            <span>
              {input.length.toLocaleString()} / {MAX_TOOL_INPUT.toLocaleString()}
              <button
                className="text-button"
                onClick={() => {
                  setInput('')
                  clearResult()
                }}
                disabled={busy || !input}
              >
                清空
              </button>
            </span>
          </div>
          <textarea
            id="tool-input"
            className="tool-textarea"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              clearResult()
            }}
            spellCheck={false}
            maxLength={MAX_TOOL_INPUT}
            rows={6}
            placeholder="粘贴一段编码、字节或文字，也可以先试试上方的示例…"
            readOnly={busy}
          />
          <div className="tool-run-row">
            <button
              className="button button-dark"
              disabled={busy || (!input.length && method !== 'sha256')}
              onClick={run}
            >
              {busy
                ? '正在处理…'
                : method === 'sha256'
                  ? '计算摘要'
                  : method === 'modpow'
                    ? '计算余数'
                    : tool.single
                      ? '开始转换'
                      : mode === 'decode'
                        ? '执行解码'
                        : '执行编码'}
              <Icon name="arrowDown" size={16} />
            </button>
            <span>每次只运行一种方法，可逐层继续</span>
          </div>
          {error && (
            <p className="tool-error-message" role="alert">
              <Icon name="help" size={16} />
              {error}
            </p>
          )}
          <div className="tool-text-heading">
            <label htmlFor="tool-output">处理结果</label>
            <span>{output.length ? `${output.length.toLocaleString()} 个字符` : '等待处理'}</span>
          </div>
          <textarea
            ref={outputRef}
            id="tool-output"
            className="tool-textarea tool-output"
            value={output}
            readOnly
            rows={5}
            placeholder="新的读法，会在这里留下结果。"
            spellCheck={false}
          />
          <div className="tool-output-actions">
            <button
              className="button button-coral button-small"
              disabled={!output || output.length > MAX_TOOL_INPUT || busy}
              onClick={() => {
                setInput(output)
                clearResult()
                setStatus('结果已放回输入框。选择下一种工具，继续处理。')
                document.getElementById('tool-input')?.focus()
              }}
            >
              <Icon name="arrowUpRight" size={15} />
              使用结果继续
            </button>
            <button className="button button-ghost button-small" onClick={copy} disabled={!output}>
              <Icon name="copy" size={15} />
              复制结果
            </button>
            <button
              className="button button-ghost button-small"
              onClick={saveNote}
              disabled={!output}
            >
              <Icon name="book" size={15} />
              收进手记
            </button>
          </div>
          <p className="tool-status" role="status">
            {status}
          </p>
          {output.length > MAX_TOOL_INPUT && (
            <p className="mini-help">结果较长，可以复制或分段继续处理。</p>
          )}
          <section className="tool-history">
            <div className="tool-history-heading">
              <span className="eyebrow">本次工作台记录 / 最近 12 次</span>
              <span>{history.length ? `${history.length} 次处理` : '尚未开始'}</span>
            </div>
            {history.length ? (
              <ol>
                {history.map((record, index) => (
                  <li key={record.id}>
                    <button
                      onClick={() => restore(record)}
                      disabled={busy}
                      aria-label={`回看${toolById[record.method].name}处理记录 ${history.length - index}`}
                    >
                      <span className="tool-history-index">
                        {String(history.length - index).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{toolById[record.method].name}</strong>
                        <p>{record.output.slice(0, 90) || '（空结果）'}</p>
                      </div>
                      <Icon name="arrowUpRight" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tool-history-empty">
                每次处理都会留在这里。结果可以继续送入下一种工具，也可以保存到手记后再离开。
              </p>
            )}
          </section>
        </div>
      </div>
      <div className="toolbox-note">
        <Icon name="lightbulb" size={22} />
        <p>
          <strong>工具负责计算，好奇心负责选择。</strong>
          <span>
            没有头绪时，先观察字符范围和分组方式。档案中的纸条、批注与日期，往往已经告诉你该用哪一种读法。
          </span>
        </p>
        <Link to="/archives?chapter=side">
          找一份档案试试
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>
    </div>
  )
}
