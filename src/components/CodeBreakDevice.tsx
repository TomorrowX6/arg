import { useMemo, useState } from 'react'
import type { Artifact } from '../game/types'
import { possibleSymbolCodes, scoreSymbols } from '../game/fairground'
import type { CodeGuess } from '../game/fairground'
import { Icon } from './Icon'

interface CodeSymbol {
  label: string
  glyph: string
}
interface CodeBreakConfig {
  symbols: CodeSymbol[]
  secret: number[]
  maxGuesses: number
  message: string
}

function CodeGlyph({ symbol }: { symbol: CodeSymbol }) {
  const names: Record<string, string> = {
    '○': 'circle',
    '△': 'triangle',
    '□': 'square',
    '☆': 'star',
    '☾': 'moon',
    '≈': 'waves',
  }
  return names[symbol.glyph] ? (
    <Icon name={names[symbol.glyph]} size={28} strokeWidth={1.4} />
  ) : (
    <>{symbol.glyph}</>
  )
}

export function CodeBreakDevice({ artifact }: { artifact: Artifact }) {
  const { symbols, secret, maxGuesses = 8, message } = artifact.config as unknown as CodeBreakConfig
  const [guess, setGuess] = useState<number[]>(secret.map(() => -1))
  const [active, setActive] = useState(0)
  const [history, setHistory] = useState<CodeGuess[]>([])
  const [feedback, setFeedback] = useState('')
  const [assist, setAssist] = useState(false)
  const solved = history.at(-1)?.exact === secret.length
  const locked = solved || history.length >= maxGuesses
  const candidateCount = useMemo(
    () => (assist ? possibleSymbolCodes(symbols.length, secret.length, history).length : null),
    [assist, history, secret.length, symbols.length],
  )
  function choose(symbol: number) {
    if (locked) return
    setGuess(guess.map((value, index) => (index === active ? symbol : value)))
    setActive((active + 1) % secret.length)
    setFeedback('')
  }
  function submit() {
    if (locked || guess.includes(-1)) return
    if (history.some((record) => record.symbols.join(',') === guess.join(','))) {
      setFeedback('这个组合已经记录过了。参考它的反馈，换一个新组合试试。')
      return
    }
    const score = scoreSymbols(secret, guess)
    setHistory([...history, { symbols: [...guess], ...score }])
    setFeedback(
      `第 ${history.length + 1} 次：${score.exact} 个位置正确，${score.misplaced} 个符号正确但位置不同。`,
    )
  }
  function reset() {
    setGuess(secret.map(() => -1))
    setActive(0)
    setHistory([])
    setFeedback('锁盘已复位，原来的正确组合保持不变。')
  }
  return (
    <div className="codebreak-device">
      <div className="mini-statusbar">
        <span>
          <Icon name="key" size={15} />
          每次猜测，都会留下证据
        </span>
        <strong>
          {history.length} / {maxGuesses} 次
        </strong>
      </div>
      <div className="codebreak-panel">
        <div className="codebreak-panel-heading">
          <span>THE TICKET OFFICE</span>
          <Icon name={solved ? 'checks' : 'lock'} size={18} />
        </div>
        <div className="codebreak-slots" role="group" aria-label="待验证的符号组合">
          {guess.map((symbol, index) => (
            <button
              key={index}
              className={`${active === index ? 'active' : ''} symbol-color-${symbol}`}
              aria-pressed={active === index}
              aria-label={`第 ${index + 1} 位，${symbol < 0 ? '未选择' : symbols[symbol].label}`}
              onClick={() => setActive(index)}
              disabled={locked}
            >
              <small>0{index + 1}</small>
              <span>{symbol < 0 ? '+' : <CodeGlyph symbol={symbols[symbol]} />}</span>
              <em>{symbol < 0 ? '待选择' : symbols[symbol].label}</em>
            </button>
          ))}
        </div>
        <p className="codebreak-caption">先选一格，再选符号；填入后自动移到下一格。</p>
      </div>
      <div className="codebreak-palette" role="group" aria-label="可用符号">
        {symbols.map((symbol, index) => (
          <button
            key={symbol.label}
            className={`symbol-color-${index}`}
            onClick={() => choose(index)}
            disabled={locked}
            aria-label={`填入${symbol.label}`}
          >
            <span aria-hidden="true">
              <CodeGlyph symbol={symbol} />
            </span>
            <small>{symbol.label}</small>
          </button>
        ))}
      </div>
      <div className="device-controls">
        <button
          className="button button-dark button-small"
          disabled={locked || guess.includes(-1)}
          onClick={submit}
        >
          验证组合
          <Icon name="arrowRight" size={14} />
        </button>
        <button className="text-button" onClick={reset}>
          <Icon name="reset" size={14} />
          重新推理
        </button>
      </div>
      <div className="codebreak-log">
        <div className="codebreak-log-heading">
          <strong>本次推理记录</strong>
          <span>位置正确 / 仅符号正确</span>
        </div>
        {history.length ? (
          <ol>
            {history.map((record, index) => (
              <li key={index}>
                <span className="codebreak-attempt">{index + 1}</span>
                <span
                  className="codebreak-history-symbols"
                  role="img"
                  aria-label={record.symbols.map((symbol) => symbols[symbol].label).join('、')}
                >
                  {record.symbols.map((symbol, i) => (
                    <span key={i} className={`symbol-color-${symbol}`} aria-hidden="true">
                      <CodeGlyph symbol={symbols[symbol]} />
                    </span>
                  ))}
                </span>
                <span className="codebreak-score">
                  <b>
                    <span className="sr-only">位置正确：</span>
                    {record.exact}
                    <i aria-hidden="true">命中</i>
                  </b>
                  <b>
                    <span className="sr-only">符号正确但位置不同：</span>
                    {record.misplaced}
                    <i aria-hidden="true">误位</i>
                  </b>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mini-help">每条记录会保留。四个位置全命中，票口就会打开。</p>
        )}
      </div>
      <label className="codebreak-assist">
        <input
          type="checkbox"
          checked={assist}
          onChange={(event) => setAssist(event.target.checked)}
        />
        辅助推理：显示剩余候选数量{assist && <strong>{candidateCount} 组</strong>}
      </label>
      <p className="mini-feedback" role="status">
        {feedback}
      </p>
      <p className={`device-message ${solved ? 'revealed' : ''}`} role="status">
        {solved
          ? message
          : locked
            ? '本轮机会用完了。可以重新推理，或展开档案提示；正确组合不会改变。'
            : '符号允许重复。命中与误位不会重复计数，每枚符号最多匹配一次。'}
      </p>
    </div>
  )
}
